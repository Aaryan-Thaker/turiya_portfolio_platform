// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pkg from "pg";
import jwt from "jsonwebtoken";

const { Pool } = pkg;

/** --------- Postgres (Neon) --------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** --------- Backend JWT settings (MUST match Flask) --------- */
const BACKEND_JWT_SECRET =
  process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(
  process.env.JWT_EXPIRE_DAYS || "7",
  10
);
/** These defaults match your Flask verify_jwt() */
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

/** --------- DB helpers --------- */
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
      const priorMeta = existing.rows[0].meta || {};
      await client.query(
        `UPDATE users
           SET oauth_provider = $1,
               meta = $2,
               updated_at = NOW()
         WHERE email = $3`,
        [account.provider, JSON.stringify({ ...priorMeta, ...profile }), user.email]
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

/** --------- Mint backend JWT (for Flask) --------- */
function mintBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;

  const payload = {
    user_id: String(userId),
    iat: now,
    exp,
    iss: BACKEND_JWT_ISS,
    aud: BACKEND_JWT_AUD,
  };

  return jwt.sign(payload, BACKEND_JWT_SECRET, {
    algorithm: BACKEND_JWT_ALGO,
    expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
  });
}

/** --------- NextAuth config --------- */
export const authOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET, // keep this set

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
        const ok = await compare(credentials.password, user.hashed_password || "");
        if (!ok) return null;
        return { id: user.id.toString(), email: user.email };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
  },

  callbacks: {
    /** Ensure user exists/updated on OAuth sign-in */
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      if (account) {
        try {
          await createOrUpdateOAuthUser(user, account, profile);
        } catch (e) {
          console.error("signIn DB sync error:", e);
        }
      }
      return true;
    },

    /** Store our own backend JWT in the NextAuth JWT */
    async jwt({ token, user }) {
      // On initial sign-in, persist id
      if (user) {
        token.id = user.id || user.sub;
      }
      // If we don't have a backend token yet, mint one
      if (!token.accessToken && token.id) {
        try {
          token.accessToken = mintBackendJwt(token.id);
        } catch (e) {
          console.error("Mint backend JWT failed:", e);
        }
      }
      return token;
    },

    /** Expose backend token on the session for SSR/client fetches */
    async session({ session, token }) {
      session.user = session.user || {};
      if (token?.id) session.user.id = token.id;
      session.accessToken = token?.accessToken || null; // <- your frontend reads this
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);
