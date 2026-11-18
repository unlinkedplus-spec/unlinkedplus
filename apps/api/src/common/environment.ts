export function validateEnvironment(env: Record<string, unknown>) {
  for (const name of ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'FRONTEND_URL', 'STORAGE_PATH']) {
    if (typeof env[name] !== 'string' || !env[name]) throw new Error(`${name} wajib diisi`);
  }
  const secret = String(env.JWT_SECRET);
  if (secret.length < 48 || /changeme|example/i.test(secret)) throw new Error('JWT_SECRET harus acak, minimal 48 karakter');
  const origin = new URL(String(env.FRONTEND_URL));
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL harus berupa origin tanpa trailing slash');
  }
  if (!['true', 'false'].includes(String(env.COOKIE_SECURE))) throw new Error('COOKIE_SECURE harus true atau false');
  if (origin.protocol === 'https:' && env.COOKIE_SECURE !== 'true') throw new Error('HTTPS memerlukan secure cookie');
  if (env.PAYMENT_MODE && !['disabled', 'simulation'].includes(String(env.PAYMENT_MODE))) throw new Error('PAYMENT_MODE hanya disabled atau simulation');
  return env;
}
