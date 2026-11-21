import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateContentDto {
  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @IsOptional() @IsString() @MaxLength(500)
  body?: string;

  @IsOptional() @IsString() @MaxLength(500)
  @Matches(/^(\/|https:\/\/)/, { message: 'Gambar harus berupa path /images/… atau tautan https.' })
  imagePath?: string;

  @IsOptional() @IsIn(['published', 'draft'])
  status?: string;
}

export class UpdateAdsDto {
  @IsOptional() @IsBoolean()
  adsEnabled?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(20)
  maxPerSession?: number;
}

export class UpdateStatusDto {
  @IsIn(['active', 'closed', 'published', 'draft', 'approved', 'rejected', 'pending'])
  status!: string;
}

export class UpdateStoreItemDto {
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000)
  price?: number;

  @IsOptional() @IsBoolean()
  isPremium?: boolean;
}
