import { FlashSaleItem, FlashSaleOrder } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { prismaReplica } from '../../lib/prismaReplica';
import { redis } from '../../lib/redis';
import { cached, invalidate } from '../../lib/cache';
import { flashSaleOrdersTotal, cacheEvents } from '../../lib/metrics';
import { enqueueOrderConfirmed, markOutboxSent } from './queue';

/**
 * Modul flash sale: contoh nyata penanganan high-concurrency + race condition.
 *
 * Sumber kebenaran stok = PostgreSQL. Redis adalah gerbang cepat untuk menahan
 * lonjakan (mengurangi beban DB), bukan pengganti transaksi DB.
 *
 * Alur satu reservasi:
 *   1. Cek idempotency key  -> request ulang tidak membuat order ganda.
 *   2. Reserve atomik di Redis (Lua DECRBY bersyarat) -> tolak cepat saat habis.
 *   3. Transaksi DB: UPDATE ... WHERE availableStock >= qty (atomik, anti oversell).
 *   4. Enqueue job invoice/email (asinkron, tidak menahan response).
 *   5. Jika langkah 3 gagal, kembalikan stok Redis (kompensasi).
 */

const STOCK_TTL_SECONDS = 3_600;
const ITEMS_CACHE_KEY = 'fs:items:v1';

const RESERVE_LUA = `
local current = redis.call('GET', KEYS[1])
if not current then return -2 end
local stock = tonumber(current)
local qty = tonumber(ARGV[1])
if stock < qty then return -1 end
return redis.call('DECRBY', KEYS[1], qty)
`;

