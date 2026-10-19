import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const planValues = ['Fiber_25Mbps', 'Fiber_50Mbps', 'Fiber_100Mbps', 'Fiber_200Mbps', 'Fiber_300Mbps'] as const;
type PlanValue = (typeof planValues)[number];

function normalizePlan(value: unknown): PlanValue | null {
	const normalized = String(value).trim().replace(/\s+/g, '_').replace(/_Mbps$/, 'Mbps');
	return planValues.find((plan) => plan === normalized) ?? null;
}

export async function GET() {
	try {
		const bookings = await prisma.booking.findMany({ orderBy: { submittedAt: 'desc' } });
		return NextResponse.json({ data: bookings, error: null });
	} catch (error) {
		return NextResponse.json({ data: null, error: error instanceof Error ? error.message : 'Unable to load bookings.' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		if (!body.name || !body.email || !body.contact || !body.address || !body.plan || !body.preferredDate) {
			return NextResponse.json({ data: null, error: 'Name, email, contact, address, plan, and preferred date are required.' }, { status: 400 });
		}
		const plan = normalizePlan(body.plan);
		if (!plan) {
			return NextResponse.json({ data: null, error: 'The selected internet plan is not supported.' }, { status: 400 });
		}
		const existingBookings = await prisma.booking.findMany({ select: { id: true } });
		const numericIds = existingBookings
			.map(({ id }) => Number(id))
			.filter((id) => Number.isSafeInteger(id) && id >= 1000000001);
		const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1000000001;
		const booking = await prisma.booking.create({ data: { id: String(nextId), name: body.name, email: body.email, contact: body.contact, address: body.address, plan, preferredDate: new Date(body.preferredDate), status: 'Pending', notes: body.message || null } });
		return NextResponse.json({ data: booking, error: null }, { status: 201 });
	} catch (error) {
		return NextResponse.json({ data: null, error: error instanceof Error ? error.message : 'Unable to create booking.' }, { status: 500 });
	}
}
