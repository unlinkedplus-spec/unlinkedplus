const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Logger } = require('@nestjs/common');
const { MailService } = require('../dist/mail/mail.service');
const { AuthService } = require('../dist/auth/auth.service');

const root = path.join(__dirname, '..');
const webRoot = [
  path.join(__dirname, '..', '..', '..'), // source repo layout
  path.join(__dirname, '..'),            // synced api_build layout
].find((p) => fs.existsSync(path.join(p, 'js', 'app.js')));
if (!webRoot) throw new Error('static web root not found');
const MAIL = {
  to: 'human@example.com',
  resetUrl: 'http://localhost:3000/app?reset=SUPERSECRET',
  expiresInMinutes: 15,
};

function mail(env) {
  return new MailService({ get: (key) => env[key] });
}

async function withCapturedLogs(fn) {
  const warnings = [];
  const originalWarn = Logger.prototype.warn;
  Logger.prototype.warn = function (message) { warnings.push(String(message)); };
  try {
    return await fn(warnings);
  } finally {
    Logger.prototype.warn = originalWarn;
  }
}

async function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('H3 regression: disabled and console mail drivers never claim delivery', async () => {
  await withFetch(async () => { throw new Error('fetch must not be called'); }, async () => {
    await withCapturedLogs(async (warnings) => {
      assert.equal(await mail({ MAIL_DRIVER: 'disabled' }).sendPasswordReset(MAIL), false);
      assert.equal(await mail({ MAIL_DRIVER: 'console' }).sendPasswordReset(MAIL), false);
      assert.ok(!warnings.join('\n').includes('SUPERSECRET'), 'console diagnostics must not print the reset token');
    });
  });
});

test('H3 regression: webhook success reports delivery, failure raises an error', async () => {
  const bodies = [];
  const ok = await withFetch(async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return { ok: true, status: 200 };
  }, () => mail({
    MAIL_DRIVER: 'webhook',
    MAIL_WEBHOOK_URL: 'https://mail.example.test/send',
  }).sendPasswordReset(MAIL));
  assert.equal(ok, true);
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].to, MAIL.to);

  await assert.rejects(
    withFetch(async () => ({ ok: false, status: 503 }), () => mail({
      MAIL_DRIVER: 'webhook',
      MAIL_WEBHOOK_URL: 'https://mail.example.test/send',
    }).sendPasswordReset(MAIL)),
    (error) => error.getStatus?.() === 503,
  );
});

test('H3 regression: forgotPassword mirrors the real delivery result', async () => {
  const prisma = {
    user: { findUnique: async () => ({ id: 'user-1', status: 'active' }) },
    passwordResetToken: { updateMany: async () => ({ count: 1 }), create: async (args) => args.data },
    $transaction: async (ops) => Promise.all(ops),
  };
  const config = { get: (key) => key === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined };
  const jwt = { signAsync: async () => 'token' };
  const redis = { client: {} };

  const notDelivered = new AuthService(
    prisma, jwt, redis, config, mail({ MAIL_DRIVER: 'disabled' }),
  );
  const result = await notDelivered.forgotPassword({ email: MAIL.to });
  assert.equal(result.emailSent, false, 'disabled driver must not be reported as sent');

  const delivered = new AuthService(prisma, jwt, redis, config, {
    sendPasswordReset: async () => true,
  });
  assert.equal((await delivered.forgotPassword({ email: MAIL.to })).emailSent, true);
});

test('H3 regression: static demo copy does not claim fake publication or real payment', () => {
  const app = fs.readFileSync(path.join(webRoot, 'js', 'app.js'), 'utf8');
  const shop = fs.readFileSync(path.join(webRoot, 'js', 'shop.js'), 'utf8');
  const features = fs.readFileSync(path.join(webRoot, 'js', 'features.js'), 'utf8');
  const html = fs.readFileSync(path.join(webRoot, 'app.html'), 'utf8');

  assert.ok(!app.includes('Spill berhasil dipublikasikan'));
  assert.ok(!app.includes('Cerita berhasil dimuat ulang'));
  assert.ok(!app.includes('Berhasil login!'));
  assert.ok(!shop.includes('Pembelian berhasil!'));
  assert.ok(shop.includes('Tidak ada pembayaran nyata'));
  assert.ok(!features.includes('Spill terkirim ke Beranda'));
  assert.ok(!features.includes('unlinked+ Plus aktif. Iklan di feed hilang'));
  assert.ok(html.includes('SIMULASI'));
  assert.ok(html.includes('Simulasikan Pembayaran'));
  assert.ok(!html.includes('Konfirmasi Bayar'));
});

test('SEC-06: admin metrics separate simulated transactions from real income', () => {
  const apiSrc = path.join(__dirname, '..', 'src');
  const service = fs.readFileSync(path.join(apiSrc, 'admin', 'admin-dashboard.service.ts'), 'utf8');
  assert.match(service, /simulatedTransactions/);
  assert.match(service, /simulatedRevenue/);
  assert.match(service, /paymentStatus: 'simulated'/);
  assert.match(service, /paymentStatus: 'paid'/);
  const webPage = path.join(__dirname, '..', '..', 'web', 'src', 'app', 'admin', 'dashboard', 'page.tsx');
  if (fs.existsSync(webPage)) {
    const ui = fs.readFileSync(webPage, 'utf8');
    assert.match(ui, /Transaksi simulasi/);
    assert.match(ui, /bukan pendapatan nyata/);
  }
});
