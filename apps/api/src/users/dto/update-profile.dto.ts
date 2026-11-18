import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsObject, ValidateIf, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class AvatarConfigDto {
  @IsIn(['panda', 'intern', 'php-victim', 'freelancer'])
  character!: string;

  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsIn(['id-card', 'kardus', 'kopi', 'bendera', 'kacamata'], { each: true })
  accessories!: string[];
}

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/)
  username?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(300)
  bio?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => AvatarConfigDto)
  avatarConfig?: AvatarConfigDto;
}
