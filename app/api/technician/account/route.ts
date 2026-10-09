import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function GET() {
  const access = await requireRole(['technician']);
  if (access.response) return access.response;
  const technicianId = access.session?.user?.technicianId;
  if (!technicianId) return NextResponse.json({ data: null, error: 'Technician account is not linked.' }, { status: 404 });

  const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!technician) return NextResponse.json({ data: null, error: 'Technician account was not found.' }, { status: 404 });
  return NextResponse.json({ data: technician, error: null });
}

export async function PUT(request: Request) {
  const access = await requireRole(['technician']);
  if (access.response) return access.response;
  const technicianId = access.session?.user?.technicianId;
  if (!technicianId) return NextResponse.json({ data: null, error: 'Technician account is not linked.' }, { status: 404 });

  const body = await request.json();
  if (!body.name || !body.email || !body.contact) return NextResponse.json({ data: null, error: 'Name, email, and contact are required.' }, { status: 400 });
  const technician = await prisma.technician.update({
    where: { id: technicianId },
    data: { name: body.name, email: body.email, contact: body.contact },
  });
  return NextResponse.json({ data: technician, error: null });
}
