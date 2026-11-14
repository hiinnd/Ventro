-- A registration may belong to a VENTRO account or to a guest. Every row keeps a
-- normalized attendee email so duplicate event enrollment is prevented in both cases.
ALTER TABLE "Registration" ADD COLUMN "attendeeEmail" VARCHAR(254);
ALTER TABLE "Registration" ADD COLUMN "attendeeName" VARCHAR(100) NOT NULL DEFAULT '';

UPDATE "Registration" AS registration
SET "attendeeEmail" = "User"."email", "attendeeName" = "User"."name"
FROM "User"
WHERE registration."userId" = "User"."id";

ALTER TABLE "Registration" ALTER COLUMN "attendeeEmail" SET NOT NULL;
ALTER TABLE "Registration" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_userId_fkey";
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Registration_eventId_attendeeEmail_key"
  ON "Registration"("eventId", "attendeeEmail");
CREATE INDEX "Registration_attendeeEmail_createdAt_idx"
  ON "Registration"("attendeeEmail", "createdAt");
