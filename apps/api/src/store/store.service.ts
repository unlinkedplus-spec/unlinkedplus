import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getConfig(): { mode: 'simulation' | 'disabled' } {
    return { mode: this.config.get<string>('PAYMENT_MODE') === 'simulation' ? 'simulation' : 'disabled' };
  }

  async transactions(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return transactions.map((transaction) => this.simulationResult(transaction));
  }

  async purchase(userId: string, itemId: string) {
    this.requireSimulation();
    const transaction = await this.prisma.$transaction(async (tx) => {
      await this.lockBuyer(tx, userId);
      const item = await tx.avatarItem.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Avatar item not found');
      if (item.price < 0) throw new ConflictException('Avatar item has an invalid price');

      const owned = await tx.userInventory.findUnique({
        where: { userId_itemId: { userId, itemId } },
      });
      if (owned) throw new ConflictException('Avatar item is already owned');

      // Reuse an outstanding order so concurrent clicks cannot create duplicate purchases.
      const pending = await tx.transaction.findFirst({
        where: { userId, itemId, paymentStatus: 'pending' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      return pending ?? tx.transaction.create({
        data: { userId, itemId, amount: item.price, paymentStatus: 'pending' },
      });
    });
    return this.simulationResult(transaction);
  }

  async confirm(userId: string, id: string) {
    this.requireSimulation();
    const transaction = await this.prisma.$transaction(async (tx) => {
      await this.lockBuyer(tx, userId);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM transactions WHERE id = ${id} AND user_id = ${userId} FOR UPDATE
      `;
      if (!rows.length) throw new NotFoundException('Transaction not found');
      const order = await tx.transaction.findUniqueOrThrow({ where: { id } });
      if (order.paymentStatus === 'simulated') return order;
      if (order.paymentStatus !== 'pending') {
        throw new ConflictException('Only pending simulation orders can be confirmed');
      }
      if (!order.itemId) throw new ConflictException('Avatar item is no longer available');

      // The buyer lock covers different orders for the same item; the composite key is the final safeguard.
      await tx.userInventory.upsert({
        where: { userId_itemId: { userId, itemId: order.itemId } },
        create: { userId, itemId: order.itemId },
        update: {},
      });
      return tx.transaction.update({
        where: { id },
        data: { paymentStatus: 'simulated' },
      });
    });
    return this.simulationResult(transaction);
  }

  private requireSimulation() {
    if (this.getConfig().mode !== 'simulation') {
      throw new ForbiddenException('Purchases are disabled. Only PAYMENT_MODE=simulation permits a non-payment demo.');
    }
  }

  private async lockBuyer(tx: Prisma.TransactionClient, userId: string) {
    // All purchase paths lock in the same order, including confirmation of distinct orders.
    const users = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users WHERE id = ${userId} FOR UPDATE
    `;
    if (!users.length) throw new UnauthorizedException('User no longer exists');
  }

  private simulationResult(transaction: Transaction) {
    return {
      ...transaction,
      mode: 'simulation' as const,
      qrisPayload: null,
      realPayment: false,
      message: 'Simulation only. No real payment was processed.',
    };
  }
}
