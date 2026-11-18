export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
}

export function buildRedisOptions(env: NodeJS.ProcessEnv = process.env): RedisConnectionOptions {
  const url = env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  }

  return {
    host: env.REDIS_HOST || 'redis',
    port: Number(env.REDIS_PORT || 6379),
    password: env.REDIS_PASSWORD || undefined,
  };
}
