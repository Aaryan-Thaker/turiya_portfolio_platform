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

  // Required
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.idToken = account.id_token ?? null;
        token.accessToken = account.access_token ?? null;
        token.refreshToken = account.refresh_token ?? null;
        token.userId = profile?.sub ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = session.user || {};
      session.user.id = token.userId || session.user.id;
      session.accessToken = token.idToken || token.accessToken || null;
      session.refreshToken = token.refreshToken || null;
      return session;
    }
  },

  debug: process.env.NODE_ENV !== "production",
});
