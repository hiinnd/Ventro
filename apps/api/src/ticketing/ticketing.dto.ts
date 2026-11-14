import { IsOptional, IsUUID } from 'class-validator';

export class ScanTicketDto {
  @IsUUID()
  credential!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
