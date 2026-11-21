const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const web = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'LandingMobile.tsx')));
if (!web) throw new Error('mobile source not found');
const read = (...parts) => fs.readFileSync(path.join(web, ...parts), 'utf8');

const mock = read('components', 'ExactMockup.tsx');
const landingMobile = read('components', 'LandingMobile.tsx');
const berandaMobile = read('components', 'BerandaMobile.tsx');
const css = read('app', 'globals.css');

test('Mobile root and dashboard render proportional Tailwind layouts', () => {
  assert.match(mock, /import LandingMobile from '\.\/LandingMobile'/);
  assert.match(mock, /import BerandaMobile from '\.\/BerandaMobile'/);
  assert.match(mock, /window\.innerWidth < 900/);
  assert.match(mock, /if \(mobile\) \{/);
  assert.match(mock, /<LandingMobile/);
  assert.match(mock, /<BerandaMobile/);
  for (const src of [landingMobile, berandaMobile]) {
    assert.match(src, /^'use client'/);
    assert.match(src, /min-h-screen/);
    assert.match(src, /max-w-md/);
  }
  // Every visible action on mobile must still be a real route or handler.
  for (const href of ['/features/same-boat', '/features/spill', '/features/iklan', '/features/video', '/features/profil']) {
    assert.ok(berandaMobile.includes(href) || landingMobile.includes(href) || mock.includes(href), `mobile must expose ${href}`);
  }
});

test('Shared .fp-* / .fm-* classes live in globals.css: no mobile unstyled panel', () => {
  for (const cls of ['.fp-card', '.fp-btn', '.fp-title', '.fp-muted', '.fp-input',
    '.fm-root', '.fm-top', '.fm-panel', '.fm-bottom', '.lf-list', '.safe-pb']) {
    assert.ok(css.includes(cls), `globals.css must define ${cls}`);
  }
  const feature = read('components', 'FeaturePage.tsx');
  assert.ok((feature.match(/\.fm-root\{/g) || []).length === 0,
    'FeaturePage must not redeclare .fm-* locally');
  assert.match(feature, /\.fp-\* live in globals\.css/);
});

test('No undefined or leaking utility classes', () => {
  const dm = read('components', 'DashboardMobile.tsx');
  assert.match(dm, /\.dm-tool\{/, 'dm-tool must be defined');
  assert.match(dm, /\.dm-emoji\{/, 'dm-emoji must be defined');
  assert.ok(!dm.includes('.chip{'), 'generic .chip must not leak globally');
  assert.ok(dm.includes('.dm-chip{'), 'scoped dm-chip must be used instead');
  const bottom = read('components', 'BottomNav.tsx');
  assert.ok(css.includes('.safe-pb{'), 'safe-pb must exist for BottomNav');
});

test('Signature illustrations are preserved on mobile', () => {
  assert.match(landingMobile, /images\/dash\/hero-chibi\.png/, 'landing must keep the Chibi hero');
  assert.match(landingMobile, /images\/mascot-avatar\.png/, 'landing must keep the mascot');
  assert.match(berandaMobile, /images\/dash\/hero-sameboat\.png/, 'beranda must keep the Same Boat hero');
  const menu = read('components', 'AccountMenu.tsx');
  assert.match(menu, /images\/mascot-avatar\.png/, 'account menu must use the real mascot');
});

test('Tailwind config stays the single source of design tokens', () => {
  const cfg = fs.readFileSync(path.join(web, '..', 'tailwind.config.ts'), 'utf8');
  for (const token of ['primary', 'navy', 'background', 'display', 'body']) {
    assert.ok(cfg.includes(token), `tailwind.config.ts must define ${token}`);
  }
  assert.match(css, /@tailwind base;/);
  assert.match(css, /@tailwind utilities;/);
});
