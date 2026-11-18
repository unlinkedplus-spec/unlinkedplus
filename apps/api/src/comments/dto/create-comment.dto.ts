import { IsString, Length } from 'class-validator';
import { Trim } from '../../posts/social.validation';

export class CreateCommentDto {
  @Trim()
  @IsString()
  @Length(1, 500)
  content!: string;
}
