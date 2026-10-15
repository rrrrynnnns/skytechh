import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';
import { formatPersonName } from '@/app/lib/name';
import { getScheduleDayRange, normalizeScheduleTime } from '@/app/lib/schedule';
export async function GET() {
	const access = await requireRole(['admin', 'technician', 'subscriber']); if (access.response) return access.response;
	const where = access.session?.user?.role === 'technician' && access.session.user.technicianId
		? { technicianId: access.session.user.technicianId }
		: access.session?.user?.role === 'subscriber' && access.session.user.subscriberId
			? { subscriberId: access.session.user.subscriberId }
			: undefined;
	const installations = await prisma.installation.findMany({ where, orderBy: { date: 'asc' }, include: { technician: true } });
	const data = await Promise.all(installations.map(async (installation) => ({ ...installation, subscriber: await prisma.subscriber.findUnique({ where: { id: installation.subscriberId }, select: { name: true, address: true, province: true, city: true, barangay: true, street: true, zipCode: true } }) })));
	return NextResponse.json({ data, error: null });
}
export async function POST(request: Request) {
	const access = await requireRole(['admin']); if (access.response) return access.response;
	try {
		const body = await request.json();
		if ((!body.subscriberId && !body.subscriberName) || (!body.technicianId && !body.technicianName) || !body.date || !body.time || !body.type) return NextResponse.json({ data: null, error: 'Subscriber, technician, date, time, and type are required.' }, { status: 400 });
		const subscriber = body.subscriberId
			? await prisma.subscriber.findUnique({ where: { id: body.subscriberId } })
			: (await prisma.subscriber.findFirst({ where: { name: { equals: body.subscriberName, mode: 'insensitive' } } })) || (await prisma.subscriber.findMany()).find((item) => formatPersonName(item.name).toLowerCase() === String(body.subscriberName).toLowerCase());
		const technician = body.technicianId
			? await prisma.technician.findUnique({ where: { id: body.technicianId } })
			: (await prisma.technician.findFirst({ where: { name: { equals: body.technicianName, mode: 'insensitive' } } })) || (await prisma.technician.findMany()).find((item) => formatPersonName(item.name).toLowerCase() === String(body.technicianName).toLowerCase());
		if (!subscriber || !technician) return NextResponse.json({ data: null, error: 'Selected subscriber or technician was not found.' }, { status: 404 });
		const address = body.address || subscriber.address;
		if (!address) return NextResponse.json({ data: null, error: 'The selected subscriber does not have an address.' }, { status: 400 });
		const { start, end } = getScheduleDayRange(body.date);
		const normalizedTime = normalizeScheduleTime(body.time);
		const installation = await prisma.$transaction(async (transaction) => {
			const existingSubscriberInstallation = await transaction.installation.findFirst({ where: { subscriberId: subscriber.id }, select: { id: true } });
			if (existingSubscriberInstallation) {
				throw new Error('This subscriber already has an installation.');
			}
			const [installations, tickets] = await Promise.all([
				transaction.installation.findMany({ where: { technicianId: technician.id, date: { gte: start, lt: end } }, select: { time: true } }),
				transaction.ticket.findMany({ where: { technicianId: technician.id, visitDate: { gte: start, lt: end } }, select: { visitTime: true } }),
			]);
			if (
				installations.some((item) => normalizeScheduleTime(item.time) === normalizedTime) ||
				tickets.some((item) => normalizeScheduleTime(item.visitTime) === normalizedTime)
			) {
				throw new Error('This technician already has a schedule at that date and time.');
			}
			const existingInstallations = await transaction.installation.findMany({ select: { id: true } });
			const highestId = existingInstallations.reduce((highest, installation) => { const numericId = /^\d{7}$/.test(installation.id) ? Number(installation.id) : 1000000; return Math.max(highest, numericId); }, 1000000);
			return transaction.installation.create({ data: { id: String(highestId + 1), subscriberId: subscriber.id, technicianId: technician.id, address, date: new Date(body.date), time: normalizedTime, type: body.type, status: body.status || 'Scheduled', notes: body.notes || null } });
		}, { isolationLevel: 'Serializable' });
		return NextResponse.json({ data: installation, error: null }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.message === 'This technician already has a schedule at that date and time.') {
			return NextResponse.json({ data: null, error: error.message }, { status: 409 });
		}
		if (error instanceof Error && error.message === 'This subscriber already has an installation.') {
			return NextResponse.json({ data: null, error: error.message }, { status: 409 });
		}
		return NextResponse.json({ data: null, error: error instanceof Error ? error.message : 'Unable to create installation.' }, { status: 500 });
	}
}
