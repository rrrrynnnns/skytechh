import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { apiError, requireRole } from '@/app/lib/api';

function getPaymentNotificationText(billingPeriod: string, amount: number) {
	const [year, month] = billingPeriod.split('-').map(Number);
	const periodStart = new Date(year, month - 1, 10);
	const periodEnd = new Date(year, month, 9);
	const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${year}`;
	return `Thank you! Your payment of ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for the ${periodLabel} billing cycle has been successfully processed.`;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const access = await requireRole(['admin', 'subscriber']);
		if (access.response) return access.response;
		const body = await request.json();
		const { id } = await context.params;
		const [existing] = await prisma.$queryRaw<Array<{
			id: string;
			subscriberId: string;
			plan: string;
			billingPeriod: string;
			amount: number;
			dueDate: Date;
			status: string;
			paymentMethod: string | null;
			referenceNumber: string | null;
			receiptImage: string | null;
			paymentDate: Date | null;
			postingDate: Date | null;
		}>>`
			SELECT "id", "subscriberId", "plan"::text AS "plan", "billingPeriod", "amount", "dueDate",
				"status"::text AS "status", "paymentMethod", "referenceNumber", "receiptImage", "paymentDate", "postingDate"
			FROM "Bill"
			WHERE "id" = ${id}
		`;
		if (!existing || (access.session?.user?.role === 'subscriber' && existing.subscriberId !== access.session.user.subscriberId)) return NextResponse.json({ data: null, error: 'Bill not found.' }, { status: 404 });
		const isSubscriberSubmission = access.session?.user?.role === 'subscriber';
		const bill = await prisma.$transaction(async (transaction) => {
			if (isSubscriberSubmission) {
				const paymentDate = new Date();
				await transaction.$executeRaw`UPDATE "Bill" SET "status" = CAST('Pending_Confirmation' AS "BillStatus"), "paymentMethod" = ${body.paymentMethod}, "referenceNumber" = ${body.referenceNumber}, "receiptImage" = ${body.receiptImage || null}, "paymentDate" = ${paymentDate}, "postingDate" = ${paymentDate} WHERE "id" = ${id}`;
				return { ...existing, status: 'Pending_Confirmation', paymentMethod: body.paymentMethod, referenceNumber: body.referenceNumber, receiptImage: body.receiptImage || null, paymentDate, postingDate: paymentDate };
			}
			await transaction.$executeRaw`UPDATE "Bill" SET "status" = CAST('Paid' AS "BillStatus"), "paymentMethod" = ${body.paymentMethod}, "referenceNumber" = ${body.referenceNumber} WHERE "id" = ${id}`;
			const updated = { ...existing, status: 'Paid' as const, paymentMethod: body.paymentMethod, referenceNumber: body.referenceNumber };
			await transaction.notification.upsert({
				where: { id: `payment-confirmed-${updated.id}` },
				create: {
					id: `payment-confirmed-${updated.id}`,
					forRole: 'subscriber',
					forUserId: updated.subscriberId,
					type: 'billing',
					title: 'Payment Confirmed',
					body: getPaymentNotificationText(updated.billingPeriod, updated.amount),
				},
				update: {
					title: 'Payment Confirmed',
					body: getPaymentNotificationText(updated.billingPeriod, updated.amount),
				},
			});
			return updated;
		});
		return NextResponse.json({ data: bill, error: null });
	} catch (error) {
		console.error('Bill payment update failed:', error);
		return apiError(error);
	}
}
