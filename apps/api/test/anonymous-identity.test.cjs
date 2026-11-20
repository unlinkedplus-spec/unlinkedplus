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
if (!apiSrc || !webSrc) throw new Error('api/web source not found');

const socialPersistence = fs.readFileSync(path.join(apiSrc, 'posts', 'social.persistence.ts'), 'utf8');
const postsService = fs.readFileSync(path.join(apiSrc, 'posts', 'posts.service.ts'), 'utf8');
const adminService = fs.readFileSync(path.join(apiSrc, 'admin', 'admin-dashboard.service.ts'), 'utf8');
const userSelect = fs.readFileSync(path.join(apiSrc, 'users', 'user.select.ts'), 'utf8');
const feedComponent = fs.readFileSync(path.join(webSrc, 'components', 'FailFeed.tsx'), 'utf8');
const webTypes = fs.readFileSync(path.join(webSrc, 'lib', 'types.ts'), 'utf8');

test('Gate 1: public post/comment projections never expose internal author ids', () => {
  const postSelect = socialPersistence.match(/export const POST_SELECT = \{([\s\S]*?)\n\} satisfies/)[1];
  const commentSelect = socialPersistence.match(/export const COMMENT_SELECT = \{([\s\S]*?)\n\} satisfies/)[1];
  assert.ok(!postSelect.includes('userId'), 'POST_SELECT must not expose userId');
  assert.ok(!commentSelect.includes('userId'), 'COMMENT_SELECT must not expose userId');
  assert.match(postSelect, /isAnonymous: true/);
  assert.match(socialPersistence, /user: \{ select: PUBLIC_AUTHOR_SELECT \}/);
  assert.match(socialPersistence, /export function publicPost/);
  const authorSelect = userSelect.match(/export const PUBLIC_AUTHOR_SELECT = \{([\s\S]*?)\n\} satisfies/)[1];
  assert.ok(!authorSelect.includes('id: true'), 'public author projection must not include the internal id');
});

test('Gate 1: every public post surface masks anonymous authors', () => {
  assert.equal((postsService.match(/publicPost\(/g) || []).length, 3,
    'feed, detail and create responses must all use publicPost');
  assert.match(feedComponent, /\{loggedIn && \(/);
  assert.ok(!feedComponent.includes('post.userId'));
  const postType = webTypes.match(/export interface Post \{([\s\S]*?)\n\}/)[1];
  assert.ok(!postType.includes('userId'));
});

test('Gate 1: moderation keeps explicit ids so reports remain actionable', () => {
  const adminPostSelect = adminService.match(/const ADMIN_POST_SELECT = \{([\s\S]*?)\n\} satisfies/)[1];
  assert.match(adminPostSelect, /userId: true/);
  assert.match(adminPostSelect, /user: \{ select: \{ id: true, username: true \} \}/);
});
