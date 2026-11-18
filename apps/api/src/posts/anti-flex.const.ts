import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export const BANNED_PHRASES = [
  'alhamdulillah diterima',
  'gaji dua digit',
  'promosi jabatan',
  'bangga mengumumkan',
  'humbled and honored',
  'excited to share',
  'happy to announce',
  'excited to announce',
  'thrilled to share',
  'bersyukur diterima',
  'naik jabatan',
  'diterima kerja',
] as const;

function normalizePhrase(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function containsFlexPhrase(content: string): boolean {
  const normalized = ` ${normalizePhrase(content)} `;
  return BANNED_PHRASES.some((phrase) => normalized.includes(` ${phrase} `));
}

@ValidatorConstraint({ name: 'noFlexPhrase', async: false })
export class NoFlexPhrase implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && !containsFlexPhrase(value);
  }

  defaultMessage(): string {
    return 'Konten mengandung frasa pamer; bagikan cerita kegagalanmu di sini.';
  }
}
