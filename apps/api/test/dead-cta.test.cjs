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

test('H4 regression: root serves the two-state Beranda with navigable CTAs', () => {
  assert.match(landing, /import \{ cookies \} from ['"]next\/headers['"]/);
  assert.match(landing, /jar\.get\('unlinked_session'\)/);
  assert.match(landing, /<ExactMockup view=/);
  assert.match(landing, /authenticated \? 'beranda' : 'landing'/);
  assert.ok(fs.existsSync(path.join(webRoot, 'components', 'ExactMockup.tsx')),
    'exact mockup component must exist');
  const dash = fs.readFileSync(path.join(webRoot, 'components', 'ExactMockup.tsx'), 'utf8');
  assert.match(dash, /mockup-identik\/chibi-landing\.png/);
  assert.match(dash, /mockup-identik\/same-boat\.png/);
  assert.match(dash, /['"]\/features\/spill['"]/);
  assert.match(dash, /['"]\/app['"]/);
  assert.match(dash, /createPost\(/);
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
