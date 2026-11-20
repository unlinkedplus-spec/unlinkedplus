const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const MIGRATION = join(__dirname, '..', 'prisma', 'migrations',
  '20261121120000_fix_certificate_status_check', 'migration.sql');
const sql = readFileSync(MIGRATION, 'utf8');

test('C4 regression: migration replaces the certificate status CHECK with one accepting ready', () => {
  assert.match(sql, /DROP CONSTRAINT IF EXISTS "certificates_status_check"/);
  assert.match(sql, /ADD CONSTRAINT "certificates_status_check"/);
  // The value the worker writes (ready) must be accepted.
  assert.match(sql, /'ready'/);
  // Legacy 'done' is kept so no existing row can violate the new constraint.
  assert.match(sql, /'done'/);
  for (const status of ['pending', 'processing', 'failed']) {
    assert.ok(sql.includes(`'${status}'`), `migration must accept ${status}`);
  }
});

test('C4 regression: migration is data-preserving (no destructive statements)', () => {
  const normalised = sql.replace(/--.*$/gm, '').toUpperCase();
  for (const forbidden of ['DROP TABLE', 'DELETE FROM', 'TRUNCATE', 'DROP COLUMN']) {
    assert.ok(!normalised.includes(forbidden), `migration must not contain ${forbidden}`);
  }
});

test('C4 regression: the original bad migration is corrected in place for fresh installs', () => {
  // Fresh databases replay every migration in order. The add_indexes migration
  // creates the wrong CHECK, then our migration replaces it — so the final state
  // is correct regardless of which migration baseline was used.
  const original = readFileSync(join(__dirname, '..', 'prisma', 'migrations',
    '20261119000001_add_indexes', 'migration.sql'), 'utf8');
  assert.match(original, /'done'/);
  const index = sql.indexOf('DROP CONSTRAINT IF EXISTS "certificates_status_check"');
  const add = sql.indexOf('ADD CONSTRAINT "certificates_status_check"');
  assert.ok(index >= 0 && add > index, 'DROP must precede ADD');
});
