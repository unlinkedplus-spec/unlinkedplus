const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webSrc = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'components', 'DashboardPixel.tsx')));
if (!webSrc) throw new Error('web source not found');
const read = (...parts) => fs.readFileSync(path.join(webSrc, ...parts), 'utf8');
const dash = read('components', 'DashboardPixel.tsx');
const feature = read('components', 'FeaturePage.tsx');
const route = read('app', 'features', '[slug]', 'page.tsx');

test('Fitur Seru: all six entries navigate to real feature pages', () => {
  for (const slug of ['poll', 'personality-test', 'meme-studio', 'store', 'opportunity-board', 'mental-reset']) {
    assert.ok(dash.includes(`['${slug}',`), `Beranda must link ${slug}`);
    assert.ok(feature.includes(`'${slug}'`), `FeaturePage must define ${slug}`);
    assert.ok(route.includes(`'${slug}'`), `route must allow ${slug}`);
  }
  assert.match(dash, /href=\{`\/features\/\$\{slug\}`\}/);
});

test('Spill, Toko, Avatar and Profil use the same mockup chrome', () => {
  for (const slug of ['spill', 'toko', 'avatar', 'profil']) {
    assert.ok(feature.includes(`'${slug}'`), `FeaturePage must define ${slug}`);
    assert.ok(route.includes(`'${slug}'`), `route must allow ${slug}`);
    assert.ok(dash.includes(`/features/${slug}`), `Beranda must link /features/${slug}`);
  }
  assert.match(feature, /import CreatePost from '\.\/CreatePost'/);
  assert.match(feature, /import AvatarBuilder from '\.\/AvatarBuilder'/);
  assert.match(feature, /import ProfileTab from '\.\/ProfileTab'/);
  assert.match(feature, /<CreatePost/);
  assert.match(feature, /<AvatarBuilder/);
  assert.match(feature, /<ProfileTab/);
});

test('Fitur Seru: backend-backed features use real APIs, not fake success', () => {
  assert.match(feature, /<PollCard/);
  assert.match(feature, /<ShopModal/);
  assert.match(feature, /from '\.\/PollCard'/);
  assert.match(feature, /from '\.\/ShopModal'/);
  assert.ok(feature.includes('Pembayaran masih simulasi'), 'store must stay truthful about simulated payment');
});

test('Fitur Seru: local-only features are honest and functional', () => {
  assert.match(feature, /function PersonalityTest/);
  assert.match(feature, /function MemeStudio/);
  assert.match(feature, /function MentalReset/);
  assert.ok(feature.includes('bukan tes psikologi'), 'quiz must not claim to be a diagnosis');
  assert.ok(feature.includes('bukan penanganan medis'), 'breathing tool must not claim medical treatment');
  assert.match(feature, /URL\.createObjectURL/);
  assert.match(feature, /setInterval/);
  assert.ok(feature.includes('Belum ada lowongan terverifikasi'), 'opportunity board must not show fake listings');
});

test('Fitur Seru: pages keep the mockup chrome', () => {
  assert.match(feature, /chrome-top\.png/);
  assert.match(feature, /chrome-side\.png/);
  assert.match(feature, /\/images\/dash\/chrome-top\.png/);
  assert.match(feature, /\/images\/dash\/chrome-side\.png/);
  const pub = path.join(webSrc, '..', 'public', 'images', 'dash');
  for (const asset of ['chrome-top.png', 'chrome-side.png']) {
    assert.ok(fs.existsSync(path.join(pub, asset)), `${asset} must be bundled`);
  }
});
