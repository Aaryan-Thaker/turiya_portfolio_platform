// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline"
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  jwt: { secret: process.env.NEXTAUTH_SECRET },

  callbacks: {
    async jwt({ token, account, profile }) {
      // When first sign in, account contains tokens
      if (account) {
        // Take Google ID token (id_token) first, fallback to access_token
        token.idToken = account.id_token || token.idToken || null;
        token.accessTokenRaw = account.access_token || token.accessTokenRaw || null;
        token.refreshToken = account.refresh_token || token.refreshToken || null;
        token.userId = profile?.sub || token.userId || null;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose the Google ID token as session.accessToken for backend calls
      session.user = session.user || {};
      session.user.id = token.userId || session.user.id;
      session.accessToken = token.idToken || token.accessTokenRaw || null;
      session.refreshToken = token.refreshToken || null;
      return session;
    }
  },

  debug: process.env.NODE_ENV !== "production",
});
