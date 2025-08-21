// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET;
const BACKEND_JWT_ALGO = process.env.JWT_ALGORITHM || "HS256";
const BACKEND_JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "7", 10);
const BACKEND_JWT_ISS = process.env.BACKEND_JWT_ISS || "your-app-name";
const BACKEND_JWT_AUD = process.env.BACKEND_JWT_AUD || "your-app-client";

// Helper: create Flask-compatible backend JWT
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) return null;

  return jsonwebtoken.sign(
    { user_id: String(userId), iss: BACKEND_JWT_ISS, aud: BACKEND_JWT_AUD },
    BACKEND_JWT_SECRET,
    { algorithm: BACKEND_JWT_ALGO, expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d` }
  );
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
      console.log("SignIn:", { userId: user.id, provider: account?.provider });
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id || user.sub;
        token.backendJwt = createBackendJwt(token.userId);
        token.provider = account?.provider || null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId || null;
      session.accessToken = token.backendJwt || null; // Flask expects backend JWT
      session.provider = token.provider || null;
      return session;
    },
  },

  events: {
    signIn: async (msg) => console.log("Event signIn:", msg),
    signOut: async (msg) => console.log("Event signOut:", msg),
    createUser: async (msg) => console.log("Event createUser:", msg),
    error: async (msg) => console.error("Event error:", msg),
  },

  debug: true,
});
