const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'api'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'src', 'notifications', 'notifications.service.ts')));
const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'NotificationsPanel.tsx')));
if (!apiRoot || !webRoot) throw new Error('notification source not found');
const readApi = (...p) => fs.readFileSync(path.join(apiRoot, ...p), 'utf8');
const readWeb = (...p) => fs.readFileSync(path.join(webRoot, ...p), 'utf8');

test('Notifications are real DB rows, created in the triggering transaction', () => {
  const schema = readApi('prisma', 'schema.prisma');
  const migration = readApi('prisma', 'migrations', '20261121190000_add_notifications', 'migration.sql');
  assert.match(schema, /model Notification/);
  assert.match(schema, /notifications\s+Notification\[\]\s+@relation\("recipient"\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "notifications"/);
  assert.match(migration, /"notifications_actor_id_fkey"/);
  assert.ok(!/DROP TABLE|DELETE FROM/i.test(migration), 'migration must be additive');

  const service = readApi('src', 'notifications', 'notifications.service.ts');
  assert.match(service, /createInTx\(tx:/);
  assert.match(service, /if \(input\.userId === input\.actorId\) return null/);
  assert.match(service, /Seseorang/, 'anonymous actors must be masked');
  assert.match(service, /readAt: null/, 'new notifications start unread');

  const reactions = readApi('src', 'reactions', 'reactions.service.ts');
  const comments = readApi('src', 'comments', 'comments.service.ts');
  assert.match(reactions, /notifications\.createInTx\(tx/);
  assert.match(comments, /notifications\.createInTx\(tx/);
});

test('Notifications API is authenticated and exposes REST + SSE', () => {
  const ctrl = readApi('src', 'notifications', 'notifications.controller.ts');
  assert.match(ctrl, /@Controller\('notifications'\)/);
  assert.match(ctrl, /@Get\('unread-count'\)/);
  assert.match(ctrl, /@Patch\(':id\/read'\)/);
  assert.match(ctrl, /@Patch\('read-all'\)/);
  assert.match(ctrl, /@Sse\('stream'\)/);
  assert.match(ctrl, /X-Accel-Buffering/, 'nginx must not buffer the stream');
  const app = readApi('src', 'app.module.ts');
  assert.match(app, /NotificationsModule/);
  const nginxPath = [
    path.join(__dirname, '..', '..', '..', 'docker', 'host-nginx.conf'),
    path.join(__dirname, '..', 'docker', 'host-nginx.conf'),
  ].find((p) => fs.existsSync(p));
  assert.ok(nginxPath, 'nginx config must exist');
  const nginx = fs.readFileSync(nginxPath, 'utf8');
  assert.match(nginx, /location = \/api\/notifications\/stream/);
  assert.match(nginx, /proxy_buffering off/);
});

test('Frontend shows real unread count and real notifications', () => {
  const api = readWeb('lib', 'api.ts');
  for (const fn of ['getNotifications', 'getUnreadCount', 'markNotificationRead', 'markAllNotificationsRead']) {
    assert.ok(api.includes(`export const ${fn}`), `api client must expose ${fn}`);
  }
  const hook = readWeb('lib', 'use-unread.ts');
  assert.match(hook, /new EventSource\('\/api\/notifications\/stream'/);
  const panel = readWeb('components', 'NotificationsPanel.tsx');
  assert.match(panel, /getNotifications\(/);
  assert.match(panel, /markNotificationRead/);
  assert.ok(!panel.includes('getMyPosts'), 'panel must not fake activity from own posts');

  const mock = readWeb('components', 'ExactMockup.tsx');
  assert.match(mock, /useUnreadCount\(authenticated\)/);
  assert.match(mock, /ex-badge/);
  assert.match(readWeb('components', 'FeaturePage.tsx'), /chrome-badge-cover/);
  assert.match(readWeb('components', 'DashboardPixel.tsx'), /chrome-badge-cover/);
  const mobile = readWeb('components', 'BerandaMobile.tsx');
  assert.match(mobile, /unread > 0/);
  assert.ok(!mobile.includes('>3</span>'), 'hardcoded badge must be gone');
  assert.ok(fs.existsSync(path.join(webRoot, 'app', 'posts', '[id]', 'page.tsx')), 'post detail route must exist');
});
