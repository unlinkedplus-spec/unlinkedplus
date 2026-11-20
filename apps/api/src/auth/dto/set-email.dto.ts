import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class SetEmailDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Email tidak valid' })
  @MaxLength(254)
  email!: string;
}
