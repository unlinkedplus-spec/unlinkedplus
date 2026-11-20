const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'app', 'page.tsx')));
if (!webRoot) throw new Error('web source root not found');

const landing = fs.readFileSync(path.join(webRoot, 'app', 'page.tsx'), 'utf8');
const appPage = fs.readFileSync(path.join(webRoot, 'app', 'app', 'page.tsx'), 'utf8');
const waitlist = fs.readFileSync(path.join(webRoot, 'components', 'WaitlistForm.tsx'), 'utf8');

test('H4 regression: landing renders the real registration form and navigable CTAs', () => {
  assert.match(landing, /import Link from ['"]next\/link['"]/);
  assert.match(landing, /<WaitlistForm mode="hero" \/>/);
  assert.match(landing, /href="\/app\?tab=spill"/);
  assert.match(landing, /href="\/app"/);
  assert.ok(!landing.includes('<button'), 'landing CTAs must navigate or open the real auth form');
});

test('H4 regression: app honours landing deep links', () => {
  assert.match(appPage, /params\.get\('tab'\)/);
  assert.match(appPage, /setActiveSection\(requestedTab as TabId\)/);
  for (const tab of ['feed', 'confession', 'spill', 'avatar', 'shop', 'profile']) {
    assert.ok(appPage.includes(`'${tab}'`), `app must accept tab=${tab}`);
  }
});

test('H4 regression: WaitlistForm uses real auth endpoints, not a fake success', () => {
  assert.match(waitlist, /authRegister/);
  assert.match(waitlist, /authLogin/);
  assert.match(waitlist, /router\.push\('\/app'\)/);
  assert.ok(!waitlist.includes('Berhasil'));
});
