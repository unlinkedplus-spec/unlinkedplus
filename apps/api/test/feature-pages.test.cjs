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

test('UI/UX: desktop keeps pixel fidelity while mobile uses a readable layout', () => {
  assert.ok(fs.existsSync(path.join(webSrc, 'components', 'DashboardMobile.tsx')));
  const mobile = read('components', 'DashboardMobile.tsx');
  assert.match(dash, /import DashboardMobile from '\.\/DashboardMobile'/);
  assert.match(dash, /window\.innerWidth < 900/);
  assert.match(dash, /if \(mobile\) return <DashboardMobile/);
  assert.match(mobile, /dm-bottom/);
  assert.match(mobile, /position:fixed;bottom:0/);
  assert.match(mobile, /dm-hero/);
  assert.match(mobile, /dm-spill/);
  assert.match(mobile, /createPost\(/);
  assert.match(mobile, /toggleReaction\(/);
  assert.match(feature, /chrome-top\.png/);
});

test('UI/UX: feature pages also switch to a mobile layout', () => {
  assert.match(feature, /const \[mobile, setMobile\] = useState\(false\)/);
  assert.match(feature, /window\.innerWidth < 900/);
  assert.match(feature, /if \(mobile\)/);
  assert.match(feature, /fm-bottom/);
  assert.match(feature, /position:fixed;bottom:0/);
});

test('UI/UX: composer overlays are real and do not duplicate the mockup button', () => {
  assert.match(dash, /background:transparent;color:transparent;font-size:0/);
  assert.match(dash, /left:1040px;top:525px;width:118px;height:48px/);
  assert.match(dash, /href="\/features\/meme-studio"/);
  assert.match(dash, /href="\/features\/poll"/);
  assert.match(dash, /setEmojiOpen\(!emojiOpen\)/);
  assert.match(dash, /Lampiran video belum tersedia/);
  assert.doesNotMatch(dash, /\.px-spill\{[^}]*background:#F5C542/);
});

test('Landing feature cards route to their matching functional pages', () => {
  const dash = fs.readFileSync(path.join(webSrc, 'components', 'ExactMockup.tsx'), 'utf8');
  const route = read('app', 'features', '[slug]', 'page.tsx');
  for (const slug of ['unlinked-rooms', 'support-circles', 'dear-future-me', 'tiny-wins', 'hall-of-almost']) {
    assert.ok(dash.includes(`/features/${slug}`), `card must link ${slug}`);
    assert.ok(route.includes(`'${slug}'`), `route must allow ${slug}`);
  }
  const landing = fs.readFileSync(path.join(webSrc, 'components', 'LandingFeaturePage.tsx'), 'utf8');
  assert.match(landing, /function GroupList/);
  assert.match(landing, /function FutureMe/);
  assert.match(landing, /function TinyWins/);
  assert.match(landing, /function Hall/);
  assert.match(landing, /function Breathing/);
  assert.match(landing, /unlinkedplus_/);
  assert.match(landing, /localStorage/);
  assert.ok(landing.includes('bukan penanganan medis'));
});

test('Four official pillars are first-class functional pages', () => {
  const route = read('app', 'features', '[slug]', 'page.tsx');
  const dash = fs.readFileSync(path.join(webSrc, 'components', 'ExactMockup.tsx'), 'utf8');
  for (const slug of ['spill', 'same-boat', 'mental-armor', 'comeback-journey']) {
    assert.ok(route.includes(`'${slug}'`), `route must allow ${slug}`);
    assert.ok(dash.includes(`/features/${slug}`), `landing strip must link ${slug}`);
  }
  const landing = fs.readFileSync(path.join(webSrc, 'components', 'LandingFeaturePage.tsx'), 'utf8');
  assert.match(landing, /function SameBoat/);
  assert.match(landing, /function MentalArmor/);
  assert.match(landing, /function ComebackJourney/);
  assert.match(landing, /getPosts\(/);
  assert.match(landing, /getMyStats\(/);
  assert.match(landing, /unlinkedplus_comeback/);
  assert.ok(landing.includes('bukan skor kesehatan mental'));
  assert.ok(landing.includes('Tidak ada peringkat publik'));
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
