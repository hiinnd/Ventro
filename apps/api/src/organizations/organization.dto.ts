import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
} from 'class-validator';
import { organizationRoleSchema } from '@ventro/types';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class PageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}
export class OrganizationProfileDto {
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  @Matches(/^[^\p{Cc}]+$/u)
  name!: string;
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description!: string;
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  @ValidateBy({
    name: 'safeWebsite',
    validator: {
      validate: (value: unknown) => {
        if (value === '') return true;
        try {
          const url = new URL(String(value));
          return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
        } catch {
          return false;
        }
      },
    },
  })
  website!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(254)
  @ValidateBy({
    name: 'optionalEmail',
    validator: {
      validate: (value: unknown) =>
        value === '' || (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
    },
  })
  contactEmail!: string;
  @IsString()
  @MaxLength(80)
  @ValidateBy({
    name: 'ianaTimezone',
    validator: {
      validate: (value: unknown) => {
        if (typeof value !== 'string') return false;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      },
    },
  })
  timezone!: string;
  @IsIn(['en', 'ar']) locale!: 'en' | 'ar';
}
export class CreateOrganizationDto extends OrganizationProfileDto {
  @Transform(trim)
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
export class AssignRoleDto {
  @IsIn(organizationRoleSchema.options)
  role!: 'OWNER' | 'EVENT_MANAGER' | 'CHECK_IN_STAFF' | 'PARTICIPANT';
}
export class InviteMemberDto extends AssignRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
