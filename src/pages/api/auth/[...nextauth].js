// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "7", 10);
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

// Helper to create a backend JWT for Flask
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) {
    console.warn("createBackendJwt: BACKEND_JWT_SECRET not set!");
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;
  const payload = {
    user_id: String(userId),
    iss: BACKEND_JWT_ISS,
    aud: BACKEND_JWT_AUD,
  };
  return jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
    algorithm: BACKEND_JWT_ALGO,
    expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
  });
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
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);
      console.log("email:", email);
      console.log("credentials:", credentials);
      try {
        return true; // allow all logins
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }
    },

    async jwt({ token, user, account, profile }) {
      console.log("=== [jwt callback] BEFORE ===");
      console.log("token:", token);
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);

      try {
        if (user) {
          token.userId = user.id || user.sub || null;
          token.accessToken = account?.access_token || null;
          token.refreshToken = account?.refresh_token || null;
          token.provider = account?.provider || null;

          // Generate backend JWT compatible with Flask
          const backendJwt = createBackendJwt(token.userId);
          token.backendJwt = backendJwt;
          console.log("Generated backend JWT:", backendJwt);
        }

        console.log("=== [jwt callback] AFTER ===");
        console.log("token:", token);
        return token;
      } catch (err) {
        console.error("Error in jwt callback:", err);
        return token;
      }
    },

    async session({ session, token, user }) {
      console.log("=== [session callback] BEFORE ===");
      console.log("session:", session);
      console.log("token:", token);
      console.log("user:", user);

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.backendJwt || token.accessToken || null; // Flask expects backend JWT here
        session.refreshToken = token.refreshToken || null;
        session.provider = token.provider || null;

        console.log("=== [session callback] AFTER ===");
        console.log("session:", session);

        return session;
      } catch (err) {
        console.error("Error in session callback:", err);
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
