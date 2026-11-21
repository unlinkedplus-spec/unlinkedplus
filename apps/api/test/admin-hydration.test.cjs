const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webSrc = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'app', 'home', 'page.tsx')));
if (!webSrc) throw new Error('web source not found');
const read = (...parts) => fs.readFileSync(path.join(webSrc, ...parts), 'utf8');

test('Admin CMS and /app hydrate: server wrappers read cookies, CSP stays nonce-based', () => {
  for (const dir of ['admin', path.join('admin', 'dashboard'), 'app', 'cms']) {
    const wrapper = read('app', dir, 'page.tsx');
    assert.match(wrapper, /import \{ cookies \} from ['"]next\/headers['"]/, `${dir} must be dynamic`);
    assert.match(wrapper, /await cookies\(\)/, `${dir} must read the session cookie per request`);
    assert.match(wrapper, /Client from '\.\//, `${dir} must render its client component`);
  }
  const clientFiles = [
    ['admin', 'AdminClient.tsx'],
    [path.join('admin', 'dashboard'), 'AdminDashboardClient.tsx'],
    ['app', 'AppClient.tsx'],
    ['cms', 'CmsClient.tsx'],
  ];
  for (const [dir, file] of clientFiles) {
    assert.ok(fs.existsSync(path.join(webSrc, 'app', dir, file)), `${dir}/${file} must exist`);
    assert.match(read('app', dir, file), /^'use client'/, `${file} must stay a client component`);
  }
  const middleware = read('middleware.ts');
  assert.match(middleware, /pathname === '\/'/);
  assert.ok(!middleware.includes("pathname.startsWith('/admin')"), 'admin must not get the static CSP exception');
});
