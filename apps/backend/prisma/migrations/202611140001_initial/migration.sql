-- CreateTable
CREATE TABLE "Mission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habitat" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Habitat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "crewMemberId" UUID,
    "habitatId" UUID,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "key" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expectedIntervalMs" INTEGER NOT NULL DEFAULT 2000,
    "staleAfterMs" INTEGER NOT NULL DEFAULT 10000,
    "category" TEXT NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "crewMemberId" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthBaseline" (
    "id" UUID NOT NULL,
    "crewMemberId" UUID NOT NULL,
    "metricKey" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'REST',
    "center" DOUBLE PRECISION NOT NULL,
    "spread" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "deviationPercent" DOUBLE PRECISION NOT NULL,
    "sustainSeconds" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "demoOnly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthEvent" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "crewMemberId" UUID,
    "habitatId" UUID,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "firstObservedAt" TIMESTAMP(3) NOT NULL,
    "lastObservedAt" TIMESTAMP(3) NOT NULL,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,
    "evidence" JSONB NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedBy" TEXT,
    "acknowledgementNote" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "HealthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheckIn" (
    "id" UUID NOT NULL,
    "crewMemberId" UUID NOT NULL,
    "createdBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fatigueScore" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "notes" TEXT NOT NULL,

    CONSTRAINT "HealthCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "scenario" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "config" JSONB NOT NULL,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSource" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mission_code_key" ON "Mission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_missionId_code_key" ON "CrewMember"("missionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Habitat_code_key" ON "Habitat"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "HealthBaseline_crewMemberId_metricKey_version_key" ON "HealthBaseline"("crewMemberId", "metricKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "HealthEvent_dedupKey_key" ON "HealthEvent"("dedupKey");

-- CreateIndex
CREATE INDEX "HealthEvent_status_firstObservedAt_idx" ON "HealthEvent"("status", "firstObservedAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSource_url_key" ON "EvidenceSource"("url");

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habitat" ADD CONSTRAINT "Habitat_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_habitatId_fkey" FOREIGN KEY ("habitatId") REFERENCES "Habitat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthBaseline" ADD CONSTRAINT "HealthBaseline_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthEvent" ADD CONSTRAINT "HealthEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthEvent" ADD CONSTRAINT "HealthEvent_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthEvent" ADD CONSTRAINT "HealthEvent_habitatId_fkey" FOREIGN KEY ("habitatId") REFERENCES "Habitat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheckIn" ADD CONSTRAINT "HealthCheckIn_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

