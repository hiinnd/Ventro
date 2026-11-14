import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organizations/organization.module';
import { RedisModule } from '../redis/redis.module';
import { TicketingController } from './ticketing.controller';
import { TicketingService } from './ticketing.service';
@Module({
  imports: [AuthModule, DatabaseModule, RedisModule, OrganizationModule],
  controllers: [TicketingController],
  providers: [TicketingService],
})
export class TicketingModule {}
