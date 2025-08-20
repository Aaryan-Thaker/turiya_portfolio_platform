// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pkg from "pg";
import jsonwebtoken from "jsonwebtoken";
const { Pool } = pkg;

// -------------------------
// PostgreSQL (Neon) connection
// -------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// -------------------------
// Backend JWT config
// -------------------------
// This secret should match the one your Flask backend uses (JWT_SECRET_KEY).
const BACKEND_JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "7", 10);
// Issuer/audience defaults should match Flask verify expectations
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

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
// Utility: create backend JWT matching Flask expectations
// -------------------------
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) {
    console.warn("createBackendJwt: BACKEND_JWT_SECRET is not set; returning null");
    return null;
  }

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

        // Minimal shape expected by NextAuth (id and email)
        return { id: user.id.toString(), email: user.email };
      },
    }),
  ],

  callbacks: {
    // Keep DB population behavior for OAuth sign-ins
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      if (account) {
        try {
          await createOrUpdateOAuthUser(user, account, profile);
        } catch (err) {
          console.error("signIn callback createOrUpdateOAuthUser error:", err);
          // don't block sign-in for DB write failures
        }
      }
      return true;
    },

    // jwt callback: runs on sign-in and subsequent requests.
    // We'll add a backend-signed JWT to token.accessToken the first time.
    async jwt({ token, user }) {
      // If user object present, it's initial sign in
      if (user) {
        token.id = user.id || user.sub;
      }

      // If we don't have a backend access token yet and we have an id, create one
      if (!token.accessToken && token.id) {
        try {
          const backendJwt = createBackendJwt(token.id);
          if (backendJwt) token.accessToken = backendJwt;
        } catch (err) {
          console.error("Failed to create backend JWT in jwt callback:", err);
        }
      }

      return token;
    },

    // Expose the backend access token on the session for SSR / client usage
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id;
        // session.accessToken is what your index route reads and sends as Bearer
        session.accessToken = token.accessToken || null;
      }
      return session;
    },

    // safe redirect logic
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch (e) {}
      return baseUrl;
    },
  },

  // Keep your secret - NEXTAUTH_SECRET should be set in env
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
