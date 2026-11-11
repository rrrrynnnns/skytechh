import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendPasswordResetEmail } from '@/app/lib/password-reset-email';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return NextResponse.json({ data: null, error: 'Account email is required.' }, { status: 400 });

  const genericResponse = { data: { sent: true }, error: null };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json(genericResponse);

  const rawToken = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(email, rawToken);
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
    console.error('Password reset email could not be sent.', error);
    return NextResponse.json({ data: null, error: 'Password reset email is not configured. Contact an administrator.' }, { status: 503 });
  }

  return NextResponse.json(genericResponse);
}
