CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'GENERATED', 'REVOKED', 'FAILED');

CREATE TABLE "CertificateTemplate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "body" VARCHAR(2000) NOT NULL DEFAULT '',
  "learningHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requiresEventCheckIn" BOOLEAN NOT NULL DEFAULT true,
  "requiredSessionIds" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Certificate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "registrationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "verificationId" UUID NOT NULL,
  "recipientName" VARCHAR(100) NOT NULL,
  "eventTitle" VARCHAR(180) NOT NULL,
  "learningHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
  "issuedAt" TIMESTAMPTZ(3),
  "generatedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "revocationReason" VARCHAR(500) NOT NULL DEFAULT '',
  "pdfData" BYTEA,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventPassport" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "EventPassport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassportVisibilitySettings" (
  "passportId" UUID NOT NULL,
  "profileVisible" BOOLEAN NOT NULL DEFAULT false,
  "eventsVisible" BOOLEAN NOT NULL DEFAULT false,
  "certificatesVisible" BOOLEAN NOT NULL DEFAULT false,
  "attendanceVisible" BOOLEAN NOT NULL DEFAULT false,
  "learningHoursVisible" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PassportVisibilitySettings_pkey" PRIMARY KEY ("passportId")
);

CREATE UNIQUE INDEX "Certificate_verificationId_key" ON "Certificate"("verificationId");
CREATE UNIQUE INDEX "Certificate_registrationId_templateId_key" ON "Certificate"("registrationId", "templateId");
CREATE INDEX "Certificate_eventId_status_idx" ON "Certificate"("eventId", "status");
CREATE INDEX "Certificate_organizationId_createdAt_idx" ON "Certificate"("organizationId", "createdAt");
CREATE INDEX "CertificateTemplate_organizationId_eventId_active_idx" ON "CertificateTemplate"("organizationId", "eventId", "active");
CREATE UNIQUE INDEX "EventPassport_userId_key" ON "EventPassport"("userId");
CREATE UNIQUE INDEX "EventPassport_slug_key" ON "EventPassport"("slug");

ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventPassport" ADD CONSTRAINT "EventPassport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassportVisibilitySettings" ADD CONSTRAINT "PassportVisibilitySettings_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "EventPassport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
