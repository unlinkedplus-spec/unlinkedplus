const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRootCandidates = [
  path.join(__dirname, '..', '..', '..'), // source repo layout
  path.join(__dirname, '..'),            // synced api_build layout
];
const repoRoot = repoRootCandidates.find((p) => fs.existsSync(path.join(p, 'docker-compose.yml')));
if (!repoRoot) throw new Error('repo root not found');

const base = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
const prod = fs.readFileSync(path.join(repoRoot, 'deploy', 'docker-compose.prod.yml'), 'utf8');
const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');

test('H6/H7/H10 regression: base compose matches the live low-memory stack', () => {
  for (const missing of ['backend/Dockerfile', 'frontend/Dockerfile', 'nginx.conf']) {
    assert.ok(!base.includes(missing), `base compose must not reference missing ${missing}`);
  }
  assert.ok(!base.includes('/readyz'));
  assert.match(base, /\/health/);
  assert.match(base, /migrate:/);
  for (const service of ['postgres:', 'redis:', 'backend:', 'worker:', 'frontend:', 'nginx:']) {
    assert.ok(base.includes(service), `base compose must define ${service}`);
  }
  // Every stateful service has a memory ceiling for 2 GB dev hosts.
  assert.ok((base.match(/mem_limit:/g) || []).length >= 6);
});

test('H7/H10 regression: VPS overlay has real config files and no dead healthcheck', () => {
  assert.ok(!prod.includes('/readyz'));
  assert.ok(!prod.includes('replicas: 3'));
  assert.match(prod, /prometheus\/prometheus\.yml/);
  assert.match(prod, /grafana\/provisioning/);
  for (const rel of [
    'deploy/prometheus/prometheus.yml',
    'deploy/prometheus/alerts.yml',
    'deploy/grafana/provisioning/datasources/prometheus.yml',
  ]) {
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `missing ${rel}`);
  }
});

test('H9/H11 regression: backup and restore scripts exist with safety guards', () => {
  const backup = fs.readFileSync(path.join(repoRoot, 'scripts', 'backup.sh'), 'utf8');
  const restore = fs.readFileSync(path.join(repoRoot, 'scripts', 'restore.sh'), 'utf8');
  const verify = fs.readFileSync(path.join(repoRoot, 'scripts', 'verify-backup.sh'), 'utf8');
  assert.match(backup, /pg_dump/);
  assert.match(backup, /counts-/);
  assert.match(restore, /CONFIRM_RESTORE/);
  assert.match(restore, /TARGET_DB/);
  assert.match(restore, /pg_restore/);
  assert.match(verify, /VERIFY=PASS/);
  assert.ok(!verify.includes('DROP DATABASE IF EXISTS "unlinked"'), 'verification must not drop live DB');
});

test('infra regression: env example targets the live host and documents new settings', () => {
  assert.ok(!envExample.includes('192.168.1.20'));
  assert.match(envExample, /192\.168\.1\.8/);
  for (const key of ['EMAIL_HASH_PEPPER', 'MAIL_DRIVER', 'SCHEDULED_PUBLISH_INTERVAL_MS', 'ADMIN_PASSWORD']) {
    assert.ok(envExample.includes(key), `.env.example must document ${key}`);
  }
});

test('infra regression: public root serves the Next.js landing with one shared identity', () => {
  const nginx = fs.readFileSync(path.join(repoRoot, 'docker', 'host-nginx.conf'), 'utf8');
  const rootBlock = nginx.slice(nginx.indexOf('location / {'));
  assert.match(rootBlock, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.ok(!rootBlock.includes('try_files $uri $uri/ /index.html'), 'root must not fall back to the legacy static landing');
  assert.ok(nginx.includes('location ~ ^/(styles|js|images|fonts)/'), 'legacy static assets must stay reachable');
  assert.ok(nginx.includes('location ^~ /_next/'), 'Next.js assets must keep their own route');
});
