CREATE TABLE "OperationalAlertState" (
 "id" UUID NOT NULL,
 "deviceId" UUID NOT NULL,
 "metricKey" TEXT NOT NULL,
 "level" TEXT NOT NULL DEFAULT 'NONE',
 "eventId" UUID,
 "firstObservedAt" TIMESTAMP(3),
 "lastObservedAt" TIMESTAMP(3) NOT NULL,
 "recoveryCount" INTEGER NOT NULL DEFAULT 0,
 "ruleVersion" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "OperationalAlertState_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "OperationalAlertState_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OperationalAlertState_level_check" CHECK ("level" IN ('NONE','YELLOW','RED'))
);
CREATE UNIQUE INDEX "OperationalAlertState_deviceId_metricKey_key" ON "OperationalAlertState"("deviceId","metricKey");
CREATE INDEX "OperationalAlertState_level_idx" ON "OperationalAlertState"("level");
