import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Certificate } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateQueue } from './certificate.queue';
import { certificateFilePath } from './certificate-storage';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queue: CertificateQueue,
  ) {}

  async create(userId: string, postId: string) {
    const certificate = await this.prisma.$transaction(async (tx) => {
      // The schema permits multiple certificates per post, so lock the parent before checking/creating.
      const posts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM posts WHERE id = ${postId} AND user_id = ${userId} AND status = 'active' FOR UPDATE
      `;
      if (!posts.length) throw new NotFoundException('Active post not found');
      const existing = await tx.certificate.findFirst({
        where: { postId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (existing?.status === 'ready' || existing?.status === 'pending') return existing;
      if (existing) {
        return tx.certificate.update({
          where: { id: existing.id },
          data: { status: 'pending', imagePath: null },
        });
      }
      return tx.certificate.create({ data: { postId, status: 'pending' } });
    });

    if (certificate.status === 'pending') {
      try {
        // Enqueue only after commit so a fast worker cannot observe a missing certificate.
        await this.queue.enqueue({ certificateId: certificate.id, postId, userId });
      } catch {
        await this.prisma.certificate.updateMany({
          where: { id: certificate.id, status: 'pending' },
          data: { status: 'failed', imagePath: null },
        });
        throw new ServiceUnavailableException('Certificate queue unavailable. Retry this post to resume generation.');
      }
    }
    return this.get(userId, certificate.id);
  }

  async get(userId: string, id: string) {
    return this.metadata(await this.findOwnedActive(userId, id));
  }

  async download(userId: string, id: string) {
    const certificate = await this.findOwnedActive(userId, id);
    if (certificate.status !== 'ready' || !certificate.imagePath) {
      throw new ConflictException('Certificate is not ready');
    }
    let contents: Buffer;
    try {
      const file = certificateFilePath(this.config.get<string>('STORAGE_PATH'), id, certificate.imagePath);
      contents = await readFile(file);
    } catch {
      // Missing local output is recoverable through the same POST endpoint, not an arbitrary path fallback.
      await this.prisma.certificate.updateMany({
        where: { id, status: 'ready', imagePath: certificate.imagePath },
        data: { status: 'failed', imagePath: null },
      });
      throw new ServiceUnavailableException('Certificate file unavailable. Request this post again to regenerate it.');
    }
    // A hide/delete during disk I/O must not turn a previously authorized lookup into a stale download.
    await this.findOwnedActive(userId, id);
    return new StreamableFile(contents, {
      type: 'image/png',
      disposition: `attachment; filename="unlinked-certificate-${id}.png"`,
      length: contents.length,
    });
  }

  private async findOwnedActive(userId: string, id: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, post: { userId, status: 'active' } },
    });
    if (!certificate) throw new NotFoundException('Certificate not found');
    return certificate;
  }

  private metadata(certificate: Certificate) {
    return {
      id: certificate.id,
      status: certificate.status,
      createdAt: certificate.createdAt,
      downloadUrl: certificate.status === 'ready' ? `/api/certificates/${certificate.id}/download` : null,
    };
  }
}
