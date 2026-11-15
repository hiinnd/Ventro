import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ScanTicketDto {
  @IsUUID()
  credential!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
export class GuestTicketQuery {
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}
