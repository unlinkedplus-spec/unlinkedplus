const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { ConfessionsService } = require('../dist/confessions/confessions.service');
const { ScheduledPublisher } = require('../dist/worker/scheduled-publisher.processor');

function confessionContext() {
  const created = [];
  const xpUpdates = [];
  const tx = {
    post: { create: async (args) => { created.push(args.data); return { id: 'post-1', ...args.data }; } },
    profile: {
      createMany: async () => ({ count: 1 }),
      update: async (args) => { xpUpdates.push(args); return args; },
    },
    $queryRaw: async () => [{ mentalXp: 0 }],
  };
  const prisma = { $transaction: async (fn) => fn(tx) };
  return { service: new ConfessionsService(prisma), created, xpUpdates };
}

function publisherContext({ due = [], updateCount } = {}) {
  const updated = [];
  const xpUpdates = [];
  const tx = {
    $queryRaw: async (strings) => {
      const sql = String(strings && strings.raw ? strings.raw.join('?') : strings);
      if (sql.includes('FROM "posts"')) return due;
      if (sql.includes('FROM "profiles"')) return [{ mentalXp: 0 }];
      throw new Error('Unexpected query: ' + sql);
    },
    post: {
      updateMany: async (args) => {
        updated.push(args);
        return { count: updateCount === undefined ? args.where.id.in.length : updateCount };
      },
    },
    profile: {
      createMany: async () => ({ count: 1 }),
      update: async (args) => { xpUpdates.push(args); return args; },
    },
  };
  const prisma = { $transaction: async (fn) => fn(tx) };
  const config = { get: () => '60000' };
  return { publisher: new ScheduledPublisher(prisma, config), updated, xpUpdates };
}

test('H2 regression: migration accepts scheduled and is data-preserving', () => {
  const sql = fs.readFileSync(path.join(root, 'prisma', 'migrations',
    '20261121130000_allow_scheduled_posts', 'migration.sql'), 'utf8');
  assert.match(sql, /DROP CONSTRAINT IF EXISTS "posts_status_check"/);
  assert.match(sql, /ADD CONSTRAINT "posts_status_check"/);
  for (const status of ['active', 'scheduled', 'deleted', 'hidden']) {
    assert.ok(sql.includes(`'${status}'`), `migration must accept ${status}`);
  }
  const normalised = sql.replace(/--.*$/gm, '').toUpperCase();
  for (const forbidden of ['DROP TABLE', 'DELETE FROM', 'TRUNCATE', 'DROP COLUMN']) {
    assert.ok(!normalised.includes(forbidden), `migration must not contain ${forbidden}`);
  }
});

test('H2 regression: immediate confession gets XP, scheduled confession does not', async () => {
  const immediate = confessionContext();
  await immediate.service.create('user-1', { content: 'Cerita langsung yang valid.' });
  assert.equal(immediate.created[0].status, 'active');
  assert.equal(immediate.xpUpdates.length, 1);
  assert.equal(immediate.xpUpdates[0].data.mentalXp, 10);

  const future = new Date(Date.now() + 3_600_000).toISOString();
  const scheduled = confessionContext();
  await scheduled.service.create('user-2', { content: 'Cerita dijadwalkan nanti.', scheduledAt: future });
  assert.equal(scheduled.created[0].status, 'scheduled');
  assert.equal(scheduled.created[0].scheduledAt.toISOString(), future);
  assert.equal(scheduled.xpUpdates.length, 0, 'XP must wait until publication');
});

test('H2 regression: invalid scheduledAt is rejected instead of becoming Invalid Date', async () => {
  const ctx = confessionContext();
  await assert.rejects(
    ctx.service.create('user-1', { content: 'Cerita dengan tanggal invalid.', scheduledAt: 'besok' }),
    (error) => error.getStatus?.() === 400,
  );
  assert.equal(ctx.created.length, 0);
});

test('H2 regression: publisher publishes due posts and grants XP exactly once', async () => {
  const due = [
    { id: '11111111-1111-4111-8111-111111111111', userId: 'user-1' },
    { id: '22222222-2222-4222-8222-222222222222', userId: 'user-2' },
  ];
  const ctx = publisherContext({ due });
  const published = await ctx.publisher.publishDue(new Date('2026-11-20T12:00:00Z'));
  assert.equal(published, 2);
  assert.equal(ctx.updated.length, 1);
  assert.deepEqual(ctx.updated[0].data, { status: 'active' });
  assert.deepEqual(ctx.updated[0].where.id.in, due.map((row) => row.id));
  assert.equal(ctx.updated[0].where.status, 'scheduled');
  assert.equal(ctx.xpUpdates.length, 2);
  assert.deepEqual(ctx.xpUpdates.map((u) => u.data.mentalXp), [10, 10]);
});

test('H2 regression: publisher is a no-op with no due rows and rolls back on count mismatch', async () => {
  const empty = publisherContext({ due: [] });
  assert.equal(await empty.publisher.publishDue(), 0);
  assert.equal(empty.updated.length, 0);
  assert.equal(empty.xpUpdates.length, 0);

  const mismatch = publisherContext({
    due: [{ id: '33333333-3333-4333-8333-333333333333', userId: 'user-3' }],
    updateCount: 0,
  });
  await assert.rejects(mismatch.publisher.publishDue(), /state changed/);
  assert.equal(mismatch.xpUpdates.length, 0, 'no XP without a successful publication');
});

test('H2 regression: worker loads the publisher and uses row locking', () => {
  const module = fs.readFileSync(path.join(root, 'src/worker/worker.module.ts'), 'utf8');
  assert.match(module, /ScheduledPublisher/);
  const publisher = fs.readFileSync(path.join(root, 'src/worker/scheduled-publisher.processor.ts'), 'utf8');
  assert.match(publisher, /FOR UPDATE SKIP LOCKED/);
  assert.match(publisher, /changeXp/);
});
