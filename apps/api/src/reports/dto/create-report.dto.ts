import { IsIn, IsString, IsUUID, Length } from 'class-validator';
import { Trim } from '../../posts/social.validation';

export class CreateReportDto {
  @IsString()
  @IsIn(['post', 'comment', 'user'])
  targetType!: 'post' | 'comment' | 'user';

  @IsUUID()
  targetId!: string;

  @Trim()
  @IsString()
  @Length(1, 500)
  reason!: string;
}
