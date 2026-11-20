import { IsBoolean, IsInt, Max, Min } from 'class-validator';

/** SEC-04: explicit, user-controlled ad settings. No behavioural targeting. */
export class AdPreferencesDto {
  @IsBoolean()
  adsEnabled!: boolean;

  @IsInt()
  @Min(1)
  @Max(20)
  maxPerSession!: number;
}
