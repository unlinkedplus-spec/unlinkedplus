const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
require('reflect-metadata');

// Compile in memory by default; SOCIAL_TEST_USE_DIST=1 tests a main build instead.
const useDist = process.env.SOCIAL_TEST_USE_DIST === '1';
const sourceRoot = path.resolve(__dirname, '../src');
if (!useDist) {
  const ts = require('typescript');
  require.extensions['.ts'] = (module, filename) => {
    assert.ok(filename.startsWith(sourceRoot + path.sep));
    const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true, emitDecoratorMetadata: true,
      },
      reportDiagnostics: true,
    });
    assert.equal((result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
    module._compile(result.outputText, filename);
  };
}
const root = path.resolve(__dirname, useDist ? '../dist' : '../src');
const load = (name) => require(path.join(root, name + (useDist ? '.js' : '.ts')));
const { PostsService } = load('posts/posts.service');
const { ReactionsService } = load('reactions/reactions.service');
const { CommentsService } = load('comments/comments.service');
const { ReportsService } = load('reports/reports.service');
const { AdminGuard } = load('reports/admin.guard');
const { CreatePostDto, POST_CATEGORIES } = load('posts/dto/create-post.dto');
const { CreateCommentDto } = load('comments/dto/create-comment.dto');
const { ToggleReactionDto } = load('reactions/dto/toggle-reaction.dto');
const { CreateReportDto } = load('reports/dto/create-report.dto');
const { ResolveReportDto } = load('reports/dto/resolve-report.dto');
const { BANNED_PHRASES, containsFlexPhrase } = load('posts/anti-flex.const');
const { validateInput, pagination, PaginationDto } = load('posts/social.validation');
const { POST_SELECT, COMMENT_SELECT } = load('posts/social.persistence');
const { PUBLIC_USER_SELECT } = load('users/user.select');
const { calculateLevel } = load('common/helpers/xp-level.helper');
const { ValidationPipe } = require('@nestjs/common');

const OWNER = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const EVE = '33333333-3333-4333-8333-333333333333';
const UNKNOWN = '99999999-9999-4999-8999-999999999999';
const postInput = { category: 'Ditolak HRD', content: 'Lamaran sudah dikirim, kabarnya belum juga datang.' };
const hasStatus = (status) => (error) => error.getStatus?.() === status;

