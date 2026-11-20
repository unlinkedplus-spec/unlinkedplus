const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = [
  path.join(__dirname, '..', '..', '..'),
  path.join(__dirname, '..'),
].find((p) => fs.existsSync(path.join(p, 'index.html')));
if (!repoRoot) throw new Error('landing source not found');

const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const cssPath = [
  path.join(repoRoot, 'styles', 'public-landing.css'),
  path.join(repoRoot, 'public-landing.css'),
].find((p) => fs.existsSync(p));
if (!cssPath) throw new Error('public landing stylesheet not found');
const css = fs.readFileSync(cssPath, 'utf8');

test('landing mockup: exact hero copy and CTA labels', () => {
  for (const phrase of [
    'Tempatnya', 'Orang-Orang Jujur', 'soal <span>Hidup.</span>',
    'Memutus yang Toksik, Menambah yang Esensial',
    'Spill cerita, temukan teman senasib,',
    'dan tumbuh bersama di <b>unlinked+</b>.',
    'Gabung Sekarang', 'Lihat Preview',
    'Hidup bukan<br/>soal terlihat sukses,<br/>tapi tetap waras.',
    'Less Flex, More Human.',
  ]) {
    assert.ok(html.includes(phrase), `landing must contain: ${phrase}`);
  }
});

test('landing mockup: why-strip and feature cards are complete', () => {
  for (const phrase of [
    'Kenapa', 'unlinked+?',
    'Spill Without', 'Judgment', 'Bercerita tanpa', 'takut dihakimi',
    'Same Boat', 'Temukan yang', 'senasib',
    'Mental Armor', 'Apresiasi proses,', 'bukan hasil',
    'Comeback Journey', 'Bangkit pelan-pelan,', 'bareng komunitas',
    'Avatar &amp; Store', 'Ekspresikan diri', 'dengan gaya!',
    'Lebih dari', 'Sekadar Sosial Media',
    'Jelajahi Fitur',
    'Unlinked Rooms', 'Support Circles', 'Dear Future Me',
    'Tiny Wins', 'Hall of Almost', 'Mental Reset',
    'Bergabunglah dengan', 'komunitas yang positif!',
    'Karena kamu tidak sendirian.',
    '120K+', '2.5M+', '87%',
  ]) {
    assert.ok(html.includes(phrase), `landing must contain: ${phrase}`);
  }
});

test('landing mockup: palette and old dashboard are gone', () => {
  for (const token of ['#172B4D', '#F5C542', '#F1EEFF', '#FFF9EC', '#EFEAF8']) {
    assert.ok(css.includes(token), `palette must include ${token}`);
  }
  assert.match(html, /styles\/public-landing\.css/);
  assert.ok(!html.includes('Feed Gagal'), 'landing must not reuse the old dashboard mockup');
  assert.ok(!html.includes('Tren Hari Ini'), 'landing must not reuse the old dashboard mockup');
  assert.ok(!html.includes('KARIER BOLEH BERANTAKAN'), 'old hero must be replaced by the new mockup');
});

test('landing mockup: CTA links are real, not dead buttons', () => {
  assert.ok(html.includes('href="/app"'), 'join CTA must go to the dashboard');
  assert.ok(html.includes('href="/app?tab=spill"'), 'preview CTA must go to the spill composer');
  assert.ok(!/<button\b/.test(html), 'landing must not contain dead buttons');
});
