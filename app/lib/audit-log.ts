import { prisma } from '@/app/lib/prisma';

type AuditActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: 'admin' | 'technician' | 'subscriber' | null;
};

type AuditEntry = {
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
};

export async function recordAuditLog(actor: AuditActor | undefined, entry: AuditEntry) {
  if (!actor?.role) return;
  return prisma.systemAuditLog.create({
    data: {
      actorId: actor.id || null,
      actorName: actor.name || null,
      actorEmail: actor.email || null,
      actorRole: actor.role,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || null,
      details: entry.details || null,
    },
  });
}
