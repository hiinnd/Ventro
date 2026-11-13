-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventLocationType" AS ENUM ('VENUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "EventMediaKind" AS ENUM ('COVER');

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID,
    "title" VARCHAR(180) NOT NULL DEFAULT '',
    "description" VARCHAR(10000) NOT NULL DEFAULT '',
    "slug" VARCHAR(120) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PRIVATE',
    "locationType" "EventLocationType" NOT NULL DEFAULT 'VENUE',
    "venue" VARCHAR(300) NOT NULL DEFAULT '',
    "onlineUrl" VARCHAR(500) NOT NULL DEFAULT '',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Amman',
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "capacity" INTEGER,
    "registrationDeadline" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSpeaker" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL DEFAULT '',
    "bio" VARCHAR(2000) NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSession" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "speakerId" UUID,
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(3000) NOT NULL DEFAULT '',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "kind" "EventMediaKind" NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" VARCHAR(80) NOT NULL,
    "digest" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCategory_organizationId_createdAt_idx" ON "EventCategory"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_organizationId_name_key" ON "EventCategory"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_organizationId_updatedAt_idx" ON "Event"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Event_status_visibility_startsAt_idx" ON "Event"("status", "visibility", "startsAt");

-- CreateIndex
CREATE INDEX "Event_categoryId_idx" ON "Event"("categoryId");

-- CreateIndex
CREATE INDEX "EventSpeaker_eventId_position_idx" ON "EventSpeaker"("eventId", "position");

-- CreateIndex
CREATE INDEX "EventSession_eventId_startsAt_idx" ON "EventSession"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "EventSession_speakerId_idx" ON "EventSession"("speakerId");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_idx" ON "EventMedia"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMedia_eventId_kind_key" ON "EventMedia"("eventId", "kind");

-- AddForeignKey
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSpeaker" ADD CONSTRAINT "EventSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSession" ADD CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSession" ADD CONSTRAINT "EventSession_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "EventSpeaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
