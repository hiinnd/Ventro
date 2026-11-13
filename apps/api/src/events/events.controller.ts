import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuthRate, AuthRateGuard, SessionGuard, VerifiedEmailGuard, authenticated, auditContext, type AuthRequest } from '../auth/auth.guards';
import { OrganizationOriginGuard } from '../organizations/organization.guards';
import { EventDraftDto, PublicEventQuery } from './event.dto';
import { EventsService } from './events.service';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Events') @ApiCookieAuth('ventro-session') @Controller('organizations/:organizationId/events') @UseGuards(OrganizationOriginGuard, AuthRateGuard, SessionGuard, VerifiedEmailGuard)
export class EventsController { constructor(private readonly events: EventsService) {}
 @Get() list(@Req() r:AuthRequest,@Param('organizationId',uuid) org:string,@Query() q:PublicEventQuery){return this.events.list(authenticated(r),org,q.page)}
 @Post() @AuthRate('org-write') create(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string){return this.events.create(authenticated(r),org,auditContext(r))}
 @Get(':eventId') get(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string){return this.events.get(authenticated(r),org,id)}
 @Patch(':eventId') @AuthRate('org-write') save(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string,@Body()body:EventDraftDto){return this.events.save(authenticated(r),org,id,body,auditContext(r))}
 @Post(':eventId/publish') @HttpCode(200) @AuthRate('org-write') publish(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string){return this.events.transition(authenticated(r),org,id,'publish',auditContext(r))}
 @Post(':eventId/unpublish') @HttpCode(200) @AuthRate('org-write') unpublish(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string){return this.events.transition(authenticated(r),org,id,'unpublish',auditContext(r))}
 @Post(':eventId/cancel') @HttpCode(200) @AuthRate('org-write') cancel(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string){return this.events.transition(authenticated(r),org,id,'cancel',auditContext(r))}
 @Post(':eventId/duplicate') @HttpCode(200) @AuthRate('org-write') duplicate(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string){return this.events.duplicate(authenticated(r),org,id,auditContext(r))}
 @Post(':eventId/cover') @AuthRate('org-write') @ApiConsumes('multipart/form-data') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2*1024*1024,files:1,fields:0}})) cover(@Req()r:AuthRequest,@Param('organizationId',uuid)org:string,@Param('eventId',uuid)id:string,@UploadedFile()file:Express.Multer.File){return this.events.cover(authenticated(r),org,id,file,auditContext(r))}
}
@ApiTags('Public events') @Controller('events')
export class PublicEventsController { constructor(private readonly events:EventsService) {} @Get() list(@Query()q:PublicEventQuery){return this.events.publicList(q)} @Get(':slug/cover') async cover(@Param('slug')slug:string,@Res()res:Response){const file=await this.events.publicCover(slug);res.setHeader('Content-Type',file.mimeType);res.setHeader('Cache-Control','public, max-age=300');res.setHeader('X-Content-Type-Options','nosniff');res.send(file.data)} @Get(':slug') detail(@Param('slug')slug:string){return this.events.publicDetail(slug)} }
