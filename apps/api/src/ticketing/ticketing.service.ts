import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { PrismaService } from '../database/prisma.service';
import { OrganizationService } from '../organizations/organization.service';
import type { ScanTicketDto } from './ticketing.dto';

@Injectable()
export class TicketingService {
  constructor(
    private readonly db: PrismaService,
    private readonly organizations: OrganizationService,
    private readonly audit: AuditService,
  ) {}

  async mine(auth: AuthContext) {
    const tickets = await this.db.ticket.findMany({
      where: { registration: { userId: auth.user.id } },
      include: {
        registration: {
          include: {
            event: { select: { title: true, slug: true, startsAt: true, timezone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: tickets.map((ticket) => ({
        id: ticket.id,
        credential: ticket.credential,
        revokedAt: ticket.revokedAt?.toISOString() ?? null,
        event: {
          ...ticket.registration.event,
          startsAt: ticket.registration.event.startsAt?.toISOString() ?? null,
        },
      })),
    };
  }

  async revoke(auth: AuthContext, organizationId: string, ticketId: string, context: AuditContext) {
    return this.organizations.withTenant(auth, organizationId, 'events:state', async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, registration: { event: { organizationId } } },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.revokedAt) throw new ConflictException('Ticket is already revoked');
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(
        'TICKET_REVOKED',
        auth.user.id,
        context,
        { ticketId },
        tx,
        organizationId,
      );
      return { id: updated.id, revokedAt: updated.revokedAt!.toISOString() };
    });
  }

  async scan(
    auth: AuthContext,
    organizationId: string,
    eventId: string,
    input: ScanTicketDto,
    context: AuditContext,
  ) {
    return this.organizations.withTenant(auth, organizationId, 'checkin:write', async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { credential: input.credential },
        include: { registration: { include: { event: true } } },
      });
      if (
        !ticket ||
        ticket.registration.eventId !== eventId ||
        ticket.registration.event.organizationId !== organizationId
      )
        throw new NotFoundException('Ticket is not valid for this event');
      if (ticket.revokedAt || ticket.registration.status !== 'CONFIRMED')
        throw new ConflictException('Ticket is revoked or inactive');
      if (input.sessionId) {
        const session = await tx.eventSession.findFirst({
          where: { id: input.sessionId, eventId },
          select: { id: true, title: true },
        });
        if (!session) throw new NotFoundException('Session is not part of this event');
        try {
          const attendance = await tx.sessionAttendance.create({
            data: { ticketId: ticket.id, sessionId: session.id, checkedInById: auth.user.id },
          });
          await this.audit.write(
            'SESSION_ATTENDANCE_RECORDED',
            auth.user.id,
            context,
            { eventId, ticketId: ticket.id, sessionId: session.id },
            tx,
            organizationId,
          );
          return {
            status: 'CONFIRMED',
            scope: 'SESSION',
            attendee: ticket.registration.attendeeName,
            session: session.title,
            checkedInAt: attendance.createdAt.toISOString(),
          };
        } catch (error) {
          if ((error as { code?: string }).code === 'P2002')
            throw new ConflictException('This ticket was already scanned for this session');
          throw error;
        }
      }
      try {
        const checkIn = await tx.checkIn.create({
          data: { ticketId: ticket.id, eventId, checkedInById: auth.user.id },
        });
        await this.audit.write(
          'EVENT_CHECKED_IN',
          auth.user.id,
          context,
          { eventId, ticketId: ticket.id },
          tx,
          organizationId,
        );
        return {
          status: 'CONFIRMED',
          scope: 'EVENT',
          attendee: ticket.registration.attendeeName,
          checkedInAt: checkIn.createdAt.toISOString(),
        };
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002')
          throw new ConflictException('This ticket was already checked in');
        throw error;
      }
    });
  }

  async dashboard(auth: AuthContext, organizationId: string, eventId: string) {
    return this.organizations.withTenant(auth, organizationId, 'checkin:read', async (tx) => {
      const event = await tx.event.findFirst({
        where: { id: eventId, organizationId },
        select: { id: true },
      });
      if (!event) throw new NotFoundException('Event not found');
      const [registered, checkedIn, recent] = await Promise.all([
        tx.registration.count({ where: { eventId, status: 'CONFIRMED' } }),
        tx.checkIn.count({ where: { eventId } }),
        tx.checkIn.findMany({
          where: { eventId },
          include: { ticket: { include: { registration: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
      return {
        registered,
        checkedIn,
        attendancePercent: registered ? Math.round((checkedIn / registered) * 10000) / 100 : 0,
        recent: recent.map((item) => ({
          id: item.id,
          attendee: item.ticket.registration.attendeeName,
          createdAt: item.createdAt.toISOString(),
        })),
      };
    });
  }
}
