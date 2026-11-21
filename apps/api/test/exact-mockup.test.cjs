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
const hotspots = JSON.parse(fs.readFileSync(path.join(web, 'src', 'lib', 'mockup-hotspots.json'), 'utf8'));

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
  assert.match(component, /\.ex-text\{[^}]*background:#fff/, 'composer must cover baked-in placeholder');
  assert.match(component, /\.ex-text::placeholder\{color:#9AA3B8\}/);
  assert.match(component, /data-hotspot=\{s\.id\}/, 'each measured hotspot must be identifiable in the DOM');
  assert.match(component, /mockup-hotspots\.json/);
});

test('Exact landing: every CTA and menu opens auth or a real feature', () => {
  assert.match(component, /import AuthModal from '\.\/AuthModal'/);
  assert.match(component, /setAuthTab\('login'\)/);
  assert.match(component, /setAuthTab\('register'\)/);
  assert.match(component, /window\.location\.href = '\/home'/);
  assert.match(component, /aria-label="Tulis spill"/);
  assert.ok(!component.includes('href="/app" aria-label="Masuk"'), 'landing Masuk must not jump to /app');
  assert.ok(!component.includes('href="/app" aria-label="Gabung Sekarang"'), 'landing CTA must not jump to /app');
});

test('Hotspots: measured geometry, inside the canvas, no overlaps', () => {
  const { width, height } = hotspots.design;
  for (const view of ['landing', 'beranda']) {
    const spots = hotspots[view].spots;
    assert.ok(spots.length >= 17, `${view} must expose every visible action`);
    const ids = new Set();
    for (const s of spots) {
      assert.ok(!ids.has(s.id), `duplicate hotspot id ${s.id}`);
      ids.add(s.id);
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= width && s.y + s.h <= height,
        `${s.id} must stay inside the ${width}x${height} reference`);
      assert.ok(s.w >= 30 && s.h >= 28, `${s.id} must be comfortably clickable`);
      if (s.href) {
        assert.match(s.href, /^\//, `${s.id} must stay in-app`);
        assert.ok(s.action === undefined, `${s.id} has both href and action`);
      } else {
        assert.ok(typeof s.action === 'string' && s.action.length > 0, `${s.id} must do something`);
      }
    }
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i], b = spots[j];
        const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        assert.ok(dx <= 0 || dy <= 0, `hotspots overlap: ${a.id} vs ${b.id}`);
      }
    }
  }
});

test('Landing pillars map to the official features in visual order', () => {
  const byId = Object.fromEntries(hotspots.landing.spots.map((s) => [s.id, s]));
  assert.equal(byId['pilar-spill'].href, '/features/spill');
  assert.equal(byId['pilar-same-boat'].href, '/features/same-boat');
  assert.equal(byId['pilar-mental-armor'].href, '/features/mental-armor');
  assert.equal(byId['pilar-comeback'].href, '/features/comeback-journey');
  assert.equal(byId['pilar-avatar-store'].href, '/features/toko');
  assert.equal(byId['fitur-reset'].href, '/features/mental-reset');
  assert.equal(byId['fitur-hall'].href, '/features/hall-of-almost');
});

test('Beranda Fitur Seru rows line up with the mockup and the video chip works', () => {
  const byId = Object.fromEntries(hotspots.beranda.spots.map((s) => [s.id, s]));
  for (const [id, href] of [
    ['fs-poll', '/features/poll'],
    ['fs-personality', '/features/personality-test'],
    ['fs-meme', '/features/meme-studio'],
    ['fs-store', '/features/toko'],
    ['fs-opportunity', '/features/opportunity-board'],
    ['fs-mental', '/features/mental-reset'],
  ]) assert.equal(byId[id].href, href, id + ' must route to its own page');

  // The rendered rows start at y=404 with a 46px pitch; a 30px drift is what
  // made "Poll" open the wrong page before.
  const tops = ['fs-poll', 'fs-personality', 'fs-meme', 'fs-store', 'fs-opportunity', 'fs-mental']
    .map((id) => byId[id].y);
  tops.forEach((y, i) => assert.equal(y, 404 + i * 46, 'row ' + i + ' must follow the measured pitch'));

  assert.equal(byId['compose-video'].href, '/features/video');
  assert.equal(byId['compose-poll'].href, '/features/poll');
  assert.equal(byId['nav-beranda'].href, '/home');
});
