import { IsIn, IsOptional, IsString, Length, Matches, MaxLength, Validate } from 'class-validator';
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

// Video Spill accepts an external link only from providers we can name.
// No upload, no tracking pixel, and no embed request from unlinked+ itself.
export const VIDEO_URL_PATTERN =
  /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)\/[^\s]+$/i;

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

  // Video Spill: optional link. The caption still has to be a real story.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(VIDEO_URL_PATTERN, {
    message: 'Video harus berupa tautan https dari YouTube, TikTok, atau Instagram.',
  })
  videoUrl?: string;
}
