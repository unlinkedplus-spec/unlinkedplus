import { IsIn } from 'class-validator';

export class AdminUserStatusDto {
  @IsIn(['active', 'disabled'])
  status!: string;
}
