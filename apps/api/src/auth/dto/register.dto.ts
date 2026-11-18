import { Transform } from 'class-transformer';
import { IsByteLength, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, { message: 'Username hanya boleh huruf, angka, dan garis bawah' })
  username?: string;

  @IsString()
  @MinLength(12)
  @IsByteLength(12, 72, { message: 'Password harus 12–72 byte (bcrypt)' })
  password!: string;
}
