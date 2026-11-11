import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

function sortNotifications<T extends { read: boolean; timestamp: Date | string }>(notifications: T[]) {
	return notifications.sort((left, right) => {
		if (left.read !== right.read) return left.read ? 1 : -1;
		return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
	});
}

function formatRescheduledDate(date: Date) {
	return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function formatRescheduledTime(time: string) {
	return time
		.replace(/\s*(AM|PM|NN)\b/gi, '')
		.replace(/\s*[–—-]\s*/g, ' - ')
		.trim();
}

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

function getPaymentNotificationText(billingPeriod: string, amount: number) {
	const [year, month] = billingPeriod.split('-').map(Number);
	const periodStart = new Date(year, month - 1, 10);
	const periodEnd = new Date(year, month, 9);
	const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${year}`;
	return `Thank you! Your payment of ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for the ${periodLabel} billing cycle has been successfully processed.`;
}

function getBillDueDate(billingPeriod: string, fallback: Date) {
	if (!/^\d{4}-\d{2}$/.test(billingPeriod)) return fallback;
	const [year, month] = billingPeriod.split('-').map(Number);
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	return new Date(Date.UTC(year, month - 1, lastDay, 12, 0, 0, 0));
}

type GeneratedNotification = {
	id: string;
	forRole: 'technician';
	forUserId: string | null;
	type: 'assignment' | 'update';
	title: string;
	body: string;
	timestamp: Date;
	read: boolean;
};

export async function GET() {
	const access = await requireRole(['admin', 'technician', 'subscriber']);
	if (access.response) return access.response;
	const user = access.session?.user;
	const notificationTimestamp = new Date();
	if (user?.role === 'admin') {
		const [completedInstallations, completedRepairs, overdueBills] = await Promise.all([
			prisma.installation.findMany({ where: { status: { in: ['Completed', 'Installation_Closed'] } }, include: { technician: true }, orderBy: { date: 'desc' } }),
			prisma.ticket.findMany({ where: { status: 'Resolved', technicianId: { not: null } }, include: { technician: true, subscriber: true }, orderBy: { updatedAt: 'desc' } }),
			prisma.bill.findMany({ where: { status: 'Overdue' }, include: { subscriber: true }, orderBy: { dueDate: 'desc' } }),
		]);
		const installationSubscribers = await prisma.subscriber.findMany({ where: { id: { in: completedInstallations.map((installation) => installation.subscriberId) } }, select: { id: true, name: true } });
		const subscriberById = new Map(installationSubscribers.map((subscriber) => [subscriber.id, subscriber.name]));
		const activeInstallationNotificationIds = completedInstallations.map((installation) => `admin-technician-installation-${installation.id}`);
		const activeRepairNotificationIds = completedRepairs.map((ticket) => `admin-technician-repair-${ticket.id}`);
		await prisma.$transaction([
			prisma.notification.deleteMany({ where: { forRole: 'admin', id: { startsWith: 'admin-booking-' } } }),
			prisma.notification.deleteMany({ where: { forRole: 'admin', id: { startsWith: 'admin-installation-' } } }),
			prisma.notification.deleteMany({ where: { forRole: 'admin', id: { startsWith: 'admin-technician-installation-', notIn: activeInstallationNotificationIds } } }),
			prisma.notification.deleteMany({ where: { forRole: 'admin', id: { startsWith: 'admin-technician-repair-', notIn: activeRepairNotificationIds } } }),
			prisma.notification.deleteMany({ where: { forRole: 'admin', type: 'system' } }),
			...completedInstallations.map((installation) => prisma.notification.upsert({
				where: { id: `admin-technician-installation-${installation.id}` },
				create: { id: `admin-technician-installation-${installation.id}`, forRole: 'admin', type: 'installation', title: 'Technician Update', body: `${installation.technician?.name || 'A technician'} successfully completed the installation for ${subscriberById.get(installation.subscriberId) || 'a subscriber'}.`, timestamp: notificationTimestamp },
				update: { title: 'Technician Update', body: `${installation.technician?.name || 'A technician'} successfully completed the installation for ${subscriberById.get(installation.subscriberId) || 'a subscriber'}.` },
			})),
			...completedRepairs.map((ticket) => prisma.notification.upsert({
				where: { id: `admin-technician-repair-${ticket.id}` },
				create: { id: `admin-technician-repair-${ticket.id}`, forRole: 'admin', type: 'task', title: 'Technician Update', body: `${ticket.technician?.name || 'A technician'} successfully resolved the repair issue for ${ticket.subscriber.name}.`, timestamp: notificationTimestamp },
				update: { title: 'Technician Update', body: `${ticket.technician?.name || 'A technician'} successfully resolved the repair issue for ${ticket.subscriber.name}.` },
			})),
			...overdueBills.map((bill) => prisma.notification.upsert({
				where: { id: `admin-bill-${bill.id}` },
				create: { id: `admin-bill-${bill.id}`, forRole: 'admin', type: 'billing', title: 'Subscriber Overdue', body: `${bill.subscriber.name} has an overdue bill of ₱${bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Please follow up.`, timestamp: notificationTimestamp },
				update: { title: 'Subscriber Overdue', body: `${bill.subscriber.name} has an overdue bill of ₱${bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Please follow up.` },
			})),
		]);
	}
	const data = await prisma.notification.findMany({
		where: user?.role === 'subscriber'
			? { forRole: 'subscriber', type: { not: 'system' }, OR: [{ forUserId: null }, { forUserId: user.subscriberId }] }
			: user?.role === 'technician'
				? { forRole: 'technician', type: { not: 'system' }, OR: [{ forUserId: null }, { forUserId: user.technicianId }] }
				: { forRole: 'admin' },
		orderBy: { timestamp: 'desc' },
	});
	if (user?.role !== 'subscriber' || !user.subscriberId) {
		if (user?.role !== 'technician' || !user.technicianId) return NextResponse.json({ data: sortNotifications(data), error: null });

		const [installations, tickets] = await Promise.all([
			prisma.installation.findMany({ where: { technicianId: user.technicianId }, orderBy: { date: 'desc' } }),
			prisma.ticket.findMany({ where: { technicianId: user.technicianId, visitDate: { not: null } }, include: { subscriber: true }, orderBy: { visitDate: 'desc' } }),
		]);
		const [allInstallations, allTickets] = await Promise.all([
			prisma.installation.findMany({ select: { id: true, technicianId: true } }),
			prisma.ticket.findMany({ select: { id: true, technicianId: true } }),
		]);
		const staleNotificationIds = [
			...allInstallations
				.filter((installation) => installation.technicianId !== user.technicianId)
				.flatMap((installation) => [
					`assignment-installation-${installation.id}`,
					`update-installation-${installation.id}`,
				]),
			...allTickets
				.filter((ticket) => ticket.technicianId !== user.technicianId)
				.flatMap((ticket) => [
					`assignment-repair-${ticket.id}`,
					`update-repair-${ticket.id}`,
				]),
		];
		if (staleNotificationIds.length) {
			await prisma.notification.deleteMany({
				where: { forRole: 'technician', id: { in: staleNotificationIds } },
			});
		}
		const staleNotificationIdSet = new Set(staleNotificationIds);
		const installationSubscribers = await prisma.subscriber.findMany({ where: { id: { in: installations.map((installation) => installation.subscriberId) } } });
		const subscriberById = new Map(installationSubscribers.map((subscriber) => [subscriber.id, subscriber]));
		const technicianNotifications: GeneratedNotification[] = [
			...installations.flatMap((installation) => {
				const subscriber = subscriberById.get(installation.subscriberId);
				if (!subscriber) return [];
				const normalizedStatus = installation.status.replace(/_/g, ' ');
				const isCompleted = ['Completed', 'Installation Closed'].includes(normalizedStatus);
				const isRescheduled = ['Cancelled', 'Installation Rescheduled'].includes(normalizedStatus);
				if (isRescheduled) {
					const rescheduledDate = installation.date
						? formatRescheduledDate(installation.date)
						: null;
					const rescheduledSchedule = rescheduledDate && installation.time
						? ` to ${rescheduledDate} at ${installation.time}`
						: ' and is awaiting a new schedule';
					return [{
						id: `update-installation-${installation.id}`,
						forRole: 'technician' as const,
						forUserId: user.technicianId || null,
						type: 'update' as const,
						title: 'Schedule Updated',
						body: `Installation for ${subscriber.name} has been rescheduled${rescheduledSchedule}.`,
						timestamp: notificationTimestamp,
						read: false,
					}];
				}
				if (!installation.date || !installation.time) return [];
				const visitDate = installation.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
				const update = isCompleted
					  ? { id: `update-installation-${installation.id}`, forRole: 'technician' as const, forUserId: user.technicianId || null, type: 'update' as const, title: 'Task Completed', body: `Installation for ${subscriber.name} has been marked as completed. Great work!`, timestamp: installation.date, read: true }
					: null;
				return [
					  { id: `assignment-installation-${installation.id}`, forRole: 'technician' as const, forUserId: user.technicianId || null, type: 'assignment' as const, title: 'New Task Assigned', body: `Installation scheduled for ${subscriber.name} on ${visitDate} at ${installation.time}.`, timestamp: installation.date, read: false },
					  ...(update ? [{ ...update, read: false }] : []),
				];
			}),
			...tickets.flatMap((ticket) => {
				const visitDate = ticket.visitDate!.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
				const normalizedStatus = ticket.status.replace(/_/g, ' ');
				const isCompleted = ['Resolved'].includes(normalizedStatus);
				const isRescheduled = ['Closed'].includes(normalizedStatus);
				const update = isCompleted
					  ? { id: `update-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId || null, type: 'update' as const, title: 'Task Completed', body: `Repair for ${ticket.subscriber.name} has been marked as completed. Great work!`, timestamp: ticket.updatedAt, read: true }
					: isRescheduled
						? { id: `update-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId || null, type: 'update' as const, title: 'Schedule Updated', body: `Repair for ${ticket.subscriber.name} has been rescheduled to ${formatRescheduledDate(ticket.visitDate!)} at ${formatRescheduledTime(ticket.visitTime || 'the scheduled time')}.`, timestamp: ticket.updatedAt, read: true }
						: null;
				return [
					  { id: `assignment-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId || null, type: 'assignment' as const, title: 'New Task Assigned', body: `Repair scheduled for ${ticket.subscriber.name} on ${visitDate} at ${ticket.visitTime || 'the scheduled time'}.`, timestamp: ticket.visitDate!, read: false },
					  ...(update ? [{ ...update, read: false }] : []),
				];
			}),
		];
		await Promise.all(technicianNotifications.map((notification) => prisma.notification.upsert({
			where: { id: notification.id },
			create: notification,
			update: {
				forRole: notification.forRole,
				forUserId: notification.forUserId,
				type: notification.type,
				title: notification.title,
				body: notification.body,
			},
		})));
		const persistedTechnicianNotifications = await prisma.notification.findMany({
			where: { id: { in: technicianNotifications.map((notification) => notification.id) } },
			select: { id: true, forRole: true, forUserId: true, type: true, title: true, body: true, timestamp: true, read: true },
		});
		const readStateById = new Map(persistedTechnicianNotifications.map((notification) => [notification.id, notification.read]));
		const notificationsById = new Map(
			data
				.filter((notification) => !staleNotificationIdSet.has(notification.id))
				.map((notification) => [notification.id, notification]),
		);
		technicianNotifications.forEach((notification) => {
			const persistedNotification = persistedTechnicianNotifications.find((item) => item.id === notification.id);
			notificationsById.set(notification.id, {
				...notification,
				...(persistedNotification || {}),
				read: readStateById.get(notification.id) ?? notification.read,
			});
		});
		return NextResponse.json({
			data: sortNotifications(Array.from(notificationsById.values())),
			error: null,
		});
	}

	const [installations, tickets] = await Promise.all([
		prisma.installation.findMany({ where: { subscriberId: user.subscriberId }, orderBy: { date: 'desc' } }),
		prisma.ticket.findMany({ where: { subscriberId: user.subscriberId, visitDate: { not: null } }, include: { technician: true }, orderBy: { visitDate: 'desc' } }),
	]);
	const bills = await prisma.bill.findMany({
		where: { subscriberId: user.subscriberId },
		orderBy: { dueDate: 'desc' },
	});
	const visibleBills = bills.filter((bill) => {
		const [year, month] = bill.billingPeriod.split('-').map(Number);
		return new Date() >= new Date(year, month - 1, 10);
	});
	await Promise.all(visibleBills.map((bill) => prisma.notification.upsert({
		where: { id: `bill-generated-${bill.id}` },
		create: {
			id: `bill-generated-${bill.id}`,
			forRole: 'subscriber',
			forUserId: user.subscriberId,
			type: 'billing',
			title: 'Bill Generated',
			body: getBillNotificationText(bill.billingPeriod, bill.amount, getBillDueDate(bill.billingPeriod, bill.dueDate)),
			timestamp: getBillGeneratedAt(bill.billingPeriod),
		},
		update: {
			title: 'Bill Generated',
			body: getBillNotificationText(bill.billingPeriod, bill.amount, getBillDueDate(bill.billingPeriod, bill.dueDate)),
			timestamp: getBillGeneratedAt(bill.billingPeriod),
		},
	})));
	const paidBills = bills.filter((bill) => bill.status === 'Paid');
	await Promise.all(paidBills.map((bill) => prisma.notification.upsert({
		where: { id: `payment-confirmed-${bill.id}` },
		create: {
			id: `payment-confirmed-${bill.id}`,
			forRole: 'subscriber',
			forUserId: user.subscriberId,
			type: 'billing',
			title: 'Payment Confirmed',
			body: getPaymentNotificationText(bill.billingPeriod, bill.amount),
		},
		update: {
			title: 'Payment Confirmed',
			body: getPaymentNotificationText(bill.billingPeriod, bill.amount),
		},
	})));
	await Promise.all(data
		.filter((notification) => notification.title === 'Payment Confirmed')
		.map(async (notification) => {
			const match = notification.body.match(/Your ([A-Za-z]+) (\d{4}) payment of/);
			if (!match) return;
			const month = new Date(`${match[1]} 1, ${match[2]}`).getMonth() + 1;
			const billingPeriod = `${match[2]}-${String(month).padStart(2, '0')}`;
			const amountMatch = notification.body.match(/₱([\d,]+(?:\.\d{2})?)/);
			if (!amountMatch) return;
			const amount = Number(amountMatch[1].replace(/,/g, ''));
			const body = getPaymentNotificationText(billingPeriod, amount);
			const updated = await prisma.notification.update({ where: { id: notification.id }, data: { body } });
			notification.body = updated.body;
		}));
	const reminderNotifications = [
		...installations.flatMap((installation) => {
			const normalizedStatus = installation.status.replace(/_/g, ' ');
			if (['Cancelled', 'Installation Rescheduled'].includes(normalizedStatus)) {
				return [{
					id: `installation-reminder-${installation.id}`,
					forRole: 'subscriber' as const,
					forUserId: user.subscriberId,
					type: 'installation' as const,
					title: 'Installation Rescheduled',
					body: 'Your installation has been rescheduled and is awaiting a new schedule.',
					timestamp: notificationTimestamp,
					read: false,
				}];
			}
			if (!installation.date || !installation.time) return [];
			return [{
				id: `installation-reminder-${installation.id}`,
				forRole: 'subscriber' as const,
				forUserId: user.subscriberId,
				type: 'installation' as const,
				title: 'Installation Scheduled',
				body: `Your technician will visit on ${installation.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${installation.time} for ${installation.type.toLowerCase()}.`,
				timestamp: notificationTimestamp,
				read: false,
			}];
		}),
		...tickets.map((ticket) => ({
			id: `repair-reminder-${ticket.id}`,
			forRole: 'subscriber' as const,
			forUserId: user.subscriberId,
			type: 'task' as const,
			title: 'Repair Scheduled',
			body: `Technician ${ticket.technician?.name || 'will'} will visit on ${ticket.visitDate!.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${ticket.visitTime || 'the scheduled time'} for your repair request.`,
			timestamp: notificationTimestamp,
			read: false,
		})),
	];
	await Promise.all(reminderNotifications.map((notification) => prisma.notification.upsert({
		where: { id: notification.id },
		create: notification,
		update: { title: notification.title, body: notification.body },
	})));
	const persistedReminderNotifications = await prisma.notification.findMany({
		where: { id: { in: reminderNotifications.map((notification) => notification.id) } },
	});
	const remindersById = new Map(persistedReminderNotifications.map((notification) => [notification.id, notification]));
	const visibleBillNotificationIds = new Set(visibleBills.map((bill) => `bill-generated-${bill.id}`));
	const paidBillNotificationIds = new Set(paidBills.map((bill) => `payment-confirmed-${bill.id}`));
	const notificationsById = new Map(data
		.filter((notification) => (!notification.id.startsWith('bill-generated-') || visibleBillNotificationIds.has(notification.id))
			&& (!notification.id.startsWith('payment-confirmed-') || paidBillNotificationIds.has(notification.id)))
		.map((notification) => [notification.id, notification]));
	reminderNotifications.forEach((notification) => {
		notificationsById.set(notification.id, remindersById.get(notification.id) || notification);
	});
	return NextResponse.json({
		data: sortNotifications(Array.from(notificationsById.values())),
		error: null,
	});
}
export async function POST(request: Request) { const body = await request.json(); if (!body.forRole || !body.type || !body.title || !body.body) return NextResponse.json({ data: null, error: 'Role, type, title, and body are required.' }, { status: 400 }); const notification = await prisma.notification.create({ data: { forRole: body.forRole, forUserId: body.forUserId || null, type: body.type, title: body.title, body: body.body } }); return NextResponse.json({ data: notification, error: null }, { status: 201 }); }
