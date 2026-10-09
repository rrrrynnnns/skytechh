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
				create: { id: `admin-technician-installation-${installation.id}`, forRole: 'admin', type: 'installation', title: 'Technician Update', body: `${installation.technician.name} successfully completed the installation for ${subscriberById.get(installation.subscriberId) || 'a subscriber'}.`, timestamp: notificationTimestamp },
				update: { title: 'Technician Update', body: `${installation.technician.name} successfully completed the installation for ${subscriberById.get(installation.subscriberId) || 'a subscriber'}.` },
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
			? { forRole: 'subscriber', OR: [{ forUserId: null }, { forUserId: user.subscriberId }] }
			: user?.role === 'technician'
				? { forRole: 'technician', OR: [{ forUserId: null }, { forUserId: user.technicianId }] }
				: { forRole: 'admin' },
		orderBy: { timestamp: 'desc' },
	});
	if (user?.role !== 'subscriber' || !user.subscriberId) {
		if (user?.role !== 'technician' || !user.technicianId) return NextResponse.json({ data: sortNotifications(data), error: null });

		const [installations, tickets] = await Promise.all([
			prisma.installation.findMany({ where: { technicianId: user.technicianId }, orderBy: { date: 'desc' } }),
			prisma.ticket.findMany({ where: { technicianId: user.technicianId, visitDate: { not: null } }, include: { subscriber: true }, orderBy: { visitDate: 'desc' } }),
		]);
		const installationSubscribers = await prisma.subscriber.findMany({ where: { id: { in: installations.map((installation) => installation.subscriberId) } } });
		const subscriberById = new Map(installationSubscribers.map((subscriber) => [subscriber.id, subscriber]));
		const technicianNotifications = [
			...installations.flatMap((installation) => {
				const subscriber = subscriberById.get(installation.subscriberId);
				if (!subscriber) return [];
				const visitDate = installation.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
				const normalizedStatus = installation.status.replace(/_/g, ' ');
				const isCompleted = ['Completed', 'Installation Closed'].includes(normalizedStatus);
				const isRescheduled = ['Cancelled', 'Installation Rescheduled'].includes(normalizedStatus);
				const update = isCompleted
					  ? { id: `update-installation-${installation.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'update' as const, title: 'Task Completed', body: `Installation for ${subscriber.name} has been marked as completed. Great work!`, timestamp: installation.date, read: true }
					: isRescheduled
						? { id: `update-installation-${installation.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'update' as const, title: 'Schedule Updated', body: `Installation for ${subscriber.name} has been rescheduled to ${formatRescheduledDate(installation.date)} at ${formatRescheduledTime(installation.time)}.`, timestamp: installation.date, read: true }
						: null;
				return [
					  { id: `assignment-installation-${installation.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'assignment' as const, title: 'New Task Assigned', body: `Installation scheduled for ${subscriber.name} on ${visitDate} at ${installation.time}.`, timestamp: installation.date, read: true },
					  ...(update ? [{ ...update, read: isRescheduled ? false : true }] : []),
				];
			}),
			...tickets.flatMap((ticket) => {
				const visitDate = ticket.visitDate!.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
				const normalizedStatus = ticket.status.replace(/_/g, ' ');
				const isCompleted = ['Resolved'].includes(normalizedStatus);
				const isRescheduled = ['Closed'].includes(normalizedStatus);
				const update = isCompleted
					  ? { id: `update-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'update' as const, title: 'Task Completed', body: `Repair for ${ticket.subscriber.name} has been marked as completed. Great work!`, timestamp: ticket.updatedAt, read: true }
					: isRescheduled
						? { id: `update-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'update' as const, title: 'Schedule Updated', body: `Repair for ${ticket.subscriber.name} has been rescheduled to ${formatRescheduledDate(ticket.visitDate!)} at ${formatRescheduledTime(ticket.visitTime || 'the scheduled time')}.`, timestamp: ticket.updatedAt, read: true }
						: null;
				return [
					  { id: `assignment-repair-${ticket.id}`, forRole: 'technician' as const, forUserId: user.technicianId, type: 'assignment' as const, title: 'New Task Assigned', body: `Repair scheduled for ${ticket.subscriber.name} on ${visitDate} at ${ticket.visitTime || 'the scheduled time'}.`, timestamp: ticket.visitDate!, read: true },
					  ...(update ? [{ ...update, read: isRescheduled ? false : true }] : []),
				];
			}),
		];
		await Promise.all(technicianNotifications.map((notification) => prisma.notification.upsert({
			where: { id: notification.id },
			create: notification,
			update: {
				title: notification.title,
				body: notification.body,
				timestamp: notification.timestamp,
			},
		})));
		const persistedTechnicianNotifications = await prisma.notification.findMany({
			where: { id: { in: technicianNotifications.map((notification) => notification.id) } },
			select: { id: true, read: true },
		});
		const readStateById = new Map(persistedTechnicianNotifications.map((notification) => [notification.id, notification.read]));
		const notificationsById = new Map(data.map((notification) => [notification.id, notification]));
		technicianNotifications.forEach((notification) => {
			notificationsById.set(notification.id, {
				...notification,
				read: readStateById.get(notification.id) ?? notification.read,
			});
		});
		return NextResponse.json({
			data: sortNotifications(Array.from(notificationsById.values())),
			error: null,
		});
	}

	const [installations, tickets] = await Promise.all([
		prisma.installation.findMany({ where: { subscriberId: user.subscriberId }, include: { technician: true }, orderBy: { date: 'desc' } }),
		prisma.ticket.findMany({ where: { subscriberId: user.subscriberId, visitDate: { not: null } }, include: { technician: true }, orderBy: { visitDate: 'desc' } }),
	]);
	const reminderNotifications = [
		...installations.map((installation) => ({
			id: `installation-reminder-${installation.id}`,
			forRole: 'subscriber' as const,
			forUserId: user.subscriberId,
			type: 'installation' as const,
			title: 'Installation Scheduled',
			body: `Technician ${installation.technician?.name || 'will'} will visit on ${installation.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${installation.time} for ${installation.type.toLowerCase()}.`,
			timestamp: notificationTimestamp,
			read: true,
		})),
		...tickets.map((ticket) => ({
			id: `repair-reminder-${ticket.id}`,
			forRole: 'subscriber' as const,
			forUserId: user.subscriberId,
			type: 'task' as const,
			title: 'Repair Scheduled',
			body: `Technician ${ticket.technician?.name || 'will'} will visit on ${ticket.visitDate!.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${ticket.visitTime || 'the scheduled time'} for your repair request.`,
			timestamp: notificationTimestamp,
			read: true,
		})),
	];
	return NextResponse.json({ data: sortNotifications([...data, ...reminderNotifications]), error: null });
}
export async function POST(request: Request) { const body = await request.json(); if (!body.forRole || !body.type || !body.title || !body.body) return NextResponse.json({ data: null, error: 'Role, type, title, and body are required.' }, { status: 400 }); const notification = await prisma.notification.create({ data: { forRole: body.forRole, forUserId: body.forUserId || null, type: body.type, title: body.title, body: body.body } }); return NextResponse.json({ data: notification, error: null }, { status: 201 }); }
