import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getScheduleDayRange, normalizeScheduleTime } from '@/app/lib/schedule';
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		const body = await request.json();
		const requestedStatus = body.status?.replaceAll(' ', '_');
		const status = requestedStatus === 'Installation_Rescheduled' ? 'Cancelled' : requestedStatus;
		const currentInstallation = await prisma.installation.findUnique({ where: { id }, select: { technicianId: true } });
		const selectedTechnician = body.technicianId
			? await prisma.technician.findUnique({ where: { id: body.technicianId }, select: { id: true } })
			: body.technicianName
				? await prisma.technician.findFirst({ where: { name: { equals: body.technicianName, mode: 'insensitive' } }, select: { id: true } })
				: null;
		const isRescheduled = status === 'Cancelled';
		const technicianId = selectedTechnician?.id || currentInstallation?.technicianId;
		if (!technicianId && !isRescheduled) return NextResponse.json({ data: null, error: 'A valid technician is required.' }, { status: 400 });
		if (technicianId && body.date && body.time) {
			const { start, end } = getScheduleDayRange(body.date);
			const normalizedTime = normalizeScheduleTime(body.time);
			const [installations, tickets] = await Promise.all([
				prisma.installation.findMany({ where: { technicianId, date: { gte: start, lt: end }, NOT: { id } }, select: { time: true } }),
				prisma.ticket.findMany({ where: { technicianId, visitDate: { gte: start, lt: end } }, select: { visitTime: true } }),
			]);
			if (installations.some((item) => normalizeScheduleTime(item.time) === normalizedTime) || tickets.some((item) => normalizeScheduleTime(item.visitTime) === normalizedTime)) {
				return NextResponse.json({ data: null, error: 'This technician already has a schedule at that date and time.' }, { status: 409 });
			}
		}
		if (status) await prisma.$executeRaw`UPDATE "Installation" SET "status" = CAST(${status} AS "InstallationStatus") WHERE "id" = ${id}`;
		const installation = await prisma.installation.update({ where: { id }, data: { technicianId: isRescheduled ? null : technicianId, address: body.address, type: body.type, date: isRescheduled ? null : body.date ? new Date(body.date) : undefined, time: isRescheduled ? null : normalizeScheduleTime(body.time), notes: body.notes } });
		return NextResponse.json(status ? await prisma.installation.findUnique({ where: { id } }) : installation);
	} catch (error) {
		return NextResponse.json({ data: null, error: error instanceof Error ? error.message : 'Unable to update installation.' }, { status: 500 });
	}
}
