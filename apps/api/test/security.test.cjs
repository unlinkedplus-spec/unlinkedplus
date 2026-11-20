const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ValidationPipe } = require('@nestjs/common');
const { StoreService } = require('../dist/store/store.service');
const { RegisterDto } = require('../dist/auth/dto/register.dto');
const { UpdateProfileDto } = require('../dist/users/dto/update-profile.dto');
const { UsersService } = require('../dist/users/users.service');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { AuthController } = require('../dist/auth/auth.controller');
const { RateLimitGuard } = require('../dist/common/guards/rate-limit.guard');
const { validateEnvironment } = require('../dist/common/environment');
const { calculateLevel, getLevelProgress } = require('../dist/common/helpers/xp-level.helper');
const { renderCertificateSvg } = require('../dist/certificates/certificate-renderer');
const { Resvg } = require('@resvg/resvg-js');
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (value, metatype) => pipe.transform(value, { type: 'body', metatype });
const status = expected => error => error.getStatus?.() === expected;
const config = { get: key => key === 'COOKIE_SECURE' ? 'true' : undefined, getOrThrow: () => 'a'.repeat(64) };

test('registration accepts pseudonyms and rejects identity/role injection', async () => {
  const result = await validate({ username: '  MANUSIA_42  ', password: 'a-long-password' }, RegisterDto);
  assert.equal(result.username, 'manusia_42');
  for (const input of [
    { password: 'short' }, { password: 'x'.repeat(73) }, { password: '漢'.repeat(25) },
    { password: 'a-long-password', role: 'admin' },
    { password: 'a-long-password', email: 'not-an-email' },
  ]) await assert.rejects(validate(input, RegisterDto), status(400));
  const withEmail = await validate({ username: 'manusia_77', password: 'a-long-password', email: '  Human@Example.com ' }, RegisterDto);
  assert.equal(withEmail.email, 'human@example.com');
});

test('avatar accepts only preset fields and rejects null, duplicate and untrusted SVG', async () => {
  await validate({ avatarConfig: { character: 'panda', accessories: ['kopi'] } }, UpdateProfileDto);
  for (const value of [null, {}, { character: 'panda', accessories: ['kopi', 'kopi'] },
    { character: 'panda', accessories: [], svg: '<script>bad()</script>' },
    { character: '../x', accessories: [] },
  ]) await assert.rejects(validate({ avatarConfig: value }, UpdateProfileDto), status(400));
});

test('premium equipment is rejected by server without owned inventory', async () => {
  let saved = false;
  const tx = { avatarItem: { findMany: async () => [{ id: randomUUID(), slug: 'kacamata', isPremium: true, price: 10000 }] },
    userInventory: { count: async () => 0 }, profile: { upsert: async () => { saved = true; } } };
  const users = new UsersService({ $transaction: fn => fn(tx) });
  await assert.rejects(users.updateMe(randomUUID(), { avatarConfig: { character: 'panda', accessories: ['kacamata'] } }), status(403));
  assert.equal(saved, false);
});

test('self profile update retains current database role without exposing secret fields', async () => {
  const id = randomUUID();
  let selection;
  const tx = {
    profile: { upsert: async () => ({}) },
    user: { findUniqueOrThrow: async ({ select }) => { selection = select; return { id, role: 'admin' }; } },
  };
  const users = new UsersService({ $transaction: fn => fn(tx) });
  assert.equal((await users.updateMe(id, { bio: 'Masih bertahan' })).role, 'admin');
  assert.equal(selection.role, true);
  assert.equal(selection.passwordHash, undefined);
  assert.equal(selection.emailHash, undefined);
});

test('store defaults to disabled and performs no writes without simulation mode', async () => {
  const store = new StoreService({ $transaction: () => assert.fail('must not access database') }, { get: () => undefined });
  assert.deepEqual(store.getConfig(), { mode: 'disabled' });
  await assert.rejects(store.purchase(randomUUID(), randomUUID()), status(403));
  await assert.rejects(store.confirm(randomUUID(), randomUUID()), status(403));
});

