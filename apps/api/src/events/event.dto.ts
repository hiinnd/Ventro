import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { EventLocationType, EventVisibility } from '../generated/prisma/client';
import { PageDto } from '../organizations/organization.dto';

export class SpeakerDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
}
export class EventSessionDto {
  @IsString() @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsISO8601() startsAt!: string;
  @IsISO8601() endsAt!: string;
  @IsOptional() @IsInt() @Min(0) speakerIndex?: number;
}
export class EventDraftDto {
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsEnum(EventVisibility) visibility?: EventVisibility;
  @IsOptional() @IsEnum(EventLocationType) locationType?: EventLocationType;
  @IsOptional() @IsString() @MaxLength(300) venue?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) onlineUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) capacity?: number | null;
  @IsOptional() @IsISO8601() registrationDeadline?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SpeakerDto) speakers?: SpeakerDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(250) @ValidateNested({ each: true }) @Type(() => EventSessionDto) sessions?: EventSessionDto[];
}
export class PublicEventQuery extends PageDto {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
}
