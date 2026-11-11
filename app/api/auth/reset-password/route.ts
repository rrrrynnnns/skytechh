import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || !password) return NextResponse.json({ data: null, error: 'Reset token and new password are required.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ data: null, error: 'Password must be at least 8 characters.' }, { status: 400 });

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return NextResponse.json({ data: null, error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: await bcrypt.hash(password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);
  return NextResponse.json({ data: { updated: true }, error: null });
}
