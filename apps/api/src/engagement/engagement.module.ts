import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { EngagementGateway } from './engagement.gateway';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
@Module({
  imports: [AuthModule, DatabaseModule, RedisModule],
  controllers: [EngagementController],
  providers: [EngagementService, EngagementGateway],
})
export class EngagementModule {}