function fixture(initialXp = 0) {
  const state = Object.fromEntries(['user', 'profile', 'post', 'reaction', 'comment', 'report'].map((name) => [name, new Map()]));
  const calls = [];
  const queues = new Map();
  let fail;
  let sequence = 0;
  let transactionId = 0;
  for (const [id, username] of [[OWNER, 'owner'], [BOB, 'bob'], [EVE, 'eve']]) {
    state.user.set(id, { id, username, role: 'user', status: 'active', createdAt: new Date(0), passwordHash: 'SECRET', emailHash: 'PRIVATE' });
    state.profile.set(id, { userId: id, mentalXp: id === OWNER ? initialXp : 0, mentalLevel: calculateLevel(id === OWNER ? initialXp : 0), avatarConfig: null, bio: null, isAnonymous: true });
  }
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === 'postId_userId_reactionType') return matches(row, value);
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[key]);
      if ('not' in value) return row[key] !== value.not;
      throw new Error('Unsupported mock filter: ' + key);
    }
    return row[key] === value;
  });
  const project = (model, row, select) => {
    if (!row) return null;
    if (!select) return { ...row };
    return Object.fromEntries(Object.entries(select).filter(([, v]) => v).map(([key, value]) => {
      if (value === true) return [key, row[key]];
      if (key === 'user') return [key, project('user', state.user.get(row.userId), value.select)];
      if (key === 'profile') return [key, project('profile', state.profile.get(row.id), value.select)];
      if (key === '_count') return [key, Object.fromEntries(Object.entries(value.select).map(([relation, filter]) => {
        const table = relation === 'comments' ? 'comment' : 'reaction';
        return [relation, [...state[table].values()].filter((item) => item.postId === row.id && matches(item, filter === true ? {} : filter.where)).length];
      }))];
      throw new Error('Unsupported mock projection: ' + model + '.' + key);
    }));
  };
  const prisma = {
    async $transaction(callback, options) {
      const txId = ++transactionId;
      calls.push({ txId, op: '$transaction', options });
      const undo = [];
      const releases = [];
      const held = new Set();
      const acquire = async (key) => {
        if (held.has(key)) return;
        const previous = queues.get(key) || Promise.resolve();
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        queues.set(key, previous.then(() => gate));
        await previous;
        held.add(key);
        releases.push(release);
      };
      const set = (model, key, value) => {
        const previous = state[model].get(key);
        undo.push(() => previous ? state[model].set(key, previous) : state[model].delete(key));
        state[model].set(key, value);
      };
      const record = (op, args) => {
        calls.push({ txId, op, args });
        if (fail === op) throw new Error('injected ' + op);
      };
      const tx = {
        async $queryRaw(strings, ...values) {
          assert.ok(Array.isArray(strings.raw), 'Locks must use tagged, parameterized SQL');
          assert.equal(values.length, 1);
          const sql = strings.join('?');
          assert.match(sql, /FOR UPDATE/);
          const table = sql.match(/FROM "(posts|profiles|reports)"/)[1];
          const model = { posts: 'post', profiles: 'profile', reports: 'report' }[table];
          record('$queryRaw', { table, id: values[0] });
          await acquire(`${table}:${values[0]}`);
          const row = state[model].get(values[0]);
          return row ? [{ ...row }] : [];
        },
      };
      for (const model of Object.keys(state)) {
        const filtered = (args = {}) => [...state[model].values()].filter((row) => matches(row, args.where));
        tx[model] = {
          async findUnique(args) { record(model + '.findUnique', args); return project(model, filtered(args)[0], args.select); },
          async findUniqueOrThrow(args) {
            record(model + '.findUniqueOrThrow', args);
            const result = project(model, filtered(args)[0], args.select);
            if (!result) throw new Error('Missing ' + model);
            return result;
          },
          async findFirst(args) { record(model + '.findFirst', args); return project(model, filtered(args)[0], args.select); },
          async findMany(args = {}) {
            record(model + '.findMany', args);
            let rows = filtered(args);
            for (const order of [...(Array.isArray(args.orderBy) ? args.orderBy : [])].reverse()) {
              const [key, direction] = Object.entries(order)[0];
              rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (direction === 'desc' ? -1 : 1));
            }
            rows = rows.slice(args.skip || 0, args.take === undefined ? undefined : (args.skip || 0) + args.take);
            return rows.map((row) => project(model, row, args.select));
          },
          async count(args) { record(model + '.count', args); return filtered(args).length; },
          async create(args) {
            record(model + '.create', args);
            if (model === 'reaction' && filtered({ where: args.data }).length) throw new Error('Unique violation');
            const row = { id: randomUUID(), createdAt: new Date(++sequence), status: model === 'report' ? 'pending' : 'active', ...args.data };
            set(model, row.id, row);
            return project(model, row, args.select);
          },
          async createMany(args) {
            record(model + '.createMany', args);
            assert.equal(model, 'profile');
            for (const row of args.data) {
              await acquire(`profiles:${row.userId}`);
              if (!state.profile.has(row.userId)) set(model, row.userId, { ...row, mentalXp: 0, mentalLevel: 1 });
            }
          },
          async update(args) {
            record(model + '.update', args);
            const row = filtered(args)[0];
            if (!row) throw new Error('Missing ' + model);
            const updated = { ...row, ...args.data };
            set(model, model === 'profile' ? row.userId : row.id, updated);
            return project(model, updated, args.select);
          },
          async updateMany(args) {
            record(model + '.updateMany', args);
            const rows = filtered(args);
            rows.forEach((row) => set(model, row.id, { ...row, ...args.data }));
            return { count: rows.length };
          },
          async delete(args) {
            record(model + '.delete', args);
            const row = filtered(args)[0];
            if (!row) throw new Error('Missing ' + model);
            undo.push(() => state[model].set(row.id, row));
            state[model].delete(row.id);
            return { ...row };
          },
          async groupBy(args) {
            record(model + '.groupBy', args);
            const groups = new Map();
            for (const row of filtered(args)) {
              const key = JSON.stringify(args.by.map((field) => row[field]));
              if (!groups.has(key)) groups.set(key, { ...Object.fromEntries(args.by.map((field) => [field, row[field]])), _count: { _all: 0 } });
              groups.get(key)._count._all += 1;
            }
            return [...groups.values()];
          },
        };
      }
      try { return await callback(tx); }
      catch (error) { undo.reverse().forEach((revert) => revert()); throw error; }
      finally { releases.reverse().forEach((release) => release()); }
    },
  };
  return {
    state, calls, fail: (op) => { fail = op; },
    posts: new PostsService(prisma, {
      getVersion: async () => 1,
      getOrSet: async (_key, _ttl, factory) => factory(),
      bumpVersion: async () => {},
    }), reactions: new ReactionsService(prisma),
    comments: new CommentsService(prisma), reports: new ReportsService(prisma),
    xp: () => state.profile.get(OWNER).mentalXp,
  };
}

