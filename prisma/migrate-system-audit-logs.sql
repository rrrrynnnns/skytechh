CREATE TABLE IF NOT EXISTS "SystemAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorEmail" TEXT,
  "actorRole" "Role" NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SystemAuditLog_createdAt_idx" ON "SystemAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "SystemAuditLog_resource_idx" ON "SystemAuditLog"("resource");
