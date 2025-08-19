// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../../../components/db.js";
import { users } from "../../../components/schema.js";
import { compare } from "bcryptjs";

// -------------------------
// NEXTAUTH_URL from env
// -------------------------
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Drizzle query using .eq()
        const user = await db.query.users.findFirst({
          where: (u) => u.email.eq(credentials.email),
        });

        if (!user) return null;

        const isValid = await compare(credentials.password, user.hashed_password || "");
        if (!isValid) return null;

        return { id: user.id.toString(), email: user.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;

      const existing = await db.query.users.findFirst({
        where: (u) => u.email.eq(user.email),
      });

      if (existing) {
        // Update user
        await db.update(users)
          .set({
            oauth_provider: account?.provider || null,
            meta: { ...existing.meta, ...profile },
            updated_at: new Date(),
          })
          .where(users.id.eq(existing.id));
      } else {
        // Insert new user
        await db.insert(users).values({
          email: user.email,
          hashed_password: null,
          verified: true,
          oauth_provider: account?.provider || null,
          meta: profile,
          created_at: new Date(),
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
