import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.maintenanceSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        enabled: true,
        category: true,
        impact: true,
        title: true,
        description: true,
        startsAt: true,
        restoresAt: true,
      },
    });
    return NextResponse.json({
      data: settings ?? {
        enabled: false,
        category: 'Scheduled Network Maintenance',
        impact: 'Slow Internet / High Latency Advisory',
        title: 'Network Maintenance Notice',
        description: '',
        startsAt: null,
        restoresAt: null,
      },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: {
        enabled: false,
        category: 'Scheduled Network Maintenance',
        impact: 'Slow Internet / High Latency Advisory',
        title: 'Network Maintenance Notice',
        description: '',
        startsAt: null,
        restoresAt: null,
      },
      error: null,
    });
  }
}
