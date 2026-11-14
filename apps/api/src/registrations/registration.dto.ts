import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FormFieldType } from '../generated/prisma/client';
import { PageDto } from '../organizations/organization.dto';

export class FormFieldDto {
  @IsString() @Matches(/^[a-z][a-z0-9_]{0,63}$/) key!: string;
  @IsEnum(FormFieldType) type!: FormFieldType;
  @IsString() @MaxLength(180) label!: string;
  @IsOptional() @IsString() @MaxLength(500) helpText?: string;
  @IsBoolean() required!: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options?: string[];
  @IsOptional() @IsObject() visibilityRule?: { field: string; equals: string | boolean };
}
export class SaveFormDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];
}
export class SubmitRegistrationDto {
  @IsObject() answers!: Record<string, unknown>;
}
export class RegistrationListQuery extends PageDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['CONFIRMED', 'CANCELLED']) status?: string;
}
