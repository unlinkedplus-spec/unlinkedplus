const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'api'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'src', 'content', 'content.service.ts')));
const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'CmsPanels.tsx')));
if (!apiRoot || !webRoot) throw new Error('api/web CMS source not found');
const readApi = (...p) => fs.readFileSync(path.join(apiRoot, ...p), 'utf8');
const readWeb = (...p) => fs.readFileSync(path.join(webRoot, ...p), 'utf8');

const slugs = [
  'spill', 'same-boat', 'mental-armor', 'comeback-journey', 'toko',
  'unlinked-rooms', 'support-circles', 'dear-future-me', 'tiny-wins',
  'hall-of-almost', 'mental-reset',
];

test('CMS content is additive, seeded from the landing and uses stable keys', () => {
  const schema = readApi('prisma', 'schema.prisma');
  const migration = readApi('prisma', 'migrations', '20261121180000_add_cms_content', 'migration.sql');
  assert.match(schema, /slug\s+String\?\s+@unique/);
  assert.match(schema, /sortOrder\s+Int\s+@default\(0\)/);
  assert.match(schema, /model Setting/);
  assert.match(migration, /ALTER TABLE "contents" ADD COLUMN( IF NOT EXISTS)? "slug"/);
  assert.match(migration, /CREATE UNIQUE INDEX( IF NOT EXISTS)? "contents_slug_key"/);
  assert.match(migration, /gen_random_uuid\(\)::text/, 'legacy contents.id has no DB default');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "settings"/);
  assert.ok(!/DROP TABLE|DELETE FROM|DROP COLUMN/i.test(migration), 'migration must stay additive');
  for (const slug of slugs) {
    assert.ok(migration.includes(`'${slug}', '`), `seed must include ${slug}`);
  }
});

test('CMS API exposes public catalog and guarded admin modules', () => {
  const pub = readApi('src', 'content', 'content.controller.ts');
  const admin = readApi('src', 'admin', 'admin-cms.controller.ts');
  const service = readApi('src', 'content', 'content.service.ts');
  const module = readApi('src', 'admin', 'admin.module.ts');
  const appModule = readApi('src', 'app.module.ts');
  assert.match(pub, /@Public\(\)/);
  assert.match(pub, /@Get\('landing'\)/);
  assert.match(service, /status: 'published'/);
  assert.match(admin, /@UseGuards\(AdminGuard\)/);
  for (const endpoint of ['content/:slug', 'settings/ads', 'polls/:id/status', 'store/items/:id', 'certificates/:id/status']) {
    assert.ok(admin.includes(endpoint), `admin API must expose ${endpoint}`);
  }
  assert.match(module, /AdminCmsController/);
  assert.match(appModule, /ContentModule/);
});

test('CMS UI mirrors every landing card and keeps ads truthful', () => {
  const panels = readWeb('components', 'CmsPanels.tsx');
  const client = readWeb('app', 'cms', 'CmsClient.tsx');
  const api = readWeb('lib', 'api.ts');
  const feature = readWeb('components', 'FeaturePage.tsx');
  const landing = readWeb('components', 'LandingFeaturePage.tsx');
  const mock = readWeb('components', 'ExactMockup.tsx');
  for (const tab of ['Fitur & Konten', 'Poll', 'Toko', 'Iklan', 'Sertifikat']) {
    assert.ok(client.includes(tab), `CMS must have ${tab} tab`);
  }
  for (const fn of ['getAdminContent', 'updateAdminContent', 'getAdminAds', 'updateAdminAds',
    'getAdminPolls', 'setAdminPollStatus', 'getAdminStoreItems', 'updateAdminStoreItem',
    'getAdminCertificates', 'setAdminCertificateStatus', 'getLandingContent']) {
    assert.ok(api.includes(`export const ${fn}`), `api client must expose ${fn}`);
  }
  assert.ok(panels.includes('useContentFor') || panels.includes('updateAdminContent'));
  assert.match(feature, /useContentFor\(slug\)/);
  assert.match(landing, /useContentFor\(slug\)/);
  assert.match(mock, /ex-cms-label/);
  assert.match(mock, /LANDING_CMS/);
  assert.match(panels, /pembayaran tetap simulasi/i);
});

test('Navigation hover animations are shared and respect reduced motion', () => {
  const css = readWeb('app', 'globals.css');
  for (const cls of ['nav-fx', 'tab-fx', 'menu-fx', 'card-fx', 'prefers-reduced-motion']) {
    assert.ok(css.includes(cls), `globals.css must define ${cls}`);
  }
  const mock = readWeb('components', 'ExactMockup.tsx');
  assert.match(mock, /menu-fx/);
  assert.match(mock, /card-fx/);
  assert.match(readWeb('app', 'cms', 'CmsClient.tsx'), /tab-fx/);
});

test('Stuck login is impossible: admin panels have a session timeout fallback', () => {
  for (const file of [
    readWeb('app', 'cms', 'CmsClient.tsx'),
    readWeb('app', 'admin', 'AdminClient.tsx'),
    readWeb('app', 'admin', 'dashboard', 'AdminDashboardClient.tsx'),
  ]) {
    assert.match(file, /withTimeout/);
    assert.match(file, /Sesi tidak merespons/);
  }
  assert.match(readWeb('app', 'admin', 'AdminClient.tsx'), /withTimeout\(authLogin/);
  assert.match(readWeb('app', 'admin', 'AdminClient.tsx'), /Muat ulang/);
});
