// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pkg from "pg";
import jwt from "jsonwebtoken";

const { Pool } = pkg;

// -------------------------
// PostgreSQL (Neon) connection
// -------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// -------------------------
// Helper: DB lookups
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
        `UPDATE users 
         SET oauth_provider = $1, meta = $2, updated_at = NOW() 
         WHERE email = $3`,
        [
          account.provider,
          JSON.stringify({
            ...(existing.rows[0].meta || {}),
            ...profile,
          }),
          user.email,
        ]
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
// Utility: sign backend JWT
// -------------------------
function createBackendJwt(user) {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    console.error("JWT_SECRET_KEY is not set in environment!");
    return null;
  }

  return jwt.sign(
    {
      user_id: String(user.id),
      email: user.email,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "7d",
    }
  );
}

// -------------------------
// NextAuth config
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

        const isValid = await compare(
          credentials.password,
          user.hashed_password || ""
        );
        if (!isValid) return null;

        return { id: user.id.toString(), email: user.email };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (user?.email && account) {
        try {
          await createOrUpdateOAuthUser(user, account, profile);
        } catch (err) {
          console.error("signIn DB sync error:", err);
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user.sub;
        token.email = user.email;

        // Generate backend JWT
        const backendJwt = createBackendJwt({
          id: token.id,
          email: token.email,
        });
        if (backendJwt) token.accessToken = backendJwt;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = session.user || {};
      session.user.id = token.id;
      session.user.email = token.email;
      session.accessToken = token.accessToken || null;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
