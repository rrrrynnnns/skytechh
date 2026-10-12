import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getScheduleDayRange, normalizeScheduleTime } from '@/app/lib/schedule';
import { requireRole } from '@/app/lib/api';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
	const access = await requireRole(['admin', 'technician']);
	if (access.response) return access.response;

	const { id } = await context.params;
	const { status, adminNote, technicianId, visitDate, visitTime } = await request.json();
	const normalizedStatus = String(status || '').replace(/\s+/g, '_');
	const allowedStatuses = ['Open', 'In_Progress', 'Resolved', 'Closed'];
	if (!allowedStatuses.includes(normalizedStatus)) {
		return NextResponse.json({ data: null, error: 'Invalid ticket status.' }, { status: 400 });
	}

	const data = {
		status: normalizedStatus as 'Open' | 'In_Progress' | 'Resolved' | 'Closed',
		adminNote,
		...(access.session?.user?.role === 'admin' ? {
			technicianId: technicianId || null,
			visitDate: visitDate ? new Date(`${visitDate}T12:00:00.000Z`) : null,
			visitTime: visitTime || null,
		} : normalizedStatus === 'Closed' ? {
			technicianId: null,
			visitDate: null,
			visitTime: null,
		} : {}),
	};
	if (access.session?.user?.role === 'admin' && technicianId && visitDate && visitTime) {
		const { start, end } = getScheduleDayRange(visitDate);
		const normalizedTime = normalizeScheduleTime(visitTime);
		const [installations, tickets] = await Promise.all([
			prisma.installation.findMany({ where: { technicianId, date: { gte: start, lt: end }, NOT: { id } }, select: { time: true } }),
			prisma.ticket.findMany({ where: { technicianId, visitDate: { gte: start, lt: end }, NOT: { id } }, select: { visitTime: true } }),
		]);
		if (installations.some((item) => normalizeScheduleTime(item.time) === normalizedTime) || tickets.some((item) => normalizeScheduleTime(item.visitTime) === normalizedTime)) {
			return NextResponse.json({ data: null, error: 'This technician already has a schedule at that date and time.' }, { status: 409 });
		}
	}

	return NextResponse.json({
		data: await prisma.ticket.update({ where: { id }, data }),
		error: null,
	});
}