function assertNoSecrets(value) {
  const json = JSON.stringify(value);
  for (const forbidden of ['passwordHash', 'emailHash', 'SECRET', 'PRIVATE']) assert.ok(!json.includes(forbidden));
}

test('post validation trims, enforces exact categories and 10..280 characters', () => {
  for (const category of POST_CATEGORIES) {
    assert.equal(validateInput(CreatePostDto, { category, content: '  ' + 'a'.repeat(10) + '  ' }).content, 'a'.repeat(10));
  }
  assert.equal(validateInput(CreatePostDto, { ...postInput, content: 'x'.repeat(280) }).content.length, 280);
  for (const input of [
    { ...postInput, category: 'ditolak hrd' }, { ...postInput, category: 'other' },
    { ...postInput, content: ' '.repeat(12) }, { ...postInput, content: 'x'.repeat(9) },
    { ...postInput, content: 'x'.repeat(281) }, { ...postInput, content: 123 },
    { ...postInput, userId: BOB }, { ...postInput, status: 'active' },
    { ...postInput, role: 'admin' }, null, [],
  ]) assert.throws(() => validateInput(CreatePostDto, input), hasStatus(400));
});

test('anti-flex checks actual normalized phrases, not unrelated substrings', () => {
  for (const phrase of BANNED_PHRASES) {
    assert.equal(containsFlexPhrase('Cerita: ' + phrase.toUpperCase().replaceAll(' ', '\n - ')), true);
    assert.throws(() => validateInput(CreatePostDto, { ...postInput, content: phrase + ' hari ini.' }), hasStatus(400));
  }
  assert.equal(containsFlexPhrase('Saya bangga\u200b mengumumkan hari ini'), true);
  assert.equal(containsFlexPhrase('Bangga masih berani mencoba meski ditolak terus.'), false);
  assert.equal(containsFlexPhrase('Gajian gagal, kursi naik jabatannya patah.'), false);
});

test('comment/report/reaction validation rejects blanks, wrong types and escalation fields', () => {
  assert.equal(validateInput(CreateCommentDto, { content: ' x ' }).content, 'x');
  assert.equal(validateInput(CreateCommentDto, { content: 'a'.repeat(500) }).content.length, 500);
  for (const content of ['', '   ', 'x'.repeat(501), 5]) {
    assert.throws(() => validateInput(CreateCommentDto, { content }), hasStatus(400));
  }
  for (const type of ['pukpuk', 'ngakak', 'sama']) assert.equal(validateInput(ToggleReactionDto, { type }).type, type);
  for (const type of ['like', 'toString', '__proto__', 'Pukpuk', null]) {
    assert.throws(() => validateInput(ToggleReactionDto, { type }), hasStatus(400));
  }
  const report = { targetType: 'post', targetId: UNKNOWN, reason: ' alasan ' };
  assert.equal(validateInput(CreateReportDto, report).reason, 'alasan');
  for (const input of [
    { ...report, targetId: 'not-uuid' }, { ...report, targetType: 'profile' },
    { ...report, reason: ' ' }, { ...report, reason: 'x'.repeat(501) },
    { ...report, reporterId: OWNER }, { ...report, status: 'resolved' },
  ]) assert.throws(() => validateInput(CreateReportDto, input), hasStatus(400));
  for (const action of ['dismiss', 'hide']) assert.equal(validateInput(ResolveReportDto, { action }).action, action);
  assert.throws(() => validateInput(ResolveReportDto, { action: 'promote', role: 'admin' }), hasStatus(400));
});

