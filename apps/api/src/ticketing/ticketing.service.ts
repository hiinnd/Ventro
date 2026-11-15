import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { toBuffer } from 'qrcode';
import type { AuthContext } from '../auth/auth.service';
import { AuditService, type AuditContext } from '../auth/audit.service';
import { tokenHash } from '../auth/crypto';
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

  private ticketView(ticket: {
    id: string;
    credential: string;
    revokedAt: Date | null;
    registration: {
      attendeeName: string;
      event: {
        title: string;
        slug: string;
        startsAt: Date | null;
        timezone: string;
        venue: string;
        onlineUrl: string;
        locationType: 'VENUE' | 'ONLINE';
      };
    };
  }) {
    return {
      id: ticket.id,
      credential: ticket.credential,
      revokedAt: ticket.revokedAt?.toISOString() ?? null,
      attendeeName: ticket.registration.attendeeName,
      event: {
        ...ticket.registration.event,
        startsAt: ticket.registration.event.startsAt?.toISOString() ?? null,
      },
    };
  }
  private async findGuestTicket(ticketId: string, token: string) {
    const ticket = await this.db.ticket.findFirst({
      where: {
        id: ticketId,
        guestAccessHash: tokenHash(token),
        guestAccessExpiresAt: { gt: new Date() },
        registration: { userId: null },
      },
      include: { registration: { include: { event: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket link is invalid or expired');
    return ticket;
  }
  async guest(ticketId: string, token: string) {
    return this.ticketView(await this.findGuestTicket(ticketId, token));
  }
  async guestPdf(ticketId: string, token: string) {
    return this.pdf(await this.findGuestTicket(ticketId, token));
  }
  async download(auth: AuthContext, ticketId: string) {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, registration: { userId: auth.user.id } },
      include: { registration: { include: { event: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.pdf(ticket);
  }
  private async pdf(ticket: {
    id: string;
    credential: string;
    revokedAt: Date | null;
    registration: {
      attendeeName: string;
      event: {
        title: string;
        startsAt: Date | null;
        timezone: string;
        venue: string;
        onlineUrl: string;
        locationType: 'VENUE' | 'ONLINE';
      };
    };
  }) {
    const qr = await toBuffer('ventro:ticket:' + ticket.credential, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 54 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fillColor('#101B35').fontSize(28).text('VENTRO');
      doc.fillColor('#252B42').fontSize(12).text('Every Event. Beyond the Moment.');
      doc.moveDown(3).fillColor('#101B35').fontSize(24).text(ticket.registration.event.title);
      doc
        .moveDown()
        .fontSize(14)
        .fillColor('#252B42')
        .text('Attendee: ' + ticket.registration.attendeeName);
      doc.text('Ticket ID: ' + ticket.id);
      doc.text('Status: ' + (ticket.revokedAt ? 'REVOKED' : 'CONFIRMED'));
      if (!ticket.revokedAt) doc.moveDown().image(qr, { fit: [180, 180], align: 'center' });
      doc
        .moveDown()
        .fontSize(11)
        .text('Present the QR code from your ticket page or confirmation email at check-in.');
      doc.end();
    });
  }

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
