import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveCertificateTemplateDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) body?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) learningHours?: number;
  @IsOptional() @IsBoolean() requiresEventCheckIn?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  requiredSessionIds?: string[];
}

export class RevokeCertificateDto {
  @IsString() @MaxLength(500) reason!: string;
}

export class PassportVisibilityDto {
  @IsBoolean() profileVisible!: boolean;
  @IsBoolean() eventsVisible!: boolean;
  @IsBoolean() certificatesVisible!: boolean;
  @IsBoolean() attendanceVisible!: boolean;
  @IsBoolean() learningHoursVisible!: boolean;
}
