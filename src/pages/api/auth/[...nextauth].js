// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../../../components/db.js";
import { users } from "../../../components/schema.js";
import { compare } from "bcryptjs";

// -------------------------
// Helper function
// -------------------------
async function findUserByEmail(email) {
  const user = await db.query.users.findFirst({
    where: (u) => u.email.equals(email)
  });
  return user || null;
}

// -------------------------
// NextAuth options
// -------------------------
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

        const user = await findUserByEmail(credentials.email);
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

      const existing = await findUserByEmail(user.email);

      if (existing) {
        await db.update(users).set({
          oauth_provider: account?.provider || null,
          meta: { ...existing.meta, ...profile },
          updated_at: new Date(),
        }).where(users.id.equals(existing.id));
      } else {
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
