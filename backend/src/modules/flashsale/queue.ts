import { FlashSaleOrder } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma';

/**
 * Antrean asynchronous untuk pekerjaan yang tidak perlu menahan response HTTP:
 * pembuatan invoice, pengiriman email, sinkronisasi ke sistem lain.
 *
 * BullMQ memakai Redis yang sama, tetapi WAJIB memakai koneksi terpisah dengan
 * `maxRetriesPerRequest: null` (perilaku blocking command).
 */
export const FLASH_SALE_QUEUE = 'flashsale-jobs';

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const flashSaleQueue = new Queue(FLASH_SALE_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: { age: 3_600, count: 1_000 },
    removeOnFail: { age: 24 * 3_600, count: 5_000 },
  },
});

export async function enqueueOrderConfirmed(order: FlashSaleOrder): Promise<void> {
  await flashSaleQueue.add(
    'order.confirmed',
    {
      orderId: order.id,
      userId: order.userId,
      sku: order.sku,
      quantity: order.quantity,
      unitPrice: order.unitPrice.toString(),
    },
    // jobId deterministik => BullMQ menolak duplikat untuk order yang sama.
    { jobId: `order:${order.id}` },
  );
}

export async function closeFlashSaleQueue(): Promise<void> {
  await flashSaleQueue.close();
  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
}

/**
 * Outbox: tandai job invoice sebagai terkirim setelah enqueue berhasil.
 * Jika enqueue gagal, status tetap `pending` dan akan diproses relay berikutnya.
 */
export async function markOutboxSent(orderId: string): Promise<void> {
  await prisma.outbox.updateMany({
    where: { type: 'order.confirmed', orderId, status: 'pending' },
    data: { status: 'sent', updatedAt: new Date() },
  });
}

/**
 * Relay outbox: memindahkan order yang tertunda dari tabel Outbox ke antrean
 * BullMQ. Idempotent karena jobId `order:<orderId>` membuat BullMQ menolak duplikat.
 */
export async function relayPendingOutbox(limit = 20): Promise<number> {
  const pending = await prisma.outbox.findMany({
    where: { type: 'order.confirmed', status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  for (const row of pending) {
    if (!row.orderId) continue;
    try {
      const data = (row.payload ?? {}) as Record<string, unknown>;
      await flashSaleQueue.add(
        'order.confirmed',
        {
          orderId: row.orderId,
          userId: String(data.userId ?? row.orderId),
          sku: String(data.sku ?? ''),
          quantity: Number(data.quantity ?? 1),
          unitPrice: String(data.unitPrice ?? '0'),
        },
        { jobId: `order:${row.orderId}` },
      );
      await markOutboxSent(row.orderId);
      console.log(`[flashsale] relay outbox terkirim untuk order ${row.orderId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[flashsale] relay outbox gagal untuk order ${row.orderId}: ${message}`);
      break;
    }
  }

  return pending.length;
}