test('store sets price on server and reuses pending simulation orders', async () => {
  const userId = randomUUID(), itemId = randomUUID();
  let created = 0, pending = null;
  const tx = {
    $queryRaw: async () => [{ id: userId }],
    avatarItem: { findUnique: async () => ({ id: itemId, price: 10000 }) },
    userInventory: { findUnique: async () => null },
    transaction: {
      findFirst: async () => pending,
      create: async ({ data }) => { created++; pending = { id: randomUUID(), ...data }; return pending; },
    },
  };
  const store = new StoreService({ $transaction: fn => fn(tx) }, { get: () => 'simulation' });
  const first = await store.purchase(userId, itemId), second = await store.purchase(userId, itemId);
  assert.equal(first.id, second.id);
  assert.equal(created, 1);
  assert.equal(first.amount, 10000);
  assert.equal(first.paymentStatus, 'pending');
  assert.equal(first.mode, 'simulation');
  assert.equal(first.realPayment, false);
  assert.equal(first.qrisPayload, null);
  tx.userInventory.findUnique = async () => ({ itemId });
  await assert.rejects(store.purchase(userId, itemId), status(409));
});

test('simulation confirmation is owner-only and idempotent without claiming paid status', async () => {
  const userId = randomUUID(), itemId = randomUUID(), id = randomUUID();
  let order = { id, userId, itemId, amount: 10000, paymentStatus: 'pending' }, unlocks = 0;
  const tx = {
    $queryRaw: async (_sql, ...values) => [{ id: values[0] }],
    userInventory: { upsert: async () => { unlocks++; } },
    transaction: {
      findUniqueOrThrow: async () => order,
      update: async ({ data }) => { order = { ...order, ...data }; return order; },
    },
  };
  const store = new StoreService({ $transaction: fn => fn(tx) }, { get: () => 'simulation' });
  for (let n = 0; n < 2; n++) {
    const result = await store.confirm(userId, id);
    assert.equal(result.paymentStatus, 'simulated');
    assert.equal(result.realPayment, false);
    assert.equal(result.qrisPayload, null);
  }
  assert.equal(unlocks, 1);
  tx.$queryRaw = async (sql, ...values) => {
    if (sql.join('').includes('FROM users')) return [{ id: values[0] }];
    assert.equal(values[1], userId);
    return [];
  };
  await assert.rejects(store.confirm(userId, randomUUID()), status(404));
  assert.equal(unlocks, 1);
});

test('JWT uses persisted sessions and rejects revoked or disabled identity', async () => {
  const id = randomUUID(), sid = randomUUID();
  const prisma = { user: { findUnique: async () => ({ id, username: 'human', role: 'user', status: 'active' }) } };
  let session = id;
  const strategy = new JwtStrategy(config, prisma, { client: { get: async () => session } });
  assert.equal((await strategy.validate({ sub: id, sid })).userId, id);
  session = null;
  await assert.rejects(strategy.validate({ sub: id, sid }), status(401));
  session = id;
  prisma.user.findUnique = async () => ({ id, status: 'disabled' });
  await assert.rejects(strategy.validate({ sub: id, sid }), status(401));
});

test('auth response exposes no JWT and sets strict HttpOnly cookie', async () => {
  let cookie;
  const controller = new AuthController({ login: async () => ({ user: { username: 'human' }, token: 'test-token' }) }, config);
  const response = await controller.login({}, { protocol: 'http' }, { cookie: (...args) => { cookie = args; } });
  assert.deepEqual(response, { user: { username: 'human' } });
  assert.equal(cookie[2].httpOnly, true);
  assert.equal(cookie[2].sameSite, 'strict');
  assert.equal(cookie[2].secure, true);
  assert.equal(cookie[2].path, '/', 'cookie must be sent to the two-state root');
});

test('SEC-02: cookie becomes Secure over HTTPS even when COOKIE_SECURE=false', async () => {
  let cookie;
  const insecureConfig = { get: key => key === 'COOKIE_SECURE' ? 'false' : undefined };
  const controller = new AuthController(
    { login: async () => ({ user: { username: 'human' }, token: 'test-token' }) },
    insecureConfig,
  );
  await controller.login({}, { protocol: 'https' }, { cookie: (...args) => { cookie = args; } });
  assert.equal(cookie[2].secure, true, 'HTTPS request must set Secure flag');

  let lanCookie;
  await controller.login({}, { protocol: 'http' }, { cookie: (...args) => { lanCookie = args; } });
  assert.equal(lanCookie[2].secure, false, 'plain HTTP LAN stays usable; TLS termination is required for production');
});

