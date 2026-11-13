import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { privateIdentifier } from './crypto';

export interface AuditContext {
  requestId?: string;
  network?: string;
}
@Injectable()
export class AuditService {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  write(
    action: string,
    actorId: string | null,
    context: AuditContext,
    metadata?: Prisma.InputJsonObject,
    tx: Prisma.TransactionClient = this.db,
    organizationId?: string,
  ) {
    return tx.auditLog.create({
      data: {
        action,
        actorId,
        requestId: context.requestId?.slice(0, 64),
        networkHash: context.network
          ? privateIdentifier(this.config.get('AUTH_SECRET', { infer: true }), context.network)
          : undefined,
        metadata,
        organizationId,
      },
    });
  }
}