const COMPENSATE_LUA = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return redis.call('INCRBY', KEYS[1], ARGV[1])
end
return -1
`;

export type FlashSaleOrderView = {
  id: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  status: string;
  createdAt: string;
};

export type FlashSaleItemView = {
  sku: string;
  name: string;
  price: string;
  totalStock: number;
  availableStock: number;
};

export class FlashSaleError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'FlashSaleError';
  }
}

function stockKey(sku: string): string {
  return `fs:stock:${sku}`;
}

function toView(order: FlashSaleOrder): FlashSaleOrderView {
  return {
    id: order.id,
    sku: order.sku,
    quantity: order.quantity,
    unitPrice: order.unitPrice.toString(),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
}

function toItemView(item: FlashSaleItem): FlashSaleItemView {
  return {
    sku: item.sku,
    name: item.name,
    price: item.price.toString(),
    totalStock: item.totalStock,
    availableStock: item.availableStock,
  };
}

/**
 * Daftar item memakai Cache-Aside + stale-while-revalidate.
 * TTL pendek karena stok berubah cepat; read replica dipakai untuk mengurangi
 * beban primary.
 */
export async function listItems(): Promise<FlashSaleItemView[]> {
  return cached(
    ITEMS_CACHE_KEY,
    { ttlSeconds: 10, staleSeconds: 20, negativeTtlSeconds: 5 },
    async () => {
      const items = await prismaReplica.flashSaleItem.findMany({
        where: { active: true },
        orderBy: { sku: 'asc' },
        take: 100,
      });
      return items.map(toItemView);
    },
  );
}

async function seedStock(item: Pick<FlashSaleItem, 'sku' | 'availableStock'>, force = false): Promise<void> {
  const value = String(Math.max(0, item.availableStock));
  try {
    if (force) {
      await redis.set(stockKey(item.sku), value, 'EX', STOCK_TTL_SECONDS);
    } else {
      await redis.set(stockKey(item.sku), value, 'EX', STOCK_TTL_SECONDS, 'NX');
    }
  } catch (err) {
    cacheEvents.inc({ result: 'error' });
    console.error('[flashsale] gagal seed stok Redis:', (err as Error).message);
  }
}

async function reserveInRedis(sku: string, quantity: number): Promise<number> {
  return Number(await redis.eval(RESERVE_LUA, 1, stockKey(sku), String(quantity)));
}

async function compensateRedis(sku: string, quantity: number): Promise<void> {
  try {
    await redis.eval(COMPENSATE_LUA, 1, stockKey(sku), String(quantity));
  } catch (err) {
    // Tidak fatal: TTL 1 jam membatasi drift, dan DB tetap sumber kebenaran.
    console.error('[flashsale] kompensasi Redis gagal:', (err as Error).message);
  }
}

/** Sinkronkan ulang stok Redis dari DB (dipakai saat terdeteksi drift). */
export async function resyncStock(sku: string): Promise<void> {
  const item = await prisma.flashSaleItem.findUnique({ where: { sku } });
  if (!item) return;
  await seedStock(item, true);
  await invalidate(ITEMS_CACHE_KEY);
}

/**
 * Reservasi stok yang aman terhadap:
 * - oversell (Redis Lua + conditional UPDATE + CHECK constraint di DB)
 * - duplikasi request (idempotency key unik)
 * - cache/Redis down (fallback langsung ke DB)
 */
export async function reserve(input: {
  userId: string;
  sku: string;
  quantity: number;
  idempotencyKey: string;
}): Promise<{ order: FlashSaleOrderView; remaining: number | null; replayed: boolean }> {
  const { userId, sku, quantity, idempotencyKey } = input;

  // 1. Idempotensi: request dengan key sama selalu mengembalikan order yang sama.
  const existing = await prisma.flashSaleOrder.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return { order: toView(existing), remaining: null, replayed: true };
  }

  const item = await prisma.flashSaleItem.findUnique({ where: { sku } });
  if (!item || !item.active) {
    throw new FlashSaleError('Item tidak ditemukan', 404, 'NOT_FOUND');
  }
  if (item.availableStock < quantity) {
    await seedStock(item, true);
    throw new FlashSaleError('Stok habis', 409, 'SOLD_OUT');
  }

  // 2. Gerbang Redis. Jika Redis error, lanjut ke DB (fail-open, tetap aman).
  let remaining: number | null = null;
  try {
    await seedStock(item);
    let result = await reserveInRedis(sku, quantity);
    if (result === -2) {
      await seedStock(item, true);
      result = await reserveInRedis(sku, quantity);
    }
    if (result < 0) {
      flashSaleOrdersTotal.inc({ result: 'sold_out' });
      throw new FlashSaleError('Stok habis', 409, 'SOLD_OUT');
    }
    remaining = result;
  } catch (err) {
    if (err instanceof FlashSaleError) throw err;
    cacheEvents.inc({ result: 'error' });
    console.error('[flashsale] Redis gate tidak tersedia, fallback ke DB:', (err as Error).message);
    remaining = null;
  }

  // 3. Transaksi DB: conditional UPDATE = atomik, tidak bisa oversell.
  try {
    const order = await prisma.$transaction(async tx => {
      const updated = await tx.flashSaleItem.updateMany({
        where: { sku, active: true, availableStock: { gte: quantity } },
        data: { availableStock: { decrement: quantity }, version: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw new FlashSaleError('Stok habis', 409, 'SOLD_OUT');
      }
      const created = await tx.flashSaleOrder.create({
        data: {
          idempotencyKey,
          userId,
          itemId: item.id,
          sku,
          quantity,
          unitPrice: item.price,
          status: 'reserved',
        },
      });

      // Outbox: job invoice tetap ter-catat walau enqueue berikutnya gagal.
      // Relay akan memindahkannya ke antrean saat ada retry/gagal.
      await tx.outbox.create({
        data: {
          type: 'order.confirmed',
          status: 'pending',
          orderId: created.id,
          payload: {
            orderId: created.id,
            userId,
            sku,
            quantity,
            unitPrice: created.unitPrice.toString(),
          },
        },
      });

      return created;
    });

    try {
      await invalidate(ITEMS_CACHE_KEY);
    } catch {
      /* cache akan kedaluwarsa sendiri */
    }

    // 4. Pekerjaan berat/lamat -> antrean via relay dari tabel Outbox
    //    (commit order tetap sah; job tidak hilang bila relay berikutnya jalan).
    try {
      await enqueueOrderConfirmed(order);
      await markOutboxSent(order.id);
    } catch (err) {
      // Job dipertahankan di Outbox (status pending) untuk relay berikutnya.
      console.error('[flashsale] gagal enqueue invoice:', (err as Error).message);
    }

    flashSaleOrdersTotal.inc({ result: 'accepted' });
    return { order: toView(order), remaining, replayed: false };
  } catch (err) {
    // 5. Kompensasi stok Redis karena transaksi DB gagal.
    await compensateRedis(sku, quantity);

    const prismaCode = (err as any)?.code;
    if (prismaCode === 'P2002') {
      // Balapan idempotency: request paralel dengan key sama sudah menang.
      const replay = await prisma.flashSaleOrder.findUnique({ where: { idempotencyKey } });
      if (replay) {
        return { order: toView(replay), remaining: null, replayed: true };
      }
    }

    if (err instanceof FlashSaleError) {
      if (err.code === 'SOLD_OUT') {
        flashSaleOrdersTotal.inc({ result: 'sold_out' });
        await resyncStock(sku);
      }
      throw err;
    }

    console.error('[flashsale] transaksi gagal:', (err as Error).message);
    throw err;
  }
}

export async function listUserOrders(userId: string, take = 50): Promise<FlashSaleOrderView[]> {
  const orders = await prisma.flashSaleOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return orders.map(toView);
}
