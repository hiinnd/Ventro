ALTER TYPE "EmailKind" ADD VALUE IF NOT EXISTS 'EVENT_NOTIFICATION';
CREATE TYPE "NotificationKind" AS ENUM ('REGISTRATION_CONFIRMED', 'TICKET_ISSUED', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED', 'CERTIFICATE_ISSUED', 'ORGANIZATION_INVITATION');
CREATE TABLE "NotificationPreference" (
  "userId" UUID NOT NULL, "registrationEmail" BOOLEAN NOT NULL DEFAULT true, "eventEmail" BOOLEAN NOT NULL DEFAULT true, "certificateEmail" BOOLEAN NOT NULL DEFAULT true, "invitationEmail" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "Notification" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "organizationId" UUID, "eventId" UUID, "kind" "NotificationKind" NOT NULL, "title" VARCHAR(180) NOT NULL, "body" VARCHAR(1000) NOT NULL, "actionUrl" VARCHAR(500) NOT NULL DEFAULT '', "dedupeKey" VARCHAR(180) NOT NULL, "readAt" TIMESTAMPTZ(3), "emailedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");
CREATE INDEX "Notification_eventId_createdAt_idx" ON "Notification"("eventId", "createdAt");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
