import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const identity = user as { role?: string; subscriberId?: string; technicianId?: string };
        token.role = identity.role;
        token.subscriberId = identity.subscriberId;
        token.technicianId = identity.technicianId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.subscriberId = token.subscriberId;
        session.user.technicianId = token.technicianId;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
} satisfies NextAuthConfig;
