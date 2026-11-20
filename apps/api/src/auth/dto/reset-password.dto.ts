import { IsByteLength, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(16)
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(12)
  @IsByteLength(12, 72, { message: 'Password harus 12–72 byte (bcrypt)' })
  password!: string;
}
