import { IsIn, IsString } from 'class-validator';
import { REACTION_TYPES, ReactionType } from '../../posts/social.persistence';

export class ToggleReactionDto {
  @IsString()
  @IsIn(REACTION_TYPES)
  type!: ReactionType;
}