test('pagination and the real Nest validation pipe enforce bounded integers', async () => {
  assert.deepEqual(pagination(), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(pagination(3, 50), { page: 3, limit: 50, skip: 100 });
  for (const [page, limit] of [[0, 20], [-1, 20], [1.5, 20], [Infinity, 20], [NaN, 20], [1_000_001, 20], [1, 0], [1, 51], [1, 1.5]]) {
    assert.throws(() => pagination(page, limit), hasStatus(400));
  }
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const query = await pipe.transform({ page: '2', limit: '5' }, { type: 'query', metatype: PaginationDto });
  assert.equal(query.page, 2);
  assert.equal(query.limit, 5);
  for (const page of ['', 'no', '1.5', '-3', ['2'], 'Infinity']) {
    await assert.rejects(pipe.transform({ page }, { type: 'query', metatype: PaginationDto }), hasStatus(400));
  }
  const dto = await pipe.transform({ ...postInput, content: '  ' + postInput.content + '  ' }, { type: 'body', metatype: CreatePostDto });
  assert.equal(dto.content, postInput.content);
});

test('creation awards exactly ten XP, updates level and returns public author data', async () => {
  const f = fixture(40);
  const post = await f.posts.create(OWNER, { ...postInput, content: '  ' + postInput.content + ' ' });
  assert.equal(post.content, postInput.content);
  assert.equal(f.xp(), 50);
  assert.equal(post.user.profile.mentalLevel, 2);
  assert.equal(post.user.profile.mentalXp, 50);
  assert.deepEqual(post.reactionCounts, { pukpuk: 0, ngakak: 0, sama: 0 });
  assertNoSecrets(post);
  assert.equal(POST_SELECT.user.select, PUBLIC_USER_SELECT);
  assert.equal(COMMENT_SELECT.user.select, PUBLIC_USER_SELECT);
  await assert.rejects(f.posts.create(OWNER, { ...postInput, category: 'other' }), hasStatus(400));
  assert.equal(f.xp(), 50);
});

test('post feed/detail select public users, aggregate counts and exclude inactive content', async () => {
  const f = fixture();
  const first = await f.posts.create(OWNER, postInput);
  const second = await f.posts.create(OWNER, postInput);
  await f.posts.softDelete(second.id, OWNER);
  await f.reactions.toggle(first.id, BOB, { type: 'pukpuk' });
  await f.reactions.toggle(first.id, EVE, { type: 'pukpuk' });
  const c = await f.comments.create(first.id, BOB, { content: 'semangat' });
  await f.comments.softDelete(c.id, BOB);
  await f.comments.create(first.id, EVE, { content: 'sama' });
  const start = f.calls.length;
  const feed = await f.posts.findAll(1, 1);
  assert.equal(feed.total, 1);
  assert.equal(feed.totalPages, 1);
  assert.equal(feed.page, 1);
  assert.deepEqual(feed.data[0].reactionCounts, { pukpuk: 2, ngakak: 0, sama: 0 });
  assert.deepEqual(feed.data[0]._count, { reactions: 2, comments: 1 });
  assert.equal('reactions' in feed.data[0], false);
  assert.equal(f.calls.slice(start).filter((call) => call.op === 'reaction.groupBy').length, 1);
  assert.equal(f.calls.slice(start).some((call) => call.op === 'reaction.findMany'), false);
  assert.equal((await f.posts.findOne(first.id)).id, first.id);
  assertNoSecrets(feed);
  await assert.rejects(f.posts.findOne(second.id), hasStatus(404));
  await assert.rejects(f.posts.findOne(UNKNOWN), hasStatus(404));
  const empty = await f.posts.findAll(2, 1);
  assert.deepEqual(empty.data, []);
  assert.equal(empty.total, 1);
  assert.deepEqual(await fixture().posts.findAll(), { data: [], total: 0, page: 1, totalPages: 0 });
});

test('reaction toggles return exact counts/choices, award each weight and ignore self-XP', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  const result = await f.reactions.toggle(p.id, BOB, { type: 'pukpuk' });
  assert.deepEqual(result, { added: true, counts: { pukpuk: 1, ngakak: 0, sama: 0 }, userReactions: { pukpuk: true, ngakak: false, sama: false } });
  assert.equal(f.xp(), 12);
  await f.reactions.toggle(p.id, BOB, { type: 'ngakak' });
  assert.equal(f.xp(), 13);
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  assert.equal(f.xp(), 16);
  await f.reactions.toggle(p.id, OWNER, { type: 'sama' });
  assert.equal(f.xp(), 16);
  assert.deepEqual(await f.reactions.getUserReactions(p.id, OWNER), { pukpuk: false, ngakak: false, sama: true });
  assert.deepEqual(await f.reactions.getCounts(p.id), { pukpuk: 1, ngakak: 1, sama: 2 });
  const removed = await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  assert.equal(removed.added, false);
  assert.equal(removed.userReactions.sama, false);
  assert.equal(f.xp(), 13);
  await f.reactions.toggle(p.id, OWNER, { type: 'sama' });
  assert.equal(f.xp(), 13);
});

