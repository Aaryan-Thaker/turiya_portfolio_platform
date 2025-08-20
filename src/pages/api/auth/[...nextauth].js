// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pkg from "pg";
const { Pool } = pkg;

// -------------------------
// PostgreSQL (Neon) connection
// -------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// -------------------------
// Helper functions
// -------------------------
async function getUserByEmail(email) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
}

async function createOrUpdateOAuthUser(user, account, profile) {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [user.email]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET oauth_provider = $1, meta = $2, updated_at = NOW() WHERE email = $3`,
        [account.provider, JSON.stringify({ ...existing.rows[0].meta, ...profile }), user.email]
      );
    } else {
      await client.query(
        `INSERT INTO users (email, hashed_password, verified, oauth_provider, meta, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [user.email, null, true, account.provider, JSON.stringify(profile)]
      );
    }
  } finally {
    client.release();
  }
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

        const user = await getUserByEmail(credentials.email);
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
      if (account) await createOrUpdateOAuthUser(user, account, profile);
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
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin absolute URLs
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch (e) {}
      // Fallback: home
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
