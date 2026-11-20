import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../posts/social.validation';

export const POLL_STATUSES = ['active', 'closed'] as const;

export class PollOptionInputDto {
  @Trim()
  @IsString()
  @Length(1, 120)
  label!: string;
}

export class CreatePollDto {
  @Trim()
  @IsString()
  @Length(5, 200)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PollOptionInputDto)
  options!: PollOptionInputDto[];

  @IsOptional()
  @IsIn(POLL_STATUSES)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  durationHours?: number;
}
