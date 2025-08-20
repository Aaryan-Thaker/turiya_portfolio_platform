// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

// -------------------------
// Backend JWT config
// -------------------------
const BACKEND_JWT_SECRET = process.env.NEXTAUTH_SECRET; // use same secret as frontend
const BACKEND_JWT_ALGO = "HS256";
const BACKEND_JWT_EXPIRE_DAYS = 7;

// -------------------------
// Helper: create backend JWT
// -------------------------
function createBackendJwt(userId) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;

  const payload = {
    user_id: String(userId),
    iat: nowSec,
    exp: expSec,
  };

  try {
    const token = jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
      algorithm: BACKEND_JWT_ALGO,
      expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
    });
    console.log("[createBackendJwt] generated token:", token);
    return token;
  } catch (err) {
    console.error("[createBackendJwt] error signing token:", err);
    return null;
  }
}

// -------------------------
// NextAuth configuration
// -------------------------
export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=== [signIn] callback ===");
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);
      return true; // allow all logins
    },

    async jwt({ token, user, account }) {
      console.log("=== [jwt] callback ===");
      console.log("incoming token:", token);
      console.log("user:", user);
      console.log("account:", account);

      // On first login
      if (user && account) {
        const userId = user.id || user.sub; // Google OAuth uses 'sub' as ID
        token.userId = userId;
        token.accessToken = createBackendJwt(userId); // backend JWT for API
        token.refreshToken = account.refresh_token || null;
        token.provider = account.provider;
        console.log("[jwt] new login - token populated:", token);
      }

      // Warn if accessToken is missing
      if (!token.accessToken) {
        console.warn("[jwt] WARNING: token.accessToken missing!", token);
      }

      return token;
    },

    async session({ session, token }) {
      console.log("=== [session] callback ===");
      console.log("session before:", session);
      console.log("token:", token);

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.accessToken || null;
        session.refreshToken = token.refreshToken || null;
        session.provider = token.provider || null;

        console.log("session after:", session);
      } catch (err) {
        console.error("[session] callback error:", err);
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("[redirect] url:", url);
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch (e) {
        console.error("[redirect] invalid URL:", url, e);
      }
      return baseUrl;
    },
  },

  events: {
    async signIn(message) {
      console.log(">>> [Event] signIn:", message);
    },
    async signOut(message) {
      console.log(">>> [Event] signOut:", message);
    },
    async createUser(message) {
      console.log(">>> [Event] createUser:", message);
    },
    async linkAccount(message) {
      console.log(">>> [Event] linkAccount:", message);
    },
    async session(message) {
      console.log(">>> [Event] session:", message);
    },
    async error(message) {
      console.error(">>> [Event] error:", message);
    },
  },

  debug: true,
});