test('concurrent same-reaction toggles serialize with no unique failure or extra XP', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  const results = await Promise.all(Array.from({ length: 10 }, () => f.reactions.toggle(p.id, BOB, { type: 'sama' })));
  assert.equal(results.filter((r) => r.added).length, 5);
  assert.equal(f.state.reaction.size, 0);
  assert.equal(f.xp(), 10);
  for (const result of results) assert.equal(result.counts.sama, result.added ? 1 : 0);
  for (const call of f.calls.filter((entry) => entry.op === '$queryRaw' && entry.args.table === 'profiles')) {
    const earlier = f.calls.slice(0, f.calls.indexOf(call)).filter((entry) => entry.txId === call.txId);
    if (earlier.some((entry) => entry.op === 'reaction.findUnique')) {
      assert.ok(earlier.some((entry) => entry.op === '$queryRaw' && entry.args.table === 'posts'));
    }
  }
});

test('concurrent operations on different posts serialize the same owner profile', async () => {
  const f = fixture(29);
  const [a, b] = await Promise.all([f.posts.create(OWNER, postInput), f.posts.create(OWNER, postInput)]);
  assert.equal(f.xp(), 49);
  await Promise.all([f.reactions.toggle(a.id, BOB, { type: 'pukpuk' }), f.reactions.toggle(b.id, EVE, { type: 'sama' })]);
  assert.equal(f.xp(), 54);
  assert.equal(f.state.profile.get(OWNER).mentalLevel, 2);
  await Promise.all([f.posts.softDelete(a.id, OWNER), f.posts.softDelete(b.id, OWNER)]);
  assert.equal(f.xp(), 29);
  assert.equal(f.state.profile.get(OWNER).mentalLevel, 1);
});

test('owner deletion removes base/reaction XP exactly once and cannot be farmed', async () => {
  const f = fixture(45);
  const p = await f.posts.create(OWNER, postInput);
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  await f.reactions.toggle(p.id, OWNER, { type: 'sama' });
  await assert.rejects(f.posts.softDelete(p.id, BOB), hasStatus(403));
  assert.equal(f.xp(), 58);
  assert.deepEqual(await f.posts.softDelete(p.id, OWNER), { id: p.id, status: 'deleted' });
  assert.equal(f.xp(), 45);
  await assert.rejects(f.posts.softDelete(p.id, OWNER), hasStatus(404));
  await assert.rejects(f.reactions.toggle(p.id, BOB, { type: 'sama' }), hasStatus(404));
  await assert.rejects(f.reactions.getCounts(p.id), hasStatus(404));
  await assert.rejects(f.reactions.getUserReactions(p.id, BOB), hasStatus(404));
  for (let i = 0; i < 3; i++) {
    const created = await f.posts.create(OWNER, postInput);
    await f.posts.softDelete(created.id, OWNER);
  }
  assert.equal(f.xp(), 45);
});

test('deletes and toggles are safe in both lock acquisition orders', async () => {
  for (const deleteFirst of [true, false]) {
    const f = fixture();
    const p = await f.posts.create(OWNER, postInput);
    const operations = [() => f.posts.softDelete(p.id, OWNER), () => f.reactions.toggle(p.id, BOB, { type: 'sama' })];
    if (!deleteFirst) operations.reverse();
    const results = await Promise.allSettled(operations.map((operation) => operation()));
    assert.equal(f.xp(), 0);
    assert.equal(f.state.post.get(p.id).status, 'deleted');
    assert.equal(results.filter((r) => r.status === 'rejected').length, deleteFirst ? 1 : 0);
  }
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  const result = await Promise.allSettled([f.posts.softDelete(p.id, OWNER), f.posts.softDelete(p.id, OWNER)]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(f.xp(), 0);
});

test('XP removal clamps at zero, and null-author posts never award XP', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  f.state.profile.set(OWNER, { ...f.state.profile.get(OWNER), mentalXp: 1, mentalLevel: 2 });
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  assert.equal(f.xp(), 0);
  assert.equal(f.state.profile.get(OWNER).mentalLevel, 1);
  await f.posts.softDelete(p.id, OWNER);
  assert.equal(f.xp(), 0);
  const orphan = { ...f.state.post.get(p.id), id: randomUUID(), userId: null, status: 'active' };
  f.state.post.set(orphan.id, orphan);
  await f.reactions.toggle(orphan.id, BOB, { type: 'pukpuk' });
  assert.equal(f.xp(), 0);
  assert.equal((await f.posts.findOne(orphan.id)).user, null);
});

