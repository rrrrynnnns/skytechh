import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { apiError, requireRole } from '@/app/lib/api';

export async function GET() {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;

  try {
    const logs = await prisma.systemAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ data: logs, error: null });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;

  try {
    const body = await request.json();
    if (typeof body.action !== 'string' || !body.action.trim() || typeof body.resource !== 'string' || !body.resource.trim()) {
      return NextResponse.json({ data: null, error: 'Action and resource are required.' }, { status: 400 });
    }

    const user = access.session?.user;
    const log = await prisma.systemAuditLog.create({
      data: {
        actorId: user?.id || null,
        actorName: user?.name || null,
        actorEmail: user?.email || null,
        actorRole: 'admin',
        action: body.action.trim(),
        resource: body.resource.trim(),
        resourceId: typeof body.resourceId === 'string' ? body.resourceId : null,
        details: typeof body.details === 'string' ? body.details.trim() || null : null,
      },
    });
    return NextResponse.json({ data: log, error: null }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
