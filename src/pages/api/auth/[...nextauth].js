// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "7", 10);
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

function createBackendJwt(userId) {
  console.log("[createBackendJwt] userId:", userId);
  if (!BACKEND_JWT_SECRET) {
    console.warn("[createBackendJwt] WARNING: BACKEND_JWT_SECRET not set");
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

  console.log("[createBackendJwt] payload:", payload);

  try {
    const token = jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
      algorithm: BACKEND_JWT_ALGO,
      expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
    });
    console.log("[createBackendJwt] token generated:", token);
    return token;
  } catch (err) {
    console.error("[createBackendJwt] ERROR signing JWT:", err);
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

  session: { strategy: "jwt" },

  jwt: { secret: process.env.NEXTAUTH_SECRET },

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("=== [signIn callback] ===");
      console.log({ user, account, profile, email, credentials });
      return true; // allow all sign-ins
    },

    async jwt({ token, user, account, profile }) {
      console.log("=== [jwt callback] BEFORE ===");
      console.log({ token, user, account, profile });

      try {
        if (user && account) {
          console.log("[jwt callback] new login detected, creating backend JWT...");
          token.userId = user.id || null;
          token.provider = account.provider || null;
          const backendJwt = createBackendJwt(token.userId);
          token.accessToken = backendJwt;
          token.refreshToken = account.refresh_token || null;
        }

        console.log("=== [jwt callback] AFTER ===");
        console.log(token);
        return token;
      } catch (err) {
        console.error("[jwt callback] ERROR:", err);
        return token;
      }
    },

    async session({ session, token, user }) {
      console.log("=== [session callback] BEFORE ===");
      console.log({ session, token, user });

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.accessToken || null;
        session.refreshToken = token.refreshToken || null;
        session.provider = token.provider || null;

        console.log("=== [session callback] AFTER ===");
        console.log(session);

        return session;
      } catch (err) {
        console.error("[session callback] ERROR:", err);
        return session;
      }
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
