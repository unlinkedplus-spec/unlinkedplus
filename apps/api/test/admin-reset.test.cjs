const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');

const { AuthService, RESET_TOKEN_SECONDS } = require('../dist/auth/auth.service');
const { ForgotPasswordDto } = require('../dist/auth/dto/forgot-password.dto');
const { ResetPasswordDto } = require('../dist/auth/dto/reset-password.dto');
const { AdminDashboardService } = require('../dist/admin/admin-dashboard.service');
const { ValidationPipe } = require('@nestjs/common');

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (value, metatype) => pipe.transform(value, { type: 'body', metatype });
const status = (expected) => (error) => error.getStatus?.() === expected;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function authContext({ user = { id: 'user-1', status: 'active' }, mails = [] } = {}) {
  const created = [];
  const updated = [];
  const revoked = [];
  const claimed = [];
  const used = [];
  let claimCounts = [1, 1]; // conditional claim, then revoke-all
  const prisma = {
    user: {
      findUnique: async () => user,
      update: async (args) => { updated.push(args); return args; },
    },
    passwordResetToken: {
      updateMany: async (args) => {
        claimed.push(args);
        return { count: claimCounts.length ? claimCounts.shift() : 1 };
      },
      create: async (args) => { created.push(args.data); return args.data; },
      findUnique: async () => ctx.record,
      update: async (args) => { used.push(args); return args; },
    },
    // Support both array-style (other services) and callback-style (atomic reset) transactions.
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
  };
  const redis = { client: { smembers: async () => revoked, multi: () => ({
    del: () => ({ exec: async () => [] }),
  }) } };
  const config = { get: (key) => key === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined };
  const mail = { sendPasswordReset: async (input) => { mails.push(input); return true; } };
  const jwt = { signAsync: async () => 'token' };
  const ctx = {
    prisma, redis, config, mail, mails, jwt, created, updated, used, revoked, claimed, record: null,
    setClaimCounts: (counts) => { claimCounts = counts; },
  };
  const service = new AuthService(prisma, jwt, redis, config, mail);
  return { service, ctx };
}

test('forgot and reset DTOs enforce email and bcrypt-safe password rules', async () => {
  const email = await validate({ email: '  Human@Example.COM ' }, ForgotPasswordDto);
  assert.equal(email.email, 'human@example.com');
  await assert.rejects(validate({ email: 'nope' }, ForgotPasswordDto), status(400));
  const reset = await validate({ token: 'a'.repeat(32), password: 'a-long-password' }, ResetPasswordDto);
  assert.equal(reset.password, 'a-long-password');
  await assert.rejects(validate({ token: 'short', password: 'a-long-password' }, ResetPasswordDto), status(400));
  await assert.rejects(validate({ token: 'a'.repeat(32), password: 'short' }, ResetPasswordDto), status(400));
});

test('forgot password hides account existence and stores only a token hash', async () => {
  const { service, ctx } = authContext();
  const unknown = authContext({ user: null });
  assert.deepEqual(await unknown.service.forgotPassword({ email: 'nobody@example.com' }), { success: true, emailSent: false });
  assert.equal(unknown.ctx.created.length, 0);

  const result = await service.forgotPassword({ email: 'human@example.com' });
  assert.deepEqual(result, { success: true, emailSent: true });
  assert.equal(ctx.created.length, 1);
  assert.equal(ctx.created[0].kind, 'email');
  assert.notEqual(ctx.created[0].tokenHash, 'raw-token');
  assert.equal(ctx.created[0].tokenHash.length, 64);
  const remaining = ctx.created[0].expiresAt.getTime() - Date.now();
  assert.ok(remaining > RESET_TOKEN_SECONDS * 1000 - 5000 && remaining <= RESET_TOKEN_SECONDS * 1000);
  assert.match(ctx.mails[0].resetUrl ?? '', /reset=[a-f0-9]{64}/);
});

