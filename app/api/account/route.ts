import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function GET() {
  const access = await requireRole(['subscriber']);
  if (access.response) return access.response;
  const subscriberId = access.session?.user?.subscriberId;
  if (!subscriberId) return NextResponse.json({ data: null, error: 'Subscriber account is not linked.' }, { status: 404 });
  const [subscriber, systemSettings] = await Promise.all([
    prisma.subscriber.findUnique({ where: { id: subscriberId } }),
    prisma.systemSettings.findUnique({ where: { id: 'singleton' } }),
  ]);
  if (!subscriber) return NextResponse.json({ data: null, error: 'Subscriber account was not found.' }, { status: 404 });
  const plans = Array.isArray(systemSettings?.plans) ? systemSettings.plans as Array<{ name?: string; speedMbps?: number; price?: number }> : [];
  const planName = subscriber.plan.replace(/_/g, ' ');
  const planDetails = plans.find((plan) => plan.name?.replace(/\s+/g, '').toLowerCase() === planName.replace(/\s+/g, '').toLowerCase());
  return NextResponse.json({ data: { ...subscriber, planName, speedMbps: Number(planDetails?.speedMbps || planName.match(/[0-9]+/)?.[0] || 0), monthlyPrice: Number(planDetails?.price || 0), cutoffDay: 9, billingDay: Number(systemSettings?.billingDay ?? 30) }, error: null });
}