test('XP failures roll back the entire post or reaction mutation', async () => {
  const f = fixture();
  f.fail('profile.update');
  await assert.rejects(f.posts.create(OWNER, postInput), /injected/);
  assert.equal(f.state.post.size, 0);
  assert.equal(f.xp(), 0);
  f.fail(undefined);
  const p = await f.posts.create(OWNER, postInput);
  f.fail('profile.update');
  await assert.rejects(f.reactions.toggle(p.id, BOB, { type: 'pukpuk' }), /injected/);
  assert.equal(f.state.reaction.size, 0);
  assert.equal(f.xp(), 10);
  await assert.rejects(f.posts.softDelete(p.id, OWNER), /injected/);
  assert.equal(f.state.post.get(p.id).status, 'active');
});

test('comments paginate, trim, expose only public authors and allow owner-only deletion', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  const first = await f.comments.create(p.id, BOB, { content: '  semangat  ' });
  const second = await f.comments.create(p.id, EVE, { content: 'sama' });
  assert.equal(first.content, 'semangat');
  assertNoSecrets(first);
  const page = await f.comments.findAll(p.id, 2, 1);
  assert.equal(page.data[0].id, second.id);
  assert.deepEqual([page.total, page.page, page.totalPages], [2, 2, 2]);
  await assert.rejects(f.comments.softDelete(first.id, OWNER), hasStatus(403));
  assert.deepEqual(await f.comments.softDelete(first.id, BOB), { id: first.id, status: 'deleted' });
  await assert.rejects(f.comments.softDelete(first.id, BOB), hasStatus(404));
  assert.equal((await f.comments.findAll(p.id)).total, 1);
  assert.equal(f.xp(), 10);
  await f.posts.softDelete(p.id, OWNER);
  await assert.rejects(f.comments.findAll(p.id), hasStatus(404));
  await assert.rejects(f.comments.create(p.id, BOB, { content: 'hello' }), hasStatus(404));
  await assert.rejects(f.comments.softDelete(second.id, EVE), hasStatus(404));
});

test('comment creation cannot race past a parent deletion', async () => {
  for (const deleteFirst of [true, false]) {
    const f = fixture();
    const p = await f.posts.create(OWNER, postInput);
    const operations = [() => f.posts.softDelete(p.id, OWNER), () => f.comments.create(p.id, BOB, { content: 'hello' })];
    if (!deleteFirst) operations.reverse();
    const results = await Promise.allSettled(operations.map((operation) => operation()));
    assert.equal(f.state.comment.size, deleteFirst ? 0 : 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, deleteFirst ? 1 : 0);
    await assert.rejects(f.comments.findAll(p.id), hasStatus(404));
  }
});

test('missing profiles are initialized and XP remains transactional', async () => {
  const f = fixture();
  f.state.profile.delete(OWNER);
  await f.posts.create(OWNER, postInput);
  assert.equal(f.xp(), 10);
  assert.equal(f.state.profile.get(OWNER).mentalLevel, 1);
});

test('reports validate target existence and never accept hidden comments or parents', async () => {
  const f = fixture();
  for (const targetType of ['post', 'comment', 'user']) {
    await assert.rejects(f.reports.create(BOB, { targetType, targetId: UNKNOWN, reason: 'spam' }), hasStatus(404));
  }
  assert.equal(f.state.report.size, 0);
  const p = await f.posts.create(OWNER, postInput);
  const c = await f.comments.create(p.id, BOB, { content: 'hello' });
  const report = await f.reports.create(EVE, { targetType: 'comment', targetId: c.id, reason: '  spam  ' });
  assert.equal(report.reason, 'spam');
  assert.equal(report.status, 'pending');
  assert.equal(report.reporterId, EVE);
  await f.reports.resolve(report.id, { action: 'hide' });
  await assert.rejects(f.reports.create(EVE, { targetType: 'comment', targetId: c.id, reason: 'spam' }), hasStatus(404));
  await f.posts.softDelete(p.id, OWNER);
  await assert.rejects(f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'spam' }), hasStatus(404));
});

