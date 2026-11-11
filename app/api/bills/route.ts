import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

function getMonthlyDueDate(year: number, monthIndex: number) {
	const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	return new Date(Date.UTC(year, monthIndex, lastDayOfMonth, 12, 0, 0, 0));
}

function getDueDateForBillingPeriod(billingPeriod: string | null | undefined) {
	if (!billingPeriod || !/^\d{4}-\d{2}$/.test(billingPeriod)) {
		return null;
	}
	const [yearStr, monthStr] = billingPeriod.split('-');
	const year = Number(yearStr);
	const monthIndex = Number(monthStr) - 1;
	if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
		return null;
	}
	return getMonthlyDueDate(year, monthIndex);
}

const cutoffDay = 9;

function getBillNotificationText(billingPeriod: string, amount: number, dueDate: Date) {
	const [year, month] = billingPeriod.split('-').map(Number);
	const periodStart = new Date(year, month - 1, 10);
	const periodEnd = new Date(year, month, 9);
	const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	const dueDateLabel = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	return `Your bill for the ${periodLabel} cycle has been generated. The total amount is ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}, and it is due on ${dueDateLabel}.`;
}

function getBillGeneratedAt(billingPeriod: string) {
	const [year, month] = billingPeriod.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, 9, 16, 0, 0, 0));
}

