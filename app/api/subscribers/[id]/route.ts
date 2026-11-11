import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) { const { id } = await context.params; return NextResponse.json({ data: await prisma.subscriber.findUnique({ where: { id } }), error: null }); }
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json();
  const normalizedEmail = body.email === undefined ? undefined : String(body.email).trim().toLowerCase();
  const normalizedPlan = body.plan ? String(body.plan).replace(/\s+/g, '_').replace(/_Mbps$/, 'Mbps') : undefined;

  try {
    const subscriber = await prisma.$transaction(async (transaction) => {
      const current = await transaction.subscriber.findUniqueOrThrow({ where: { id } });
      const updated = await transaction.subscriber.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
          ...(body.contact !== undefined ? { contact: body.contact } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.province !== undefined ? { province: body.province } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.barangay !== undefined ? { barangay: body.barangay } : {}),
          ...(body.street !== undefined ? { street: body.street } : {}),
          ...(body.zipCode !== undefined ? { zipCode: body.zipCode } : {}),
          ...(normalizedPlan !== undefined ? { plan: normalizedPlan as 'Fiber_25Mbps' | 'Fiber_50Mbps' | 'Fiber_100Mbps' | 'Fiber_200Mbps' | 'Fiber_300Mbps' } : {}),
          ...(body.status !== undefined ? { status: body.status.replace(' ', '_') } : {}),
          ...(body.connectionDate !== undefined ? { connectionDate: new Date(body.connectionDate) } : {}),
          ...(typeof body.archived === 'boolean' ? { archived: body.archived } : {}),
        },
      });

      if (normalizedEmail !== undefined || body.name !== undefined) {
        await transaction.user.updateMany({
          where: { OR: [{ subscriberId: id }, { id: `USR-${id}` }, { email: current.email }] },
          data: {
            ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
            ...(body.name !== undefined ? { name: body.name } : {}),
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ data: subscriber, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unable to update subscriber.' },
      { status: 500 },
    );
  }
}
export async function DELETE(_: Request, context: Context) { const { id } = await context.params; await prisma.$transaction([prisma.user.deleteMany({ where: { subscriberId: id } }), prisma.subscriber.delete({ where: { id } })]); return new NextResponse(null, { status: 204 }); }
