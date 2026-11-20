const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webRoot = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src'),
  path.join(__dirname, '..', '..', 'web_build', 'src'),
].find((p) => fs.existsSync(path.join(p, 'app', 'page.tsx')));
if (!webRoot) throw new Error('web source root not found');

const read = (...parts) => fs.readFileSync(path.join(webRoot, ...parts), 'utf8');
const tailwind = fs.readFileSync(path.join(webRoot, '..', 'tailwind.config.ts'), 'utf8');
const landing = read('app', 'page.tsx');
const appPage = read('app', 'app', 'page.tsx');
const globals = read('app', 'globals.css');
const mascot = read('components', 'BrandMascot.tsx');
const navIcon = read('components', 'NavIcon.tsx');
const feed = read('components', 'FailFeed.tsx');
const reactions = read('components', 'ReactionBar.tsx');
const sponsored = read('components', 'SponsoredPost.tsx');
const trending = read('components', 'TrendingRail.tsx');
const bottomNav = read('components', 'BottomNav.tsx');

test('brand system: navy / sunshine / lavender / cream palette is defined and used', () => {
  for (const key of ['navy:', 'sunshine:', 'lavender:', 'cream:', 'background:']) {
    assert.ok(tailwind.includes(key), `tailwind palette must define ${key}`);
  }
  assert.match(tailwind, /primary:\s*'#F5C542'/);
  assert.match(globals, /background-color:\s*#FFFBF2/);
  assert.match(globals, /\.surface-card/);
});

test('brand system: mascot is the emotional anchor on landing and dashboard', () => {
  assert.match(mascot, /buildAvatarSVG/);
  assert.match(mascot, /Maskot unlinked\+/);
  assert.ok(landing.includes('<BrandMascot'), 'landing hero must use the brand mascot');
  assert.ok(appPage.includes('<BrandMascot'), 'dashboard must use the brand mascot');
  assert.match(landing, /Anti-LinkedIn meets Gen Z Community/);
});

test('brand system: navigation uses modern icons and grouped, tidy sections', () => {
  assert.match(navIcon, /strokeWidth=\{1\.8\}/);
  assert.ok(navIcon.includes('home:') && navIcon.includes('mask:') && navIcon.includes('sparkles:'));
  assert.match(appPage, /group: 'ruang'/);
  assert.match(appPage, /group: 'kamu'/);
  assert.match(appPage, /<NavIcon name=\{item\.icon\}/);
  assert.match(bottomNav, /<NavIcon name=\{tab\.icon\}/);
  assert.ok(!/icon: '🏠'/.test(appPage), 'emoji nav icons must be replaced by SVG icons');
});

test('brand system: feed cards, reactions and ads are expressive but truthful', () => {
  assert.match(feed, /surface-card animate-popin p-5/);
  assert.match(feed, /hashtag\?: string \| null/);
  assert.match(feed, /\{loggedIn && \(/); // Gate 1 regression stays intact
  assert.ok(!feed.includes('post.userId'), 'public feed must stay free of internal ids');
  assert.match(reactions, /aria-pressed=\{mine\[r\.key\]\}/);
  assert.match(reactions, /active:scale-95/);
  assert.ok(sponsored.includes('Iklan'), 'ad slot must carry a visible Iklan label');
  assert.match(sponsored, /Sponsored/);
  assert.ok(!sponsored.includes('<button'), 'ad slot must not offer a fake action');
});

test('brand system: trending topics are wired to a real feed filter', () => {
  assert.match(trending, /onSelect: \(keyword: string\) => void/);
  assert.match(trending, /TRENDING_TOPICS/);
  assert.match(appPage, /const \[trendingTag, setTrendingTag\] = useState\(''\)/);
  assert.match(appPage, /<TrendingRail active=\{trendingTag\} onSelect=\{setTrendingTag\} \/>/);
  assert.match(feed, /post\.category\.toLowerCase\(\)\.includes\(keyword\)/);
  assert.match(feed, /onClearHashtag/);
});

test('brand system: protected taglines remain and forbidden naming is absent', () => {
  assert.ok(landing.includes('Less Flex. More Human.'));
  assert.ok(landing.includes('Memutus yang Toksik'));
  assert.ok(landing.includes('Menambah yang Esensial'));
  assert.ok(appPage.includes('Less Flex. More Human.'));
  assert.ok(appPage.includes('Memutus yang Toksik + Menambah yang Esensial'));
  const sources = [landing, appPage, mascot, feed, sponsored, trending, reactions, bottomNav, tailwind, globals].join('\n');
  assert.ok(!/SambatIn|Sambat/.test(sources), 'legacy brand naming must stay removed');
});
