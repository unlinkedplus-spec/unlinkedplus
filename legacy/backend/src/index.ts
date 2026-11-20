import 'dotenv/config';
import 'express-async-errors';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import contentRouter from './routes/content';
import videoRouter from './routes/video';
import affiliateRouter from './routes/affiliate';
import advertiserRouter from './routes/advertiser';
import teamRouter from './routes/team';
import workflowRouter from './routes/workflow';
import automationRouter from './routes/automation';
import subscriptionRouter from './routes/subscription';
import walletRouter from './routes/wallet';
import adminRouter from './routes/admin';
import flashSaleRouter from './modules/flashsale/routes';
import { prisma } from './lib/prisma';
import { isRedisReady, closeRedis } from './lib/redis';
import { httpMetrics, metricsHandler } from './lib/metrics';
import { rateLimit } from './lib/rateLimit';
import { requestContext } from './middleware/requestContext';
import { closeFlashSaleQueue } from './modules/flashsale/queue';

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
// Wajib di belakang Nginx/Load Balancer agar req.ip memakai X-Forwarded-For.
// Jangan set > 1 jika tidak ada proxy tepercaya (bisa dipalsukan klien).
const trustProxy = Number(process.env.TRUST_PROXY);
app.set('trust proxy', Number.isFinite(trustProxy) && trustProxy >= 0 ? trustProxy : 1);

app.use(requestContext);
app.use(httpMetrics);

// Limiter global per IP: menahan flood/bot sebelum body di-parse.
app.use(
  rateLimit({
    name: 'global',
    limit: Number(process.env.RATE_LIMIT_GLOBAL_PER_MIN || 600),
    windowMs: 60_000,
    failOpen: true,
    skip: req =>
      req.path === '/health' ||
      req.path === '/readyz' ||
      req.path === '/metrics',
  }),
);

const allowedOrigins = process.env.WEB_ORIGIN
  ? process.env.WEB_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : null;
if (allowedOrigins) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
} else {
  app.use(cors());
}
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// Liveness: murah, tanpa dependency. Dipakai load balancer untuk restart pod.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness: jika dependency mati, pod dikeluarkan dari rotasi LB tanpa dibunuh.
app.get('/readyz', async (_req, res) => {
  const checks = { database: false, redis: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }
  checks.redis = isRedisReady();

  const ready = checks.database;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
});

// Metrik Prometheus. Di production, jangan diekspos ke publik (diblokir Nginx).
app.get('/metrics', metricsHandler);

// Limiter lebih ketat untuk endpoint autentikasi (brute force / credential stuffing).
app.use(
  '/api/v1/auth',
  rateLimit({
    name: 'auth',
    limit: Number(process.env.RATE_LIMIT_AUTH_PER_MIN || 30),
    windowMs: 60_000,
    failOpen: true,
  }),
);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/video', videoRouter);
app.use('/api/v1/affiliate', affiliateRouter);
app.use('/api/v1/advertiser', advertiserRouter);
app.use('/api/v1/team', teamRouter);
app.use('/api/v1/workflow', workflowRouter);
app.use('/api/v1/automation', automationRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/admin', adminRouter);

// Modul contoh high-concurrency. Bisa dimatikan via ENABLE_FLASHSALE_DEMO=false.
if (process.env.ENABLE_FLASHSALE_DEMO !== 'false') {
  app.use('/api/v1/flashsale', flashSaleRouter);
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body JSON tidak valid' });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Data sudah ada (duplikat)' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Data tidak ditemukan' });
  }
  if (err?.code === 'P2003') {
    return res.status(400).json({ error: 'Relasi data tidak valid' });
  }
  const status = Number(err?.status) || 500;
  if (status >= 500) {
    console.error('Unhandled error:', err);
    return res.status(status).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: err.message || 'Permintaan gagal' });
});

const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

// Samakan dengan idle timeout Nginx agar koneksi keep-alive tidak diputus mendadak.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] menerima ${signal}, menutup koneksi...`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] timeout, keluar paksa');
    process.exit(1);
  }, 25_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await closeFlashSaleQueue();
    } catch (err) {
      console.error('[shutdown] queue:', (err as Error).message);
    }
    try {
      await prisma.$disconnect();
    } catch {
      /* ignore */
    }
    await closeRedis();
    clearTimeout(forceExit);
    process.exit(0);
  });

  // Hentikan koneksi idle segera supaya shutdown cepat saat rolling deploy.
  (server as any).closeIdleConnections?.();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
