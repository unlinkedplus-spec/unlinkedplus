const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiSrc = [
  path.join(__dirname, '..', '..', '..', 'apps', 'api', 'src'),
  path.join(__dirname, '..', 'src'),
].find((p) => fs.existsSync(path.join(p, 'posts', 'social.persistence.ts')));
const webSrc = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'FailFeed.tsx')));
const repoRoot = [
  path.join(__dirname, '..', '..', '..'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'docker-compose.yml')));
if (!apiSrc || !webSrc || !repoRoot) throw new Error('api/web/repo source not found');

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');
const schemaPath = [
  path.join(repoRoot, 'apps', 'api', 'prisma', 'schema.prisma'),
  path.join(repoRoot, 'prisma', 'schema.prisma'),
].find((p) => fs.existsSync(p));
if (!schemaPath) throw new Error('prisma schema not found');
const schema = fs.readFileSync(schemaPath, 'utf8');
const migrationPath = [
  path.join(repoRoot, 'apps', 'api', 'prisma', 'migrations', '20261121140000_add_spill_mode', 'migration.sql'),
  path.join(repoRoot, 'prisma', 'migrations', '20261121140000_add_spill_mode', 'migration.sql'),
].find((p) => fs.existsSync(p));
if (!migrationPath) throw new Error('spill mode migration not found');
const migration = fs.readFileSync(migrationPath, 'utf8');
const dto = read(apiSrc, 'posts', 'dto', 'create-post.dto.ts');
const persistence = read(apiSrc, 'posts', 'social.persistence.ts');
const service = read(apiSrc, 'posts', 'posts.service.ts');
const types = read(webSrc, 'lib', 'types.ts');
const apiClient = read(webSrc, 'lib', 'api.ts');
const createPost = read(webSrc, 'components', 'CreatePost.tsx');
const feed = read(webSrc, 'components', 'FailFeed.tsx');
const nginx = read(repoRoot, 'docker', 'host-nginx.conf');

test('Spill Without Judgment: schema and migration are data-preserving', () => {
  assert.match(schema, /spillMode\s+String\s+@default\("listen"\) @map\("spill_mode"\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "spill_mode"/);
  assert.match(migration, /DEFAULT 'listen'/);
  assert.match(migration, /CHECK \("spill_mode" IN \('listen', 'advice', 'laugh', 'share'\)\)/);
  const normalised = migration.replace(/--.*$/gm, '').toUpperCase();
  for (const forbidden of ['DROP TABLE', 'DELETE FROM', 'TRUNCATE', 'DROP COLUMN']) {
    assert.ok(!normalised.includes(forbidden), `migration must not contain ${forbidden}`);
  }
});

test('Spill Without Judgment: API validates all four modes and defaults to listen', () => {
  assert.match(dto, /SPILL_MODES = \['listen', 'advice', 'laugh', 'share'\]/);
  assert.match(dto, /@IsOptional\(\)/);
  assert.match(dto, /@IsIn\(SPILL_MODES\)/);
  assert.match(dto, /spillMode\?: SpillMode/);
  assert.match(service, /spillMode: dto\.spillMode \?\? 'listen'/);
  const postSelect = persistence.match(/export const POST_SELECT = \{([\s\S]*?)\n\} satisfies/)[1];
  assert.match(postSelect, /spillMode: true/);
  assert.ok(!postSelect.includes('userId'), 'Gate 1: public projection must still hide author id');
});

test('Spill Without Judgment: author picks a mode; reader sees the respect hint', () => {
  assert.match(types, /SPILL_MODES = \['listen', 'advice', 'laugh', 'share'\]/);
  assert.match(types, /Cuma mau didengar/);
  assert.match(types, /Balas dengan dukungan, bukan nasihat/);
  assert.match(types, /spillMode\?: SpillMode/);
  assert.match(apiClient, /spillMode\?: string/);
  assert.match(createPost, /setSpillMode\(mode\)/);
  assert.match(createPost, /createPost\(\{ category, content: content\.trim\(\), spillMode \}\)/);
  assert.match(feed, /SPILL_MODE_META\[post\.spillMode as SpillMode\]/);
  assert.match(feed, /\{mode\.label\}/);
  assert.match(feed, /\{mode\.hint\}/);
});

test('Spill Without Judgment: Gate 1 anonymous identity remains intact', () => {
  assert.equal((service.match(/publicPost\(/g) || []).length, 3,
    'feed, detail and create responses must still mask anonymous authors');
  assert.match(feed, /\{loggedIn && \(/);
  assert.ok(!feed.includes('post.userId'));
  const postType = types.match(/export interface Post \{([\s\S]*?)\n\}/)[1];
  assert.ok(!postType.includes('userId'));
});

test('Spill Without Judgment: SSG root and dynamic /home both proxy to Next.js', () => {
  const rootBlock = nginx.slice(nginx.indexOf('location / {'));
  assert.match(rootBlock, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.match(nginx, /location ~ \^\/home\(\/\|\$\)/);
  assert.match(nginx, /location ~ \^\/\(styles\|js\|images\|fonts\)\//);
  assert.match(nginx, /root \/var\/www\/unlinked-plus/);
  assert.match(nginx, /location = \/preview/);
  const landing = [
    path.join(repoRoot, 'index.html'),
    path.join(repoRoot, '..', '..', 'index.html'),
  ].find((p) => fs.existsSync(p));
  if (landing) {
    const html = fs.readFileSync(landing, 'utf8');
    assert.ok(!html.includes('spillMode'), 'static landing must not contain feature code');
    assert.ok(html.includes('Tempatnya'), 'static landing mockup is retained for rollback');
  }
});
