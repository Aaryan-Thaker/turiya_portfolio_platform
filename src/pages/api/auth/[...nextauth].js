// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pkg from "pg";
import jsonwebtoken from "jsonwebtoken";
const { Pool } = pkg;

// -------------------------
// PostgreSQL connection
// -------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// -------------------------
// Backend JWT config
// -------------------------
const BACKEND_JWT_SECRET =
  process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(
  process.env.JWT_EXPIRE_DAYS || "7",
  10
);
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

// -------------------------
// DB helpers
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
      const dbUser = existing.rows[0];
      await client.query(
        `UPDATE users SET oauth_provider = $1, meta = $2, updated_at = NOW() WHERE email = $3`,
        [
          account.provider,
          JSON.stringify({ ...dbUser.meta, ...profile }),
          user.email,
        ]
      );
      return dbUser; // return row with UUID
    } else {
      const insert = await client.query(
        `INSERT INTO users (email, hashed_password, verified, oauth_provider, meta, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [user.email, null, true, account.provider, JSON.stringify(profile)]
      );
      return insert.rows[0];
    }
  } finally {
    client.release();
  }
}

// -------------------------
// Utility: backend JWT
// -------------------------
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;

  const payload = {
    user_id: String(userId),
    iat: nowSec,
    exp: expSec,
    iss: BACKEND_JWT_ISS,
    aud: BACKEND_JWT_AUD,
  };

  return jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
    algorithm: BACKEND_JWT_ALGO,
    expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
  });
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
    // On OAuth sign-in: make sure user exists in DB, and attach DB UUID
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;

      if (account?.provider === "google") {
        try {
          const dbUser = await createOrUpdateOAuthUser(user, account, profile);
          if (dbUser) {
            // overwrite NextAuth user with DB UUID
            user.id = dbUser.id.toString();
          }
        } catch (err) {
          console.error("signIn DB sync error:", err);
        }
      }

      return true;
    },

    // JWT callback: attach backend JWT
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id; // DB UUID now
      }

      if (!token.accessToken && token.id) {
        try {
          token.accessToken = createBackendJwt(token.id);
        } catch (err) {
          console.error("Failed to create backend JWT:", err);
        }
      }

      return token;
    },

    // Session callback: expose backend JWT
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id;
        session.accessToken = token.accessToken || null;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
