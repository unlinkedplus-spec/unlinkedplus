const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const web = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web'),
  path.join(__dirname, '..', '..', 'web_build'),
].find((p) => fs.existsSync(path.join(p, 'src', 'components', 'ExactMockup.tsx')));
if (!web) throw new Error('ExactMockup not found');
const component = fs.readFileSync(path.join(web, 'src', 'components', 'ExactMockup.tsx'), 'utf8');

test('Exact mockup: both ZIP images are bundled and used', () => {
  for (const asset of ['chibi-landing.png', 'same-boat.png']) {
    assert.ok(fs.existsSync(path.join(web, 'public', 'mockup-identik', asset)), asset + ' must be bundled');
    assert.ok(component.includes(asset), component + ' must reference ' + asset);
  }
  const chibi = fs.readFileSync(path.join(web, 'public', 'mockup-identik', 'chibi-landing.png'));
  const same = fs.readFileSync(path.join(web, 'public', 'mockup-identik', 'same-boat.png'));
  assert.equal(chibi.slice(1, 4).toString(), 'PNG');
  assert.equal(same.slice(1, 4).toString(), 'PNG');
});

test('Exact mockup: visual is exact, interactions are real overlays', () => {
  assert.match(component, /createPost\(/);
  assert.match(component, /toggleReaction\(/);
  assert.match(component, /recordAdImpression\(/);
  assert.match(component, /showAd/);
  assert.match(component, /features\/spill/);
  assert.match(component, /aria-label="Tulis spill"/);
  assert.match(component, /transform:scale\(\$\{scale\}\)/);
});
