import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function PUT(_: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRole(['admin', 'technician', 'subscriber']);
  if (access.response) return access.response;

  const { id } = await context.params;
  const user = access.session?.user;
  const notification = await prisma.notification.findFirst({
    where: user?.role === 'subscriber'
      ? { id, forRole: 'subscriber', OR: [{ forUserId: null }, { forUserId: user.subscriberId }] }
      : user?.role === 'technician'
        ? { id, forRole: 'technician', OR: [{ forUserId: null }, { forUserId: user.technicianId }] }
        : { id, forRole: 'admin' },
  });

  if (!notification) {
    return NextResponse.json({ data: null, error: 'Notification not found.' }, { status: 404 });
  }

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  return NextResponse.json({ data: updated, error: null });
}
