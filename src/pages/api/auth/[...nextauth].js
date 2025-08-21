import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET,
  BACKEND_JWT_SECRET,
  BACKEND_JWT_EXPIRE_DAYS = "7",
  BACKEND_JWT_ISS = "your-app",
  BACKEND_JWT_AUD = "your-app-client",
} = process.env;

// Helper: generate backend JWT (for Flask)
function createBackendJwt(userId) {
  if (!BACKEND_JWT_SECRET) return null;
  return jwt.sign(
    { user_id: String(userId), iss: BACKEND_JWT_ISS, aud: BACKEND_JWT_AUD },
    BACKEND_JWT_SECRET,
    { algorithm: "HS256", expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d` }
  );
}

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],

  secret: NEXTAUTH_SECRET,

  session: { strategy: "jwt" }, // JWT-based session

  callbacks: {
    // Add backend JWT to JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id || user.sub;
        token.backendJwt = createBackendJwt(token.userId);
      }
      return token;
    },

    // Expose backend JWT to frontend session
    async session({ session, token }) {
      session.user.id = token.userId;
      session.accessToken = token.backendJwt; // Flask backend JWT
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  debug: false,
});
