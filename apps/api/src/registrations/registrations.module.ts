import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organizations/organization.module';
import { RegistrationController, PublicRegistrationController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
@Module({ imports:[AuthModule,DatabaseModule,OrganizationModule], controllers:[RegistrationController,PublicRegistrationController], providers:[RegistrationsService] })
export class RegistrationsModule {}
