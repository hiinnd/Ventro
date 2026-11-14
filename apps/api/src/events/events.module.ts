import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { OrganizationModule } from '../organizations/organization.module';
import { EventsController, PublicEventsController } from './events.controller';
import { EventsService } from './events.service';
@Module({
  imports: [AuthModule, DatabaseModule, RedisModule, OrganizationModule],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService],
})
export class EventsModule {}
