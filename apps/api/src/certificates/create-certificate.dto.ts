import { IsUUID } from 'class-validator';

export class CreateCertificateDto {
  @IsUUID()
  postId!: string;
}