test('reset password rejects invalid tokens and revokes sessions after a valid reset', async () => {
  const { service, ctx } = authContext();
  await assert.rejects(service.resetPassword({ token: 'a'.repeat(32), password: 'a-long-password' }), status(400));

  const token = 'b'.repeat(64);
  ctx.record = {
    id: 'reset-1', userId: 'user-1', tokenHash: hashToken(token), kind: 'email',
    expiresAt: new Date(Date.now() + 60000), usedAt: null,
    user: { id: 'user-1', status: 'active' },
  };
  assert.deepEqual(await service.resetPassword({ token, password: 'a-new-password' }), { success: true });
  // C3: the token is claimed with a conditional updateMany inside the transaction,
  // and every other active token for the user is revoked in the same transaction.
  assert.equal(ctx.claimed.length, 2);
  assert.equal(ctx.claimed[0].where.id, 'reset-1');
  assert.equal(ctx.claimed[0].where.usedAt, null);
  assert.ok(ctx.claimed[0].where.expiresAt.gt instanceof Date);
  assert.deepEqual(ctx.claimed[1].where, { userId: 'user-1', usedAt: null });
  assert.equal(ctx.updated.length, 1);
  assert.ok(await bcrypt.compare('a-new-password', ctx.updated[0].data.passwordHash));
  assert.equal(ctx.record.kind, 'email');
});

test('C3 regression: a concurrent second use of the same token is rejected', async () => {
  const { service, ctx } = authContext();
  const token = 'c'.repeat(64);
  ctx.record = {
    id: 'reset-race', userId: 'user-1', tokenHash: hashToken(token), kind: 'email',
    expiresAt: new Date(Date.now() + 60000), usedAt: null,
    user: { id: 'user-1', status: 'active' },
  };
  // Simulate another request having already flipped usedAt in the same instant.
  ctx.setClaimCounts([0]);
  await assert.rejects(service.resetPassword({ token, password: 'a-new-password' }), status(400));
  assert.equal(ctx.updated.length, 0, 'password must not change when the claim is lost');
  assert.equal(ctx.claimed.length, 1, 'revoke-all must not run when the claim is lost');
});

test('C3 regression: resetting via email token revokes the long-lived recovery code', async () => {
  const { service, ctx } = authContext();
  const token = 'd'.repeat(64);
  ctx.record = {
    id: 'reset-email', userId: 'user-1', tokenHash: hashToken(token), kind: 'email',
    expiresAt: new Date(Date.now() + 60000), usedAt: null,
    user: { id: 'user-1', status: 'active' },
  };
  await service.resetPassword({ token, password: 'a-new-password' });
  // The second updateMany covers ALL of the user's remaining tokens, regardless
  // of kind — a 10-year recovery code included — so it cannot be reused later.
  assert.deepEqual(ctx.claimed[1].where, { userId: 'user-1', usedAt: null });
  assert.equal(ctx.claimed[1].data.usedAt instanceof Date, true);
});

test('admin overview aggregates stats and refuses to disable the acting admin', async () => {
  const zero = { count: async () => 0, aggregate: async () => ({ _sum: { amount: 0 } }), findMany: async () => [] };
  const prisma = {
    $transaction: async (ops) => Promise.all(ops),
    user: { ...zero, count: async () => 4, findMany: async () => [] },
    post: { ...zero, count: async () => 3 },
    comment: zero,
    report: { ...zero, count: async () => 2 },
    transaction: zero,
    poll: zero,
    certificate: zero,
  };
  const service = new AdminDashboardService(prisma);
  const overview = await service.overview();
  assert.equal(overview.stats.users, 4);
  assert.equal(overview.stats.posts, 3);
  assert.equal(overview.stats.reports, 2);
  assert.equal(overview.activity.length, 7);

  await assert.rejects(service.setUserStatus('admin-1', 'disabled', 'admin-1'), status(409));
  prisma.user.findUnique = async () => ({ id: 'user-1' });
  prisma.user.update = async (args) => args;
  const changed = await service.setUserStatus('user-1', 'disabled', 'admin-1');
  assert.equal(changed.data.status, 'disabled');
});
