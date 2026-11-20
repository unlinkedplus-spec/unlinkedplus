const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const base = process.env.E2E_BASE_URL;
if (!base || process.env.E2E_ALLOW_TEST_ACCOUNTS !== 'true') {
  throw new Error('Set E2E_BASE_URL to a disposable deployment and E2E_ALLOW_TEST_ACCOUNTS=true. Test accounts are retained for inspection.');
}
const origin = process.env.E2E_ORIGIN || new URL(base).origin;
const suffix = randomBytes(6).toString('hex');
const password = randomBytes(24).toString('hex');
function client() {
  let cookie = '';
  return {
    cookie: () => cookie,
    async call(path, { method = 'GET', body, expected = 200, customCookie, customOrigin } = {}) {
      const response = await fetch(`${base}/api${path}`, { method,
        headers: { Origin: customOrigin ?? origin, Cookie: customCookie ?? cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.getSetCookie().length) cookie = response.headers.getSetCookie()[0].split(';')[0];
      const contentType = response.headers.get('content-type') || '';
      const value = contentType.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(value)}`);
      return value;
    },
  };
}

test('real persistence, ownership, sessions, XP, comments, store and PNG queue', { timeout: 90000 }, async () => {
  const owner = client(), other = client(), guest = client();
  const health = await guest.call('/health');
  assert.equal(health.redis, 'ok'); assert.equal(health.database, 'ok');
  await guest.call('/auth/me', { expected: 401 });
  const registered = await owner.call('/auth/register', { method: 'POST', expected: 201, body: { username: `qa_owner_${suffix}`, password } });
  assert.ok(registered.user.id); assert.equal(registered.accessToken, undefined);
  await other.call('/auth/register', { method: 'POST', expected: 201, body: { username: `qa_other_${suffix}`, password } });
  await guest.call('/posts', { method: 'POST', expected: 401, body: { category: 'Ditolak HRD', content: 'Test terisolasi kepemilikan post.' } });
  await owner.call('/posts', { method: 'POST', expected: 403, customOrigin: 'https://untrusted.invalid', body: { category: 'Ditolak HRD', content: 'Test terisolasi kepemilikan post.' } });
  await owner.call('/users/me', { method: 'PATCH', expected: 400, body: { role: 'admin' } });
  await owner.call('/posts', { method: 'POST', expected: 400, body: { category: 'Ditolak HRD', content: 'Humbled and honored to announce a role.' } });
  const post = await owner.call('/posts', { method: 'POST', expected: 201, body: { category: 'Ditolak HRD', content: `QA ${suffix}: cerita untuk pengujian database sementara.` } });
  assert.equal((await owner.call('/auth/me')).profile.mentalXp, 10);
  await other.call(`/posts/${post.id}`, { method: 'DELETE', expected: 403 });
  const reaction = await other.call(`/posts/${post.id}/reactions`, { method: 'POST', expected: 201, body: { type: 'sama' } });
  assert.equal(reaction.added, true); assert.equal(reaction.counts.sama, 1);
  assert.equal((await owner.call('/auth/me')).profile.mentalXp, 13);
  await other.call(`/posts/${post.id}/reactions`, { method: 'POST', expected: 201, body: { type: 'sama' } });
  assert.equal((await owner.call('/auth/me')).profile.mentalXp, 10);
  const comment = await other.call(`/posts/${post.id}/comments`, { method: 'POST', expected: 201, body: { content: 'Komentar pengujian terisolasi.' } });
  assert.ok(comment.id);
  const feed = await guest.call('/posts');
  assert.ok(!JSON.stringify(feed).includes('passwordHash')); assert.ok(!JSON.stringify(feed).includes('emailHash'));
  assert.ok((await guest.call(`/posts/${post.id}/comments`)).data.some(row => row.id === comment.id));
  await owner.call('/admin/reports', { expected: 403 });
  const catalog = await guest.call('/avatar/items');
  const glasses = catalog.find(item => item.slug === 'kacamata'); assert.ok(glasses);
  await owner.call('/users/me', { method: 'PATCH', expected: 403, body: { avatarConfig: { character: 'panda', accessories: ['kacamata'] } } });
  const mode = await guest.call('/store/config');
  if (mode.mode === 'simulation') {
    const order = await owner.call('/store/purchase', { method: 'POST', expected: 201, body: { itemId: glasses.id } });
    await other.call(`/store/purchase/confirm/${order.id}`, { method: 'POST', expected: 404 });
    const confirmed = await owner.call(`/store/purchase/confirm/${order.id}`, { method: 'POST', expected: 200 });
    assert.equal(confirmed.paymentStatus, 'simulated'); assert.equal(confirmed.realPayment, false);
    await owner.call('/users/me', { method: 'PATCH', body: { avatarConfig: { character: 'panda', accessories: ['kacamata'] } } });
    assert.equal((await owner.call('/auth/me')).profile.mentalXp, 10);
  } else {
    await owner.call('/store/purchase', { method: 'POST', expected: 403, body: { itemId: glasses.id } });
  }
  let certificate = await owner.call('/certificates', { method: 'POST', expected: 201, body: { postId: post.id } });
  await other.call(`/certificates/${certificate.id}`, { expected: 404 });
  for (let attempt = 0; attempt < 20 && certificate.status === 'pending'; attempt++) {
    await delay(1000);
    certificate = await owner.call(`/certificates/${certificate.id}`);
  }
  assert.equal(certificate.status, 'ready');
  const png = await owner.call(`/certificates/${certificate.id}/download`);
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  await owner.call(`/posts/${post.id}`, { method: 'DELETE' });
  await guest.call(`/posts/${post.id}`, { expected: 404 });
  await owner.call(`/certificates/${certificate.id}/download`, { expected: 404 });
  assert.equal((await owner.call('/auth/me')).profile.mentalXp, 0);
  const previousCookie = owner.cookie();
  await owner.call('/auth/logout', { method: 'POST' });
  await owner.call('/auth/me', { expected: 401, customCookie: previousCookie });
  await owner.call('/auth/login', { method: 'POST', body: { username: `qa_owner_${suffix}`, password } });
  assert.equal((await owner.call('/auth/me')).username, `qa_owner_${suffix}`);
  console.log(`Created test accounts qa_owner_${suffix}, qa_other_${suffix}; use only a disposable deployment.`);
});

test('anonymous identity is not re-identifiable across confession, feed, comments and moderation', { timeout: 90000 }, async () => {
  const author = client(), reader = client();
  const anonPassword = randomBytes(24).toString('hex');
  await author.call('/auth/register', { method: 'POST', expected: 201, body: { username: `qa_anon_${suffix}`, password: anonPassword } });
  await reader.call('/auth/register', { method: 'POST', expected: 201, body: { username: `qa_reader_${suffix}`, password: anonPassword } });

  const confession = await author.call('/confessions', {
    method: 'POST', expected: 201,
    body: { content: `QA ${suffix}: pengujian identitas anonim lintas permukaan.`, isAnonymous: true },
  });
  assert.ok(confession.id);

  async function assertAnonymous(view) {
    assert.equal(view.user, null, 'anonymous author must be hidden on every public surface');
    assert.ok(!('userId' in view), 'internal author id must never be returned publicly');
  }

  const confessions = await reader.call('/confessions');
  await assertAnonymous(confessions.data.find((row) => row.id === confession.id));

  // Feed responses are cached briefly; wait past the cache TTL before checking.
  await delay(6000);
  const feed = await reader.call('/posts');
  await assertAnonymous(feed.data.find((row) => row.id === confession.id));
  await assertAnonymous(await reader.call(`/posts/${confession.id}`));

  const comment = await reader.call(`/posts/${confession.id}/comments`, {
    method: 'POST', expected: 201, body: { content: 'Komentar tampilan anonim.' },
  });
  assert.ok(!('userId' in comment), 'comment responses must not carry internal author ids');
  const comments = await reader.call(`/posts/${confession.id}/comments`);
  await assertAnonymousButNamed(comments.data.find((row) => row.id === comment.id));

  function assertAnonymousButNamed(row) {
    assert.ok(row.user?.username, 'pseudonymous commenter name remains visible');
    assert.ok(!('userId' in row), 'internal commenter id must not be exposed');
    assert.ok(!('id' in row.user), 'internal user id must not be nested in a public author');
  }
  for (const row of feed.data) {
    if (row.user) assert.ok(!('id' in row.user), 'feed authors must be pseudonymous, never raw ids');
  }

  console.log(`Anonymous identity regression OK for ${confession.id}; no real identity exposed.`);
});
