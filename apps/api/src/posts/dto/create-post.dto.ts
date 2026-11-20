import { IsIn, IsOptional, IsString, Length, Validate } from 'class-validator';
import { NoFlexPhrase } from '../anti-flex.const';
import { Trim } from '../social.validation';

export const POST_CATEGORIES = [
  'Ditolak HRD', 'Salah Kirim Chat', 'Dimarahi Bos', 'Bisnis Boncos', 'Salah Jurusan',
] as const;

// Spill Without Judgment: the author decides how readers should respond.
// 'listen' is the safe default for older posts and for anyone who just wants
// to be heard — no advice, no fixing, no judgement.
export const SPILL_MODES = ['listen', 'advice', 'laugh', 'share'] as const;
export type SpillMode = typeof SPILL_MODES[number];

export class CreatePostDto {
  @IsString()
  @IsIn(POST_CATEGORIES)
  category!: string;

  @Trim()
  @IsString()
  @Length(10, 280)
  @Validate(NoFlexPhrase)
  content!: string;

  @IsOptional()
  @IsIn(SPILL_MODES)
  spillMode?: SpillMode;
}
