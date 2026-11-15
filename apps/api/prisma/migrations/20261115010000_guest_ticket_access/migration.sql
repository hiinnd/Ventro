ALTER TABLE "Ticket" ADD COLUMN "guestAccessHash" CHAR(64);
ALTER TABLE "Ticket" ADD COLUMN "guestAccessExpiresAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "Ticket_guestAccessHash_key" ON "Ticket"("guestAccessHash");
CREATE INDEX "Ticket_guestAccessExpiresAt_idx" ON "Ticket"("guestAccessExpiresAt");
