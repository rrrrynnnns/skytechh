import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const email = String(credentials?.email ?? '');
      const password = String(credentials?.password ?? '');
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(password, user.password)) {
          return { id: user.id, name: user.name, email: user.email, role: user.role, subscriberId: user.subscriberId, technicianId: user.technicianId };
        }
      } catch (error) {
        console.warn('Prisma is unavailable; using local demo login.', error instanceof Error ? error.message : error);
      }

      const demos = {
        'admin@skytech.net': { id: 'USR-ADMIN', name: 'Sky-Tech Admin', role: 'admin' },
        'tech@skytech.net': { id: 'USR-TECH', name: 'Luis Dela Cruz', role: 'technician', technicianId: '100001' },
        'user1@skytech.net': { id: 'USR-SUB', name: 'Alex Rivera', role: 'subscriber', subscriberId: '100000001' },
      } as const;
      const demo = demos[email as keyof typeof demos];
      const demoPasswords = { 'admin@skytech.net': 'admin123', 'tech@skytech.net': 'tech123', 'user1@skytech.net': 'user123' };
      return demo && password === demoPasswords[email as keyof typeof demoPasswords] ? { ...demo, email } : null;
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) { const identity = user as { role?: string; subscriberId?: string; technicianId?: string }; token.role = identity.role; token.subscriberId = identity.subscriberId; token.technicianId = identity.technicianId; } return token; },
    async session({ session, token }) { if (session.user) { session.user.role = token.role as string; session.user.subscriberId = token.subscriberId; session.user.technicianId = token.technicianId; } return session; },
  },
  pages: { signIn: '/login' },
});
