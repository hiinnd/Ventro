-- Preserve existing Phase 4 memberships: ADMIN becomes Event Manager, MEMBER becomes Participant.
ALTER TYPE "OrganizationRole" RENAME VALUE 'ADMIN' TO 'EVENT_MANAGER';
ALTER TYPE "OrganizationRole" RENAME VALUE 'MEMBER' TO 'PARTICIPANT';
ALTER TYPE "OrganizationRole" ADD VALUE 'CHECK_IN_STAFF';
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');
ALTER TYPE "EmailKind" ADD VALUE 'ORGANIZATION_INVITE';

ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "Session" ADD COLUMN "activeOrganizationId" UUID;
ALTER TABLE "Organization"
  ADD COLUMN "description" VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN "website" VARCHAR(300) NOT NULL DEFAULT '',
  ADD COLUMN "contactEmail" VARCHAR(254) NOT NULL DEFAULT '',
  ADD COLUMN "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Amman',
  ADD COLUMN "locale" VARCHAR(2) NOT NULL DEFAULT 'en',
  ADD CONSTRAINT "Organization_locale_check" CHECK ("locale" IN ('en', 'ar'));

CREATE TABLE "OrganizationLogo" (
  "organizationId" UUID NOT NULL,
  "data" BYTEA NOT NULL,
  "digest" CHAR(64) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationLogo_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "OrganizationLogo_size_check" CHECK (octet_length("data") BETWEEN 1 AND 524288),
  CONSTRAINT "OrganizationLogo_digest_check" CHECK ("digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "OrganizationLogo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "OrganizationInvitation" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" UUID,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "respondedAt" TIMESTAMPTZ(3),
  CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationInvitation_email_check" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "OrganizationInvitation_tokenHash_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE UNIQUE INDEX "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId", "email");
CREATE INDEX "OrganizationInvitation_email_status_expiresAt_idx" ON "OrganizationInvitation"("email", "status", "expiresAt");
CREATE INDEX "OrganizationInvitation_invitedById_idx" ON "OrganizationInvitation"("invitedById");
ALTER TABLE "EmailOutbox" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "EmailOutbox" ADD COLUMN "invitationId" UUID;
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "OrganizationInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EmailOutbox_invitationId_idx" ON "EmailOutbox"("invitationId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Session_activeOrganizationId_idx" ON "Session"("activeOrganizationId");
