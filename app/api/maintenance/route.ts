import { after, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { apiError, requireRole } from '@/app/lib/api';
import { sendMaintenanceAnnouncementEmail } from '@/app/lib/maintenance-email';

const defaultSettings = {
  id: 'singleton',
  enabled: false,
  category: 'Scheduled Network Maintenance',
  impact: 'Slow Internet / High Latency Advisory',
  title: '',
  description: '',
  startsAt: null,
  restoresAt: null,
};

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;
  try {
    const [settings, announcements, activeSubscriberCount] = await Promise.all([
      prisma.maintenanceSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.maintenanceAnnouncement.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.subscriber.count({ where: { archived: false, status: 'Active' } }),
    ]);
    return NextResponse.json({ data: { settings: settings || defaultSettings, announcements, activeSubscriberCount }, error: null });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;
  try {
    const body = await request.json();
    if (typeof body.title !== 'string' || typeof body.description !== 'string') {
      return NextResponse.json({ data: null, error: 'Announcement title and description are required.' }, { status: 400 });
    }
    const settings = await prisma.maintenanceSettings.upsert({
      where: { id: 'singleton' },
      update: {
        enabled: Boolean(body.enabled),
        category: String(body.category || 'Scheduled Network Maintenance'),
        impact: String(body.impact || 'Slow Internet / High Latency Advisory'),
        title: body.title.trim(),
        description: body.description.trim(),
        startsAt: parseDate(body.startsAt),
        restoresAt: parseDate(body.restoresAt),
      },
      create: {
        id: 'singleton',
        enabled: Boolean(body.enabled),
        category: String(body.category || 'Scheduled Network Maintenance'),
        impact: String(body.impact || 'Slow Internet / High Latency Advisory'),
        title: body.title.trim(),
        description: body.description.trim(),
        startsAt: parseDate(body.startsAt),
        restoresAt: parseDate(body.restoresAt),
      },
    });
    const user = access.session?.user;
    await prisma.systemAuditLog.create({
      data: {
        actorId: user?.id || null,
        actorName: user?.name || null,
        actorEmail: user?.email || null,
        actorRole: 'admin',
        action: 'Updated',
        resource: 'Maintenance Settings',
        resourceId: settings.id,
        details: `${settings.enabled ? 'Enabled' : 'Disabled'} maintenance mode.`,
      },
    });
    return NextResponse.json({ data: settings, error: null });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;
  try {
    const body = await request.json();
    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ data: null, error: 'Announcement title and description are required.' }, { status: 400 });
    }
    const subscribers = await prisma.subscriber.findMany({ where: { archived: false }, select: { id: true, email: true } });
    const category = String(body.category || 'Scheduled Network Maintenance');
    const impact = String(body.impact || 'Slow Internet / High Latency Advisory');
    const title = String(body.title).trim();
    const description = String(body.description).trim();
    const startsAt = parseDate(body.startsAt);
    const restoresAt = parseDate(body.restoresAt);
    const dispatchEmail = body.dispatchEmail === true;
    if (dispatchEmail && !process.env.RESEND_API_KEY && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)) {
      return NextResponse.json({ data: null, error: 'Maintenance email is not configured. Disable email dispatch or contact an administrator.' }, { status: 503 });
    }
    const announcement = await prisma.maintenanceAnnouncement.create({
      data: { category, impact, title, description, startsAt, restoresAt, sentCount: subscribers.length },
    });
    const user = access.session?.user;
    await prisma.systemAuditLog.create({
      data: {
        actorId: user?.id || null,
        actorName: user?.name || null,
        actorEmail: user?.email || null,
        actorRole: 'admin',
        action: 'Broadcast',
        resource: 'Maintenance Announcement',
        resourceId: announcement.id,
        details: `${subscribers.length} subscriber accounts targeted.`,
      },
    });

    after(async () => {
      try {
        await Promise.all([
          prisma.$transaction(subscribers.map((subscriber) => prisma.notification.create({
            data: {
              forRole: 'subscriber',
              forUserId: subscriber.id,
              type: 'maintenance',
              title: `Maintenance: ${title}`,
              body: `${description}${restoresAt ? ` Expected restoration: ${restoresAt.toLocaleString('en-PH')}.` : ''}`,
            },
          }))),
          dispatchEmail
            ? Promise.all(subscribers.map((subscriber) => sendMaintenanceAnnouncementEmail(subscriber.email, {
              title,
              description,
              impact,
              restoresAt,
            })))
            : Promise.resolve(),
        ]);
      } catch (error) {
        console.error('Maintenance broadcast delivery failed.', error);
      }
    });

    return NextResponse.json({ data: announcement, error: null }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
