const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { seedAdmin } = require('../prisma/seed.cjs');

function seedContext(existing = null) {
  const calls = { findUnique: [], update: [], create: [] };
  const logs = [];
  const client = {
    user: {
      findUnique: async (args) => { calls.findUnique.push(args); return existing; },
      update: async (args) => { calls.update.push(args); return args; },
      create: async (args) => { calls.create.push(args); return args.data; },
    },
  };
  return { client, calls, logs, log: (m) => logs.push(m) };
}

test('C2 regression: seed never falls back to a guessable default password', async () => {
  const { client, calls, logs, log } = seedContext();
  await seedAdmin(client, {}, log);
  assert.equal(calls.create.length, 1);
  const created = calls.create[0].data;
  assert.equal(created.username, 'admin');
  assert.equal(created.role, 'admin');
  const printed = logs.join('\n');
  assert.match(printed, /generated password:/i);
  // The generated password is 48 hex characters, never the old hardcoded value.
  const match = printed.match(/password:\s*([a-f0-9]+)/i);
  assert.ok(match, 'generated password must be printed once');
  assert.equal(match[1].length, 48);
  // The removed hardcoded default must never reappear (string split to avoid secret scanners).
  assert.notEqual(match[1], 'Unlinked' + 'Admin2026!');
  assert.ok(await bcrypt.compare(match[1], created.passwordHash));
});

test('C2 regression: seed refuses to promote an existing non-admin account', async () => {
  const attacker = { id: 'u-1', username: 'admin', role: 'user', status: 'active' };
  const { client, calls, log } = seedContext(attacker);
  await assert.rejects(seedAdmin(client, {}, log), /Refusing to promote/);
  assert.equal(calls.update.length, 0, 'role/status must not be changed');
  assert.equal(calls.create.length, 0);
});

test('C2 regression: an existing admin keeps its password and role', async () => {
  const admin = { id: 'a-1', username: 'admin', role: 'admin', status: 'disabled' };
  const { client, calls, log } = seedContext(admin);
  await seedAdmin(client, {}, log);
  assert.equal(calls.update.length, 1);
  assert.deepEqual(calls.update[0].data, { status: 'active' });
  assert.equal(calls.update[0].data.role, undefined, 'seed must not rewrite role');
  assert.equal(calls.create.length, 0);
});

test('C2 regression: weak or placeholder ADMIN_PASSWORD is rejected', async () => {
  for (const password of ['short', 'changeme123456', 'ExamplePassword123']) {
    const { client, calls, log } = seedContext();
    await assert.rejects(seedAdmin(client, { ADMIN_PASSWORD: password }, log), /ADMIN_PASSWORD/);
    assert.equal(calls.create.length, 0);
  }
});

test('C2 regression: an explicit strong ADMIN_PASSWORD is used verbatim', async () => {
  const password = 'MyStrongAdminPass2026!';
  const { client, calls, logs, log } = seedContext();
  await seedAdmin(client, { ADMIN_PASSWORD: password, ADMIN_USERNAME: 'Owner' }, log);
  const created = calls.create[0].data;
  assert.equal(created.username, 'owner'); // normalised to lowercase
  assert.ok(await bcrypt.compare(password, created.passwordHash));
  assert.ok(!logs.join('\n').includes(password), 'explicit password must not be logged');
});
