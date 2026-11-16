import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { DEMO_ACCOUNTS } from '@/app/lib/demo-accounts';
import { authConfig } from '@/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const email = String(credentials?.email ?? '').trim().toLowerCase();
      const password = String(credentials?.password ?? '');
      try {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const subscriber = await prisma.subscriber.findFirst({ where: { email } });
          if (subscriber) {
            user = await prisma.user.findFirst({
              where: { OR: [{ subscriberId: subscriber.id }, { id: `USR-${subscriber.id}` }] },
            });
            if (user && user.email !== email) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { email },
              });
            }
          }
        }
        if (user && await bcrypt.compare(password, user.password)) {
          return { id: user.id, name: user.name, email: user.email, role: user.role, subscriberId: user.subscriberId, technicianId: user.technicianId };
        }
      } catch (error) {
        console.warn('Prisma is unavailable; using local demo login.', error instanceof Error ? error.message : error);
      }

      const demo = Object.values(DEMO_ACCOUNTS).find((account) => account.email === email);
      return demo && password === demo.password ? demo : null;
    },
  })],
  callbacks: {
    async signIn({ user }) {
      const identity = user as {
        id?: string;
        name?: string | null;
        email?: string | null;
        role?: 'admin' | 'technician' | 'subscriber';
      };
      if (identity.role === 'subscriber' || identity.role === 'technician') {
        try {
          const maintenance = await prisma.maintenanceSettings.findUnique({
            where: { id: 'singleton' },
            select: { enabled: true },
          });
          if (maintenance?.enabled) {
            return false;
          }
        } catch (error) {
          console.error('Unable to check maintenance status during login:', error);
        }
      }
      if (identity.role) {
        try {
          await prisma.systemAuditLog.create({
            data: {
              actorId: identity.id || null,
              actorName: identity.name || null,
              actorEmail: identity.email || null,
              actorRole: identity.role,
              action: 'Logged in',
              resource: 'Authentication',
            },
          });
        } catch (error) {
          console.error('Unable to record login audit log:', error);
        }
      }
      return true;
    },
    ...authConfig.callbacks,
  },
});
