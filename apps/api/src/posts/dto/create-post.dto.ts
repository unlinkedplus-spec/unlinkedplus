import { IsIn, IsString, Length, Validate } from 'class-validator';
import { NoFlexPhrase } from '../anti-flex.const';
import { Trim } from '../social.validation';

export const POST_CATEGORIES = [
  'Ditolak HRD', 'Salah Kirim Chat', 'Dimarahi Bos', 'Bisnis Boncos', 'Salah Jurusan',
] as const;

export class CreatePostDto {
  @IsString()
  @IsIn(POST_CATEGORIES)
  category!: string;

  @Trim()
  @IsString()
  @Length(10, 280)
  @Validate(NoFlexPhrase)
  content!: string;
}
