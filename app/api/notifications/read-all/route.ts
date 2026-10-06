import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';
export async function PUT() {
	const access = await requireRole(['admin', 'technician', 'subscriber']);
	if (access.response) return access.response;
	const user = access.session?.user;
	await prisma.notification.updateMany({
		where: user?.role === 'subscriber'
			? { forRole: 'subscriber', OR: [{ forUserId: null }, { forUserId: user.subscriberId }] }
			: user?.role === 'technician'
				? { forRole: 'technician', OR: [{ forUserId: null }, { forUserId: user.technicianId }] }
				: { forRole: 'admin' },
		data: { read: true },
	});
	return NextResponse.json({ data: { updated: true }, error: null });
}