test('rate limit uses Redis counter, returns429 and fails closed on Redis outage', async () => {
  let count = 0;
  const metrics = { countRateLimit() {} };
  const guard = new RateLimitGuard({ client: { eval: async () => {
    count += 1;
    return count <= 10 ? [1, 10 - count, 60000] : [0, 0, 1000];
  } } }, metrics);
  const context = { switchToHttp: () => ({ getRequest: () => ({ path: '/auth/login', method: 'POST', ip: '127.0.0.1' }), getResponse: () => ({ setHeader() {} }) }) };
  for (let n = 0; n < 10; n++) assert.equal(await guard.canActivate(context), true);
  await assert.rejects(guard.canActivate(context), status(429));
  const unavailable = new RateLimitGuard({ client: { eval: async () => { throw new Error('offline'); } } }, metrics);
  await assert.rejects(unavailable.canActivate(context), status(503));
});

test('SEC-05: rate limit reads THROTTLE_TTL/LIMIT from config with safe defaults', async () => {
  const guard = new RateLimitGuard(
    { client: { eval: async (_script, _keys, _key, ttl, limit) => [1, Number(limit) - 1, 0] } },
    { countRateLimit() {} },
    { get: key => key === 'THROTTLE_LIMIT' ? '200' : key === 'THROTTLE_TTL' ? '120000' : undefined },
  );
  let seen;
  guard.redis.client.eval = async (_s, _n, _key, ttl, limit) => { seen = { ttl, limit }; return [1, 9, 0]; };
  const ctx = { switchToHttp: () => ({ getRequest: () => ({ path: '/posts', method: 'GET', ip: '1.2.3.4' }), getResponse: () => ({ setHeader() {} }) }) };
  assert.equal(await guard.canActivate(ctx), true);
  assert.equal(seen.ttl, '120000');
  assert.equal(seen.limit, '200');

  const fallback = new RateLimitGuard(
    { client: { eval: async (_s, _n, _key, ttl, limit) => { seen = { ttl, limit }; return [1, 9, 0]; } } },
    { countRateLimit() {} },
  );
  await fallback.canActivate(ctx);
  assert.equal(seen.ttl, '60000');
  assert.equal(seen.limit, '100');
});

test('SEC-03: CSP uses a per-request nonce instead of unsafe-inline', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const webRoot = [
    path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src', 'middleware.ts'),
    path.join(__dirname, '..', '..', 'web_build', 'src', 'middleware.ts'),
  ].find((p) => fs.existsSync(p));
  if (!webRoot) throw new Error('web middleware not found');
  const middleware = fs.readFileSync(webRoot, 'utf8');
  assert.match(middleware, /randomUUID\(\)/);
  assert.match(middleware, /'nonce-\$\{nonce\}'/);
  assert.match(middleware, /'strict-dynamic'/);
  assert.match(middleware, /headers\.set\('x-nonce', nonce\)/);
  assert.ok(!middleware.includes("script-src 'self' 'unsafe-inline'"));

  const nginxPath = [
    path.join(__dirname, '..', '..', '..', 'docker', 'host-nginx.conf'),
    path.join(__dirname, '..', 'docker', 'host-nginx.conf'),
  ].find((p) => fs.existsSync(p));
  if (!nginxPath) throw new Error('nginx config not found');
  const nginx = fs.readFileSync(nginxPath, 'utf8');
  assert.ok(!nginx.includes("script-src 'self' 'unsafe-inline'"),
    'nginx must not emit a competing static CSP');
  assert.match(nginx, /SEC-03: CSP with a per-request nonce/);
});

test('environment rejects placeholder JWT and insecure HTTPS cookie settings', () => {
  const base = { DATABASE_URL: 'postgresql://x:x@localhost/x', REDIS_URL: 'redis://localhost', JWT_SECRET: 'a'.repeat(64), FRONTEND_URL: 'https://example.invalid', STORAGE_PATH: '/data', COOKIE_SECURE: 'true' };
  assert.equal(validateEnvironment(base), base);
  assert.throws(() => validateEnvironment({ ...base, COOKIE_SECURE: 'false' }));
  assert.throws(() => validateEnvironment({ ...base, JWT_SECRET: 'changeme' }));
});

test('Mental Armor boundaries are deterministic and max level progress stops at100', () => {
  assert.deepEqual([0, 49, 50, 149, 150, 299, 300, 499, 500].map(calculateLevel), [1,1,2,2,3,3,4,4,5]);
  assert.equal(getLevelProgress(999).progress, 100);
});

test('certificate renderer escapes user XML and rasterizes an actual PNG', async () => {
  const svg = renderCertificateSvg({ id: randomUUID(), createdAt: new Date(), category: 'Ditolak HRD', content: '<script>alert(1)</script> & masih bertahan' });
  assert.ok(!svg.includes('<script>'));
  const bytes = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.ok(bytes.length > 1000);
});
