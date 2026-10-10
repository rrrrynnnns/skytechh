import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function PUT(request: Request) {
  const access = await requireRole(['subscriber', 'technician']);
  if (access.response) return access.response;

  const email = access.session?.user?.email;
  if (!email) return NextResponse.json({ data: null, error: 'Account email is unavailable.' }, { status: 400 });

  const body = await request.json();
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!currentPassword || !newPassword) return NextResponse.json({ data: null, error: 'Current and new passwords are required.' }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ data: null, error: 'New password must be at least 8 characters.' }, { status: 400 });
  if (currentPassword === newPassword) return NextResponse.json({ data: null, error: 'New password must be different from the current password.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ data: null, error: 'Current password is incorrect.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });
  return NextResponse.json({ data: { updated: true }, error: null });
}
