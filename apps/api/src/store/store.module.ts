import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
