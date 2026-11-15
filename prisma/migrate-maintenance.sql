CREATE TABLE IF NOT EXISTS "MaintenanceSettings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "category" TEXT NOT NULL DEFAULT 'Network Maintenance',
  "impact" TEXT NOT NULL DEFAULT 'Slow Internet',
  "title" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "startsAt" TIMESTAMP(3),
  "restoresAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaintenanceAnnouncement" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "impact" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "restoresAt" TIMESTAMP(3),
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceAnnouncement_pkey" PRIMARY KEY ("id")
);

ALTER TYPE "NotifType" ADD VALUE IF NOT EXISTS 'maintenance';
