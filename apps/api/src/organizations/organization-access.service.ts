import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { OrganizationRole } from '../generated/prisma/client';

// Callers must obtain userId from an authenticated session, never a submitted actor ID.
@Injectable()
export class OrganizationAccessService {
  constructor(private readonly db: PrismaService) {}
  async requireMembership(
    userId: string,
    organizationId: string,
    roles?: readonly OrganizationRole[],
  ) {
    const member = await this.db.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        user: { status: 'ACTIVE' },
        organization: { archivedAt: null },
        ...(roles ? { role: { in: [...roles] } } : {}),
      },
    });
    if (!member) throw new ForbiddenException('Access is not allowed');
    return member;
  }
}
