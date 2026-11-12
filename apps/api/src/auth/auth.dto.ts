import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeEmail } from './crypto';

export class EmailDto {
  @ApiProperty({ example: 'organizer@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsEmail({ allow_utf8_local_part: false })
  @Length(3, 254)
  email!: string;
}
export class LoginDto extends EmailDto {
  @ApiProperty({ format: 'password', maxLength: 128 })
  @IsString()
  @Length(1, 128)
  password!: string;
}
export class RegisterDto extends EmailDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  @Matches(/^[^\p{Cc}]+$/u)
  name!: string;
  @ApiProperty({ format: 'password', minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;
  @ApiPropertyOptional({ enum: ['en', 'ar'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'ar'])
  locale?: 'en' | 'ar';
}
export class TokenDto {
  @ApiProperty({ minLength: 64, maxLength: 64, format: 'password' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}
export class ResetPasswordDto extends TokenDto {
  @ApiProperty({ format: 'password', minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
export class UpdateProfileDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  @Matches(/^[^\p{Cc}]+$/u)
  name!: string;
  @ApiProperty({ enum: ['en', 'ar'] })
  @IsIn(['en', 'ar'])
  locale!: 'en' | 'ar';
}
