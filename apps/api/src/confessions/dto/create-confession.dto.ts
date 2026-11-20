import { IsBoolean, IsDateString, IsOptional, IsString, Length, Validate } from 'class-validator';
import { NoFlexPhrase } from '../../posts/anti-flex.const';
import { Trim } from '../../posts/social.validation';

export class CreateConfessionDto {
  @Trim()
  @IsString()
  @Length(10, 500)
  @Validate(NoFlexPhrase)
  content!: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
