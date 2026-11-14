import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, Matches } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { dashboardActivityGroupSchema, organizationRoleSchema } from '@ventro/types';
import { PageDto } from './organization.dto';
export class DashboardOverviewQuery {
  @ApiPropertyOptional({ enum: ['7', '30'], default: '7' })
  @IsIn(['7', '30'])
  range: '7' | '30' = '7';
}
export class AnalyticsQuery {
  @ApiPropertyOptional({ enum: ['7', '30', '90'], default: '30' })
  @IsIn(['7', '30', '90'])
  range: '7' | '30' | '90' = '30';
}
export class DashboardActivityQuery extends PageDto {
  @ApiPropertyOptional({ enum: dashboardActivityGroupSchema.options, default: 'ALL' })
  @IsIn(dashboardActivityGroupSchema.options)
  action: 'ALL' | 'TEAM' | 'INVITATIONS' | 'SETTINGS' = 'ALL';
}
export class DashboardSearchDto extends PageDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  @Matches(/^[^\p{Cc}]+$/u)
  q!: string;
  @ApiPropertyOptional({ enum: ['ALL', ...organizationRoleSchema.options], default: 'ALL' })
  @IsIn(['ALL', ...organizationRoleSchema.options])
  role: 'ALL' | 'OWNER' | 'EVENT_MANAGER' | 'CHECK_IN_STAFF' | 'PARTICIPANT' = 'ALL';
}
