import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organizations/organization.module';
import { RedisModule } from '../redis/redis.module';
import { CertificatesController, CertificatesPublicController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [AuthModule, DatabaseModule, OrganizationModule, RedisModule],
  controllers: [CertificatesController, CertificatesPublicController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
