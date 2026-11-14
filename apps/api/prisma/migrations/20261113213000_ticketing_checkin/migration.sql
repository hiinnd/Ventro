CREATE TABLE "Ticket" (
  "id" UUID NOT NULL,
  "registrationId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "credential" VARCHAR(64) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CheckIn" (
  "id" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "checkedInById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SessionAttendance" (
  "id" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "checkedInById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ticket_registrationId_key" ON "Ticket"("registrationId");
CREATE UNIQUE INDEX "Ticket_tokenHash_key" ON "Ticket"("tokenHash");
CREATE UNIQUE INDEX "Ticket_credential_key" ON "Ticket"("credential");
CREATE INDEX "Ticket_tokenHash_idx" ON "Ticket"("tokenHash");
CREATE UNIQUE INDEX "CheckIn_ticketId_eventId_key" ON "CheckIn"("ticketId", "eventId");
CREATE INDEX "CheckIn_eventId_createdAt_idx" ON "CheckIn"("eventId", "createdAt");
CREATE UNIQUE INDEX "SessionAttendance_ticketId_sessionId_key" ON "SessionAttendance"("ticketId", "sessionId");
CREATE INDEX "SessionAttendance_sessionId_createdAt_idx" ON "SessionAttendance"("sessionId", "createdAt");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
