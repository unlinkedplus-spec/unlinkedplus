const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('certificate worker does not depend on sharp native binary', () => {
  const source = fs.readFileSync(path.join(root, 'src/worker/certificate.processor.ts'), 'utf8');
  assert.doesNotMatch(source, /from ['"]sharp['"]|require\(['"]sharp['"]\)/);
  assert.match(source, /@resvg\/resvg-js/);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.sharp, undefined);
  assert.ok(pkg.dependencies['@resvg/resvg-js']);
});

test('certificate worker entry keeps the process alive after bootstrap', () => {
  const source = fs.readFileSync(path.join(root, 'src/worker/worker.ts'), 'utf8');
  // A bare `void bootstrap()` with no error exit can terminate with code 0 on
  // native-addon failures, producing a silent restart loop. Startup errors must
  // set a failure exit code.
  assert.match(source, /process\.exitCode\s*=\s*1/);
});
