import 'dotenv/config';
import { prisma } from './lib/prisma';
import { aiWorker } from './services/aiWorker';
import { startAutomationScheduler } from './services/automationRunner';
import { closeFlashSaleWorker } from './modules/flashsale/invoiceWorker';
import { relayPendingOutbox } from './modules/flashsale/queue';

console.log('AI worker started, waiting for jobs...');
const automationTimer = startAutomationScheduler();
const relayTimer = setInterval(() => void relayPendingOutbox(), 30_000);
relayTimer.unref?.();

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down worker`);
  clearInterval(automationTimer);
  clearInterval(relayTimer);
  await Promise.allSettled([aiWorker.close(), closeFlashSaleWorker()]);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
