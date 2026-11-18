import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvatarsService {
  constructor(private readonly prisma: PrismaService) {}

  items() {
    return this.prisma.avatarItem.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        itemType: true,
        price: true,
        isPremium: true,
      },
      orderBy: [{ price: 'asc' }, { slug: 'asc' }],
    });
  }
}
