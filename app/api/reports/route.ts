import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  const now = new Date();

  const [bills, subscriberRecords, technicians, tickets, installations, notifications] = await Promise.all([
    prisma.bill.findMany(),
    prisma.subscriber.findMany({ where: { status: 'Active' }, select: { connectionDate: true } }),
    prisma.technician.count({ where: { status: 'Active' } }),
    prisma.ticket.count({ where: { status: { not: 'Closed' } } }),
    prisma.installation.findMany({
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.notification.findMany({
      orderBy: { timestamp: 'desc' },
      take: 6,
    }),
  ]);

  const installationDetails = await Promise.all(
    installations.map(async (installation) => {
      const [subscriber, technician] = await Promise.all([
        prisma.subscriber.findUnique({ where: { id: installation.subscriberId } }),
        installation.technicianId ? prisma.technician.findUnique({ where: { id: installation.technicianId } }) : Promise.resolve(null),
      ]);

      return {
        ...installation,
        subscriber,
        technician,
      };
    }),
  );

  const paidBills = bills.filter((bill) => bill.status === 'Paid');
  const collected = paidBills.reduce((total, bill) => total + bill.amount, 0);
  const pendingBills = bills.filter((bill) => bill.status !== 'Paid').length;

  const revenueTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const total = bills
      .filter((bill) => bill.status === 'Paid' && bill.billingPeriod === monthKey)
      .reduce((sum, bill) => sum + bill.amount, 0);

    return {
      label: monthLabels[monthDate.getMonth()],
      value: Number(total.toFixed(2)),
    };
  });

  const growthTrend = revenueTrend.map((_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    return subscriberRecords.filter((subscriber) =>
      subscriber.connectionDate < nextMonth,
    ).length;
  });

  return NextResponse.json({
    activeSubscribers: subscriberRecords.length,
    activeTechnicians: technicians,
    openTickets: tickets,
    revenueCollected: collected,
    pendingBills,
    totalBilled: bills.reduce((total, bill) => total + bill.amount, 0),
    billsByStatus: {
      paid: paidBills.length,
      unpaid: bills.filter((bill) => bill.status === 'Unpaid').length,
      overdue: bills.filter((bill) => bill.status === 'Overdue').length,
    },
    revenueTrend,
    growthTrend,
    recentInstallations: installationDetails.map((installation) => ({
      id: installation.id,
      subscriber: installation.subscriber?.name || 'Unknown subscriber',
      technician: installation.technician?.name || 'Unassigned technician',
      date: installation.date || undefined,
      status: installation.status,
    })),
    recentActivity: notifications.map((notification) => ({
      id: notification.id,
      text: notification.title,
      body: notification.body,
      date: notification.timestamp,
      tone: notification.type === 'billing' ? 'orange' : notification.type === 'system' ? 'blue' : 'green',
    })),
    error: null,
  });
} 
