import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ClassConstructor, plainToInstance, Transform, Type } from 'class-transformer';
import { IsInt, Max, Min, isUUID, validateSync } from 'class-validator';

export const Trim = () => Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value);

export function validateInput<T extends object>(type: ClassConstructor<T>, input: unknown): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Body harus berupa objek');
  }
  const dto = plainToInstance(type, input);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    throw new BadRequestException(errors.flatMap((error) =>
      Object.values(error.constraints ?? { invalid: `${error.property} tidak valid` })));
  }
  return dto;
}

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export function pagination(page = 1, limit = 20) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new BadRequestException('page harus 1..1000000 dan limit harus 1..50');
  }
  return { page, limit, skip: (page - 1) * limit };
}

export function assertUuid(id: string): void {
  if (typeof id !== 'string' || !isUUID(id)) {
    throw new BadRequestException('ID harus berupa UUID');
  }
}

export interface SocialUser {
  userId: string;
  username: string;
  role: string;
}

export function authenticatedUserId(user?: SocialUser): string {
  if (!user?.userId) throw new UnauthorizedException();
  return user.userId;
}
