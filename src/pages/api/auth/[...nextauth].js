import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.NEXTAUTH_SECRET; // same secret for frontend & backend
const BACKEND_JWT_ALGO = "HS256"; // algorithm for JWT
const BACKEND_JWT_EXPIRE_DAYS = 7;

// Helper: create a backend JWT compatible with Flask
function createBackendJwt(userId) {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;

    const payload = {
      user_id: String(userId),
      iat: nowSec,
      exp: expSec,
      iss: "turiyaportfolioplatform",
      aud: "frontend",
    };

    const token = jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
      algorithm: BACKEND_JWT_ALGO,
      expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
    });

    console.log("[createBackendJwt] payload:", payload);
    console.log("[createBackendJwt] token:", token);

    return token;
  } catch (err) {
    console.error("[createBackendJwt] Error:", err);
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
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);
      console.log("email:", email);
      console.log("credentials:", credentials);

      return true; // allow all logins
    },

    async jwt({ token, user, account, profile }) {
      console.log("=== [jwt callback] BEFORE ===");
      console.log("token:", token);
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);

      try {
        if (user) {
          token.userId = user.id || user.sub;
        }

        // generate backend JWT only once
        if (!token.backendJwt && token.userId) {
          token.backendJwt = createBackendJwt(token.userId);
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
      console.log("=== [session callback] BEFORE ===");
      console.log("session:", session);
      console.log("token:", token);
      console.log("user:", user);

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.backendJwt || null; // ✅ backend JWT for Flask
        session.provider = token.provider || null;

        console.log("=== [session callback] AFTER ===");
        console.log("session:", session);
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
      } catch (e) {}
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
