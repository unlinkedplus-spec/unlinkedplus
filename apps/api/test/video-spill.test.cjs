const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'api'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'src', 'posts', 'dto', 'create-post.dto.ts')));
const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'VideoSpill.tsx')));
if (!apiRoot || !webRoot) throw new Error('api/web source not found');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

const schema = read(apiRoot, 'prisma', 'schema.prisma');
const migration = read(apiRoot, 'prisma', 'migrations', '20261121173000_add_post_video_url', 'migration.sql');
const dto = read(apiRoot, 'src', 'posts', 'dto', 'create-post.dto.ts');
const service = read(apiRoot, 'src', 'posts', 'posts.service.ts');
const select = read(apiRoot, 'src', 'posts', 'social.persistence.ts');
const video = read(webRoot, 'components', 'VideoSpill.tsx');
const feed = read(webRoot, 'components', 'FailFeed.tsx');
const route = read(webRoot, 'app', 'features', '[slug]', 'page.tsx');

test('Video Spill: additive column, no data loss', () => {
  assert.match(migration, /ALTER TABLE "posts" ADD COLUMN "video_url" VARCHAR\(500\)/);
  assert.ok(!/DROP|DELETE|ALTER COLUMN/i.test(migration), 'migration must stay additive');
  assert.match(schema, /videoUrl\s+String\?\s+@map\("video_url"\)\s+@db\.VarChar\(500\)/);
});

test('Video Spill: only allow-listed https providers', () => {
  const m = dto.match(/VIDEO_URL_PATTERN\s*=\s*(\/\^[^\n]+\/i);/);
  assert.ok(m, 'DTO must define an https-only video URL pattern');
  const re = eval(m[1]);
  assert.ok(re.test('https://youtu.be/abc123'));
  assert.ok(re.test('https://www.youtube.com/watch?v=abc'));
  assert.ok(re.test('https://www.tiktok.com/@user/video/1'));
  assert.ok(re.test('https://www.instagram.com/reel/abc/'));
  assert.ok(!re.test('http://youtu.be/abc123'));
  assert.ok(!re.test('https://evil.example.com/video'));
  assert.ok(!re.test('javascript:alert(1)'));
  assert.match(dto, /@Matches\(VIDEO_URL_PATTERN/);
  assert.match(dto, /@MaxLength\(500\)/);
});

test('Video Spill: persisted, returned and shown without third-party embeds', () => {
  assert.match(service, /videoUrl: dto\.videoUrl \?\? null/);
  assert.match(select, /videoUrl: true/);
  assert.match(video, /createPost\(\{/);
  assert.match(video, /videoUrl: url\.trim\(\)/);
  assert.match(video, /tidak ada file yang diunggah/i);
  assert.match(video, /target="_blank" rel="noopener noreferrer"/);
  assert.match(feed, /post\.videoUrl/);
  assert.match(feed, /rel="noopener noreferrer"/);
  assert.ok(!/iframe|<embed|<video/.test(feed + video), 'no third-party embed/player');
  assert.ok(route.includes("'video'"), 'route must allow /features/video');
});
