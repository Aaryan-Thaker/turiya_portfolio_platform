// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "7", 10);
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

// Helper: create a Flask-compatible backend JWT
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) {
    console.warn("createBackendJwt: BACKEND_JWT_SECRET not set!");
    return null;
  }

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
  pages: { signIn: "/auth/signin" },
  session: { strategy: "jwt" },
  jwt: { secret: process.env.NEXTAUTH_SECRET },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=== [signIn callback] ===");
      console.log({ user, account, profile });
      return true; // allow all logins
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id || user.sub || null;
        token.accessToken = account?.access_token || null;
        token.refreshToken = account?.refresh_token || null;
        token.provider = account?.provider || null;

        // Generate backend JWT for Flask
        token.backendJwt = createBackendJwt(token.userId);
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId || null;
      session.accessToken = token.backendJwt || token.accessToken || null; // Flask expects backend JWT
      session.refreshToken = token.refreshToken || null;
      session.provider = token.provider || null;
      return session;
    },
  },

  events: {
    signIn: async (message) => console.log(">>> [Event] signIn:", message),
    signOut: async (message) => console.log(">>> [Event] signOut:", message),
    createUser: async (message) => console.log(">>> [Event] createUser:", message),
    linkAccount: async (message) => console.log(">>> [Event] linkAccount:", message),
    session: async (message) => console.log(">>> [Event] session:", message),
    error: async (message) => console.error(">>> [Event] error:", message),
  },

  debug: true,
});