test('admin post hide reverses XP once even with duplicate reports; pending pagination is private', async () => {
  const f = fixture(40);
  const p = await f.posts.create(OWNER, postInput);
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  await f.reactions.toggle(p.id, OWNER, { type: 'ngakak' });
  const a = await f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'spam' });
  const b = await f.reports.create(EVE, { targetType: 'post', targetId: p.id, reason: 'spam' });
  const pending = await f.reports.findPending(2, 1);
  assert.equal(pending.total, 2);
  assert.equal(pending.totalPages, 2);
  assert.equal(pending.data[0].id, b.id);
  await Promise.all([f.reports.resolve(a.id, { action: 'hide' }), f.reports.resolve(b.id, { action: 'hide' })]);
  assert.equal(f.xp(), 40);
  assert.equal(f.state.post.get(p.id).status, 'hidden');
  await assert.rejects(f.reports.resolve(a.id, { action: 'hide' }), hasStatus(409));
  await assert.rejects(f.posts.findOne(p.id), hasStatus(404));
  await assert.rejects(f.comments.findAll(p.id), hasStatus(404));
  await assert.rejects(f.reactions.getCounts(p.id), hasStatus(404));
  assert.equal((await f.posts.findAll()).total, 0);
  assert.equal((await f.reports.findPending()).total, 0);
});

test('moderation and reaction races preserve XP and active checks', async () => {
  for (const hideFirst of [true, false]) {
    const f = fixture();
    const p = await f.posts.create(OWNER, postInput);
    const r = await f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'spam' });
    const operations = [() => f.reports.resolve(r.id, { action: 'hide' }), () => f.reactions.toggle(p.id, EVE, { type: 'sama' })];
    if (!hideFirst) operations.reverse();
    await Promise.allSettled(operations.map((operation) => operation()));
    assert.equal(f.state.report.get(r.id).status, 'resolved');
    assert.equal(f.state.post.get(p.id).status, 'hidden');
    assert.equal(f.xp(), 0);
  }
});

test('same-report resolution and owner deletion cannot reverse XP twice', async () => {
  const f = fixture(40);
  const p = await f.posts.create(OWNER, postInput);
  await f.reactions.toggle(p.id, BOB, { type: 'pukpuk' });
  const report = await f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'spam' });
  const results = await Promise.allSettled([
    f.reports.resolve(report.id, { action: 'hide' }),
    f.reports.resolve(report.id, { action: 'dismiss' }),
    f.posts.softDelete(p.id, OWNER),
  ]);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.getStatus() === 409).length, 1);
  assert.equal(f.xp(), 40);
  assert.equal(f.state.report.get(report.id).status, 'resolved');
  assert.notEqual(f.state.post.get(p.id).status, 'active');
});

test('failed moderation rolls back status and XP together', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  await f.reactions.toggle(p.id, BOB, { type: 'sama' });
  const r = await f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'spam' });
  f.fail('report.update');
  await assert.rejects(f.reports.resolve(r.id, { action: 'hide' }), /injected/);
  assert.equal(f.state.post.get(p.id).status, 'active');
  assert.equal(f.state.report.get(r.id).status, 'pending');
  assert.equal(f.xp(), 13);
});

test('dismiss, hide comment, and disable user resolve transactionally without role changes', async () => {
  const f = fixture();
  const p = await f.posts.create(OWNER, postInput);
  const c = await f.comments.create(p.id, BOB, { content: 'hello' });
  const dismissed = await f.reports.create(BOB, { targetType: 'post', targetId: p.id, reason: 'mistake' });
  assert.equal((await f.reports.resolve(dismissed.id, { action: 'dismiss' })).status, 'dismissed');
  assert.equal(f.state.post.get(p.id).status, 'active');
  const commentReport = await f.reports.create(OWNER, { targetType: 'comment', targetId: c.id, reason: 'spam' });
  await f.reports.resolve(commentReport.id, { action: 'hide' });
  assert.equal(f.state.comment.get(c.id).status, 'hidden');
  assert.equal((await f.comments.findAll(p.id)).total, 0);
  assert.equal((await f.posts.findOne(p.id))._count.comments, 0);
  const userReport = await f.reports.create(BOB, { targetType: 'user', targetId: OWNER, reason: 'spam' });
  await f.reports.resolve(userReport.id, { action: 'hide' });
  assert.equal(f.state.user.get(OWNER).status, 'disabled');
  assert.equal(f.state.user.get(OWNER).role, 'user');
  assert.equal(f.state.post.get(p.id).status, 'active');
  assert.equal(f.xp(), 10);
});

