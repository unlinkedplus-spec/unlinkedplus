const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPagePaths = [
  path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src', 'app', 'app', 'AppClient.tsx'),
  path.join(__dirname, '..', '..', 'web_build', 'src', 'app', 'app', 'AppClient.tsx'),
];
const appPagePath = appPagePaths.find((p) => fs.existsSync(p));
if (!appPagePath) throw new Error('app page not found');

test('H5 regression: reset token is removed from browser history after consumption', () => {
  const source = fs.readFileSync(appPagePath, 'utf8');
  assert.match(source, /searchParams\.delete\('reset'\)/);
  assert.match(source, /history\.replaceState/);
});

test('H5 regression: mail diagnostics never print reset links', () => {
  const mail = fs.readFileSync(path.join(__dirname, '..', 'src', 'mail', 'mail.service.ts'), 'utf8');
  const logLines = mail.split('\n').filter((line) => /logger\.(warn|error|log)/.test(line));
  assert.ok(!logLines.some((line) => line.includes('input.resetUrl')), 'reset URL must not be logged');
  assert.match(mail, /tautan tidak dicetak/);
});
