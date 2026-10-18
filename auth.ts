import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { DEMO_ACCOUNTS } from '@/app/lib/demo-accounts';

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

      const demo = Object.values(DEMO_ACCOUNTS).find((account) => account.email === email);
      return demo && password === demo.password ? demo : null;
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) { const identity = user as { role?: string; subscriberId?: string; technicianId?: string }; token.role = identity.role; token.subscriberId = identity.subscriberId; token.technicianId = identity.technicianId; } return token; },
    async session({ session, token }) { if (session.user) { session.user.role = token.role as string; session.user.subscriberId = token.subscriberId; session.user.technicianId = token.technicianId; } return session; },
  },
  pages: { signIn: '/login' },
});
