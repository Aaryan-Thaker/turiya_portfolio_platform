import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { compare } from 'bcrypt';
import { DrizzleAdapter } from '@next-auth/drizzle-adapter';

export const authOptions = {
  adapter: DrizzleAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const result = await db.select().from(users).where(users.email.eq(credentials.email)).limit(1);
        const user = result[0];
        if (!user) return null;

        const isValid = await compare(credentials.password, user.hashed_password);
        if (!isValid) return null;

        return { id: user.id.toString(), email: user.email };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id;
      return session;
    },
  },
};

export default NextAuth(authOptions);
