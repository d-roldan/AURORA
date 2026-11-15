ALTER TABLE "HealthCheckIn"
  ADD COLUMN "observedAt" TIMESTAMP(3),
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';

UPDATE "HealthCheckIn" SET "observedAt" = "recordedAt";
ALTER TABLE "HealthCheckIn" ALTER COLUMN "observedAt" SET NOT NULL,
  ALTER COLUMN "observedAt" SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "HealthCheckIn_crewMemberId_observedAt_idx" ON "HealthCheckIn"("crewMemberId", "observedAt");