test('admin guard requires authenticated, exact admin role', () => {
  const guard = new AdminGuard();
  const context = (user) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) });
  assert.throws(() => guard.canActivate(context(undefined)), hasStatus(401));
  for (const role of [undefined, 'user', 'Admin', 'administrator']) {
    assert.throws(() => guard.canActivate(context({ userId: OWNER, role })), hasStatus(403));
  }
  assert.equal(guard.canActivate(context({ userId: OWNER, role: 'admin' })), true);
});

test('controller public metadata, private reports, admin guard and module exports match contracts', () => {
  const { PATH_METADATA, METHOD_METADATA, GUARDS_METADATA, MODULE_METADATA } = require('@nestjs/common/constants');
  const { RequestMethod } = require('@nestjs/common');
  const { IS_PUBLIC_KEY } = load('common/decorators/public.decorator');
  const controllers = [
    ['posts/posts.controller', 'PostsController', 'posts', ['findAll', 'findOne'], ['create', 'softDelete']],
    ['reactions/reactions.controller', 'ReactionsController', 'posts/:id/reactions', ['getCounts'], ['toggle', 'getUserReactions']],
    ['comments/comments.controller', 'CommentsController', '/', ['findAll'], ['create', 'softDelete']],
    ['reports/reports.controller', 'ReportsController', 'reports', [], ['create']],
    ['reports/admin.controller', 'AdminController', 'admin/reports', [], ['findPending', 'resolve']],
  ];
  for (const [file, name, route, publicMethods, privateMethods] of controllers) {
    const Controller = load(file)[name];
    assert.equal(Reflect.getMetadata(PATH_METADATA, Controller), route);
    assert.notEqual(Reflect.getMetadata(IS_PUBLIC_KEY, Controller), true);
    for (const method of publicMethods) assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype[method]), true);
    for (const method of privateMethods) assert.notEqual(Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype[method]), true);
  }
  const { AdminController } = load('reports/admin.controller');
  assert.ok(Reflect.getMetadata(GUARDS_METADATA, AdminController).includes(AdminGuard));
  const routes = [
    ['posts/posts.controller', 'PostsController', 'findAll', 'GET', '/'],
    ['posts/posts.controller', 'PostsController', 'findOne', 'GET', ':id'],
    ['posts/posts.controller', 'PostsController', 'create', 'POST', '/'],
    ['posts/posts.controller', 'PostsController', 'softDelete', 'DELETE', ':id'],
    ['reactions/reactions.controller', 'ReactionsController', 'toggle', 'POST', '/'],
    ['reactions/reactions.controller', 'ReactionsController', 'getCounts', 'GET', '/'],
    ['reactions/reactions.controller', 'ReactionsController', 'getUserReactions', 'GET', 'me'],
    ['comments/comments.controller', 'CommentsController', 'findAll', 'GET', 'posts/:id/comments'],
    ['comments/comments.controller', 'CommentsController', 'create', 'POST', 'posts/:id/comments'],
    ['comments/comments.controller', 'CommentsController', 'softDelete', 'DELETE', 'comments/:id'],
    ['reports/reports.controller', 'ReportsController', 'create', 'POST', '/'],
    ['reports/admin.controller', 'AdminController', 'findPending', 'GET', '/'],
    ['reports/admin.controller', 'AdminController', 'resolve', 'PATCH', ':id'],
  ];
  for (const [file, name, method, verb, route] of routes) {
    const handler = load(file)[name].prototype[method];
    assert.equal(Reflect.getMetadata(PATH_METADATA, handler), route);
    assert.equal(Reflect.getMetadata(METHOD_METADATA, handler), RequestMethod[verb]);
  }
  for (const [folder, name, Service] of [['posts', 'Posts', PostsService], ['reactions', 'Reactions', ReactionsService], ['comments', 'Comments', CommentsService], ['reports', 'Reports', ReportsService]]) {
    const Module = load(`${folder}/${folder}.module`)[name + 'Module'];
    assert.ok(Reflect.getMetadata(MODULE_METADATA.EXPORTS, Module).includes(Service));
  }
  const { PostsController } = load('posts/posts.controller');
  assert.throws(() => new PostsController({}).create(undefined, postInput), hasStatus(401));
});
