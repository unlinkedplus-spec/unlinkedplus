const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const FEED_CANDIDATES = [
  path.join(__dirname, '..', '..', '..', 'js', 'feed.js'), // source repo layout
  path.join(__dirname, '..', 'js', 'feed.js'),            // synced api_build layout
];
const FEED = FEED_CANDIDATES.find((p) => fs.existsSync(p));
if (!FEED) throw new Error('feed.js not found in: ' + FEED_CANDIDATES.join(', '));

function renderMaliciousPost(post) {
  const container = { innerHTML: '', insertAdjacentHTML(_pos, html) { this.innerHTML += html; } };

  const sandbox = {
    window: { AvatarBuilder: { getAvatarSVG: () => '<circle/>' } },
    Reactions: {
      getReactions: () => ({ pukpuk: 0, ngakak: 0, sama: 0, myReactions: {} }),
      getLevel: () => ({ level: 1, color: '#fff', name: 'Pemula' }),
    },
    localStorage: {
      getItem: (key) => key === 'unlinkedplus_posts' ? JSON.stringify([post]) : null,
      setItem: () => {},
    },
    document: { getElementById: (id) => id === 'feed-container' ? container : null },
    Date,
    JSON,
    String,
    Math,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(FEED, 'utf8'), sandbox, { filename: 'feed.js' });
  sandbox.window.Feed.init();
  return container.innerHTML;
}

test('feed.js escapes user-controlled post fields before inserting HTML', () => {
  const html = renderMaliciousPost({
    id: 'p1" onmouseover="alert(1)',
    username: '<img src=x onerror=alert(1)>',
    category: '<script>alert(2)</script>',
    text: '<script>alert(3)</script> & aman',
    timestamp: Date.now(),
  });

  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(!html.includes('onmouseover="alert(1)"'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&amp; aman'));
});