export async function GET(request: Request) {
	const access = await requireRole(['admin', 'subscriber']);
	if (access.response) return access.response;
	const status = new URL(request.url).searchParams.get('status');
	const isSubscriber = access.session?.user?.role === 'subscriber';
	const subscriberId = isSubscriber ? access.session.user.subscriberId : new URL(request.url).searchParams.get('subscriberId');
	const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
	const billingDay = Number(systemSettings?.billingDay ?? 30);
	const plans = Array.isArray(systemSettings?.plans) ? systemSettings.plans as Array<{ name?: string; price?: number }> : [];
	const currentDate = new Date();
	const currentBillingPeriod = currentDate.getDate() >= cutoffDay
		? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
		: null;

	if (!isSubscriber && currentBillingPeriod) {
		const activeSubscribers = await prisma.subscriber.findMany({ where: { status: 'Active', archived: false }, select: { id: true, plan: true } });
		await prisma.$transaction(async (transaction) => {
			for (const subscriber of activeSubscribers) {
				const existingBill = await transaction.bill.findFirst({
					where: { subscriberId: subscriber.id, billingPeriod: currentBillingPeriod },
					select: { id: true },
				});
				if (existingBill) continue;
				const planName = subscriber.plan.replace(/_/g, ' ');
				const plan = plans.find((item) => item.name?.replace(/\s+/g, '').toLowerCase() === planName.replace(/\s+/g, '').toLowerCase());
				if (plan?.price === undefined) continue;
				await transaction.bill.create({
					data: {
						id: `BILL-${subscriber.id}-${currentBillingPeriod}`,
						subscriberId: subscriber.id,
						plan: subscriber.plan,
						billingPeriod: currentBillingPeriod,
						amount: Number(plan.price),
						dueDate: getMonthlyDueDate(currentDate.getFullYear(), currentDate.getMonth()),
						status: 'Unpaid',
					},
				});
				await transaction.notification.upsert({
					where: { id: `bill-generated-${`BILL-${subscriber.id}-${currentBillingPeriod}`}` },
					create: {
						id: `bill-generated-BILL-${subscriber.id}-${currentBillingPeriod}`,
						forRole: 'subscriber',
						forUserId: subscriber.id,
						type: 'billing',
						title: 'Bill Generated',
						body: getBillNotificationText(currentBillingPeriod, Number(plan.price), getMonthlyDueDate(currentDate.getFullYear(), currentDate.getMonth())),
						timestamp: getBillGeneratedAt(currentBillingPeriod),
					},
					update: {
						title: 'Bill Generated',
						body: getBillNotificationText(currentBillingPeriod, Number(plan.price), getMonthlyDueDate(currentDate.getFullYear(), currentDate.getMonth())),
						timestamp: getBillGeneratedAt(currentBillingPeriod),
					},
				});
			}
		});
	}

	const subscriberFilter = subscriberId ? Prisma.sql`AND b."subscriberId" = ${subscriberId}` : Prisma.empty;
	const statusFilter = status && status !== 'All' ? Prisma.sql`AND b."status"::text = ${status}` : Prisma.empty;
	const rawBills = await prisma.$queryRaw<Array<{ id: string; subscriberId: string; plan: string; billingPeriod: string; amount: number; dueDate: Date; status: string; paymentMethod: string | null; referenceNumber: string | null; receiptImage: string | null; paymentDate: Date | null; postingDate: Date | null; subscriberName: string }>>`
		SELECT b."id", b."subscriberId", b."plan"::text AS "plan", b."billingPeriod", b."amount", b."dueDate",
			b."status"::text AS "status", b."paymentMethod", b."referenceNumber", b."receiptImage", b."paymentDate", b."postingDate", s."name" AS "subscriberName"
		FROM "Bill" b
		INNER JOIN "Subscriber" s ON s."id" = b."subscriberId"
		WHERE 1 = 1
			${subscriberFilter}
			${statusFilter}
		ORDER BY b."dueDate" DESC
	`;
	const bills = rawBills.map(({ subscriberName, ...bill }) => ({
		...bill,
		subscriber: { name: subscriberName },
	}));
	const normalizedBills = bills.map((bill) => ({
		...bill,
		dueDate: getDueDateForBillingPeriod(bill.billingPeriod) ?? bill.dueDate,
	}));
	if (!isSubscriber || !subscriberId) return NextResponse.json({ data: normalizedBills, billingDay, cutoffDay, error: null });

	const [subscriber] = await Promise.all([
		prisma.subscriber.findUnique({ where: { id: subscriberId } }),
	]);
	const planName = subscriber?.plan.replace(/_/g, ' ') || '';
	const currentPlan = plans.find((plan) => plan.name?.replace(/\s+/g, '').toLowerCase() === planName.replace(/\s+/g, '').toLowerCase());
	const currentPrice = currentPlan?.price;
	let currentBills = normalizedBills;
	const hasCurrentBill = currentBillingPeriod
		? currentBills.some((bill) => bill.billingPeriod === currentBillingPeriod)
		: true;
	if (!hasCurrentBill && subscriber && currentPrice !== undefined && currentBillingPeriod) {
		const createdBill = await prisma.bill.create({
			data: {
				id: `BILL-${subscriber.id}-${Date.now()}`,
				subscriberId: subscriber.id,
				plan: subscriber.plan,
				billingPeriod: currentBillingPeriod,
				amount: Number(currentPrice),
				dueDate: getMonthlyDueDate(currentDate.getFullYear(), currentDate.getMonth()),
				status: 'Unpaid',
			},
		});
		await prisma.notification.upsert({
			where: { id: `bill-generated-${createdBill.id}` },
			create: {
				id: `bill-generated-${createdBill.id}`,
				forRole: 'subscriber',
				forUserId: subscriber.id,
				type: 'billing',
				title: 'Bill Generated',
				body: getBillNotificationText(createdBill.billingPeriod, createdBill.amount, createdBill.dueDate),
				timestamp: getBillGeneratedAt(createdBill.billingPeriod),
			},
			update: {
				title: 'Bill Generated',
				body: getBillNotificationText(createdBill.billingPeriod, createdBill.amount, createdBill.dueDate),
				timestamp: getBillGeneratedAt(createdBill.billingPeriod),
			},
		});
		currentBills = [{ ...createdBill, receiptImage: null, subscriber: { name: subscriber.name } }];
	} else if (currentPrice !== undefined) {
		currentBills = currentBills.map((bill) => ({ ...bill, amount: Number(currentPrice) }));
	}
	return NextResponse.json({ data: currentBills, billingDay, cutoffDay, error: null });
}
