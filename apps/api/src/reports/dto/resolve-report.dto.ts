import { IsIn, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsString()
  @IsIn(['dismiss', 'hide'])
  action!: 'dismiss' | 'hide';
}
