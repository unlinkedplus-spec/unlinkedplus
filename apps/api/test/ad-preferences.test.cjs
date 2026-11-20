const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'api'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'src', 'users', 'users.service.ts')));
const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'DashboardPixel.tsx')));
if (!apiRoot || !webRoot) throw new Error('api/web source not found');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');
const schema = read(apiRoot, 'prisma', 'schema.prisma');
const migration = read(apiRoot, 'prisma', 'migrations', '20261121150000_add_ad_preferences', 'migration.sql');
const dto = read(apiRoot, 'src', 'users', 'dto', 'ad-preferences.dto.ts');
const service = read(apiRoot, 'src', 'users', 'users.service.ts');
const controller = read(apiRoot, 'src', 'users', 'users.controller.ts');
const api = read(webRoot, 'lib', 'api.ts');
const pixel = read(webRoot, 'components', 'ExactMockup.tsx');
const mobile = read(webRoot, 'components', 'DashboardMobile.tsx');
const profile = read(webRoot, 'components', 'ProfileTab.tsx');

test('SEC-04: ad preferences are data-preserving and explicitly user-owned', () => {
  assert.match(schema, /adPreferences\s+Json\?\s+@map\("ad_preferences"\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "ad_preferences" JSONB/);
  assert.match(migration, /DEFAULT '\{"adsEnabled":true,"maxPerSession":5\}'/);
  const normalised = migration.replace(/--.*$/gm, '').toUpperCase();
  for (const forbidden of ['DROP TABLE', 'DELETE FROM', 'TRUNCATE', 'DROP COLUMN']) {
    assert.ok(!normalised.includes(forbidden), `migration must not contain ${forbidden}`);
  }
  assert.match(dto, /@IsBoolean\(\)/);
  assert.match(dto, /@IsInt\(\)/);
  assert.match(dto, /@Max\(20\)/);
});

test('SEC-04: backend owns preference + daily frequency cap, no content targeting', () => {
  assert.match(service, /getAdPreferences\(/);
  assert.match(service, /setAdPreferences\(/);
  assert.match(service, /recordAdImpression\(/);
  assert.match(service, /adimpr:\$\{userId\}/);
  assert.match(service, /expire\(key, 86_400\)/);
  assert.match(controller, /@Get\('me\/ad-preferences'\)/);
  assert.match(controller, /@Patch\('me\/ad-preferences'\)/);
  assert.match(controller, /@Post\('me\/ad-impressions'\)/);
  const adBlock = service.slice(service.indexOf('async getAdPreferences')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.ok(!adBlock.includes('spillMode') && !adBlock.includes('post.') && !adBlock.includes('content'),
    'ads must not be chosen from Spill content');
});

test('SEC-04: frontend hides ads when opted out or capped, and exposes settings', () => {
  assert.match(api, /getAdPreferences/);
  assert.match(api, /updateAdPreferences/);
  assert.match(api, /recordAdImpression/);
  assert.match(pixel, /recordAdImpression\(\)\.then/);
  assert.match(pixel, /!showAd/);
  assert.match(mobile, /recordAdImpression\(\)\.then/);
  assert.match(mobile, /!showAd/);
  assert.match(profile, /Preferensi iklan/);
  assert.match(profile, /Tampilkan iklan/);
  assert.match(profile, /Batas iklan per hari/);
  assert.match(profile, /updateAdPreferences/);
});
