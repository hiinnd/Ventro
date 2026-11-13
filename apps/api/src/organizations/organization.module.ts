import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { OrganizationController, PlatformController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationOriginGuard, PlatformAdminGuard } from './organization.guards';
@Module({
  imports: [AuthModule, DatabaseModule, RedisModule],
  controllers: [OrganizationController, PlatformController],
  providers: [OrganizationService, OrganizationOriginGuard, PlatformAdminGuard],
})
export class OrganizationModule {}
