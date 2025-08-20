// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.NEXTAUTH_SECRET; // same secret for frontend & backend
const BACKEND_JWT_ALGO = "HS256";
const BACKEND_JWT_EXPIRE_DAYS = 7; // adjust if needed

// Helper: create backend JWT
function createBackendJwt(userId) {
  if (!userId) {
    console.warn("[createBackendJwt] userId is missing!");
    return null;
  }

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
    console.log("[createBackendJwt] Generated token:", token);
    return token;
  } catch (err) {
    console.error("[createBackendJwt] Error signing token:", err);
    return null;
  }
}

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
    async signIn({ user, account, profile, email, credentials }) {
      console.log("=== [signIn callback] ===");
      console.log({ user, account, profile, email, credentials });
      return true; // allow all
    },

    async jwt({ token, user, account, profile }) {
      console.log("=== [jwt callback] BEFORE ===");
      console.log({ token, user, account, profile });

      try {
        if (user && account) {
          // IMPORTANT: Google OAuth does not provide user.id, use user.sub instead
          const userId = user.id || user.sub;
          console.log("[jwt callback] Resolved userId:", userId);

          token.userId = userId;
          token.accessToken = createBackendJwt(userId);
          token.provider = account.provider;
        }

        console.log("=== [jwt callback] AFTER ===");
        console.log("token:", token);

        return token;
      } catch (err) {
        console.error("[jwt callback] Error:", err);
        return token;
      }
    },

    async session({ session, token, user }) {
      console.log("=== [session callback] ===");
      console.log({ session, token, user });

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.accessToken || null;
        session.provider = token.provider || null;

        console.log("[session callback] Final session:", session);
        return session;
      } catch (err) {
        console.error("[session callback] Error:", err);
        return session;
      }
    },

    async redirect({ url, baseUrl }) {
      console.log("[redirect callback] url:", url, "baseUrl:", baseUrl);
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch (e) {
        console.warn("[redirect callback] Invalid URL:", url);
      }
      return baseUrl;
    },
  },

  events: {
    async signIn(message) { console.log(">>> [Event] signIn:", message); },
    async signOut(message) { console.log(">>> [Event] signOut:", message); },
    async createUser(message) { console.log(">>> [Event] createUser:", message); },
    async linkAccount(message) { console.log(">>> [Event] linkAccount:", message); },
    async session(message) { console.log(">>> [Event] session:", message); },
    async error(message) { console.error(">>> [Event] error:", message); },
  },

  debug: true,
});
