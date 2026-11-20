import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordResetMail {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(input: PasswordResetMail): Promise<void> {
    const driver = String(this.config.get('MAIL_DRIVER') ?? 'disabled');
    const subject = 'Reset kata sandi unlinked+';
    const text = [
      'Ada permintaan reset kata sandi untuk akun unlinked+ kamu.',
      '',
      `Buka tautan ini dalam ${input.expiresInMinutes} menit:`,
      input.resetUrl,
      '',
      'Kalau kamu tidak meminta ini, abaikan email ini.',
    ].join('\n');
    const html = `<p>Ada permintaan reset kata sandi untuk akun unlinked+ kamu.</p>
      <p>Buka tautan ini dalam ${input.expiresInMinutes} menit:<br/>
      <a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>Kalau kamu tidak meminta ini, abaikan email ini.</p>`;

    if (driver === 'disabled') {
      this.logger.warn('MAIL_DRIVER=disabled — email reset tidak dikirim. Gunakan kode pemulihan.');
      return;
    }

    if (driver === 'console') {
      this.logger.warn(`[MAIL:console] ${subject} → ${input.to}: ${input.resetUrl}`);
      return;
    }

    const url = this.config.get<string>('MAIL_WEBHOOK_URL');
    if (!url) throw new ServiceUnavailableException('MAIL_WEBHOOK_URL belum dikonfigurasi');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.config.get<string>('MAIL_WEBHOOK_TOKEN');
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: input.to,
          subject,
          text,
          html,
          resetUrl: input.resetUrl,
          from: this.config.get<string>('MAIL_FROM') ?? 'unlinked+ <noreply@unlinkedplus.local>',
        }),
      });
      if (!response.ok) throw new Error(`webhook status ${response.status}`);
    } catch (error) {
      this.logger.error(`Gagal mengirim email reset: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('Email reset belum bisa dikirim. Coba lagi nanti.');
    }
  }
}
