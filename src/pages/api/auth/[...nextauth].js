import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // You can add authorization params if you need offline access / consent screen:
      // authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } }
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  jwt: { secret: process.env.NEXTAUTH_SECRET },

  callbacks: {
    // Allow sign-ins (keep as you had it)
    async signIn({ user, account, profile }) {
      return true;
    },

    // Persist relevant tokens into the NextAuth JWT
    async jwt({ token, user, account, profile }) {
      // On initial sign in, NextAuth provides `account`
      if (account) {
        // Capture Google ID token (this is what Flask will verify)
        token.idToken = account.id_token || null;

        // Keep provider + ids + oauth tokens for convenience (optional)
        token.provider = account.provider || null;
        token.userId = profile?.sub || user?.id || token.userId || null;
        token.accessTokenRaw = account.access_token || token.accessTokenRaw || null;
        token.refreshToken = account.refresh_token || token.refreshToken || null;
      }
      return token;
    },

    // Expose the Google ID token as session.accessToken
    async session({ session, token }) {
      if (!session.user) session.user = {};
      session.user.id = token.userId || session.user.id;
      // IMPORTANT: session.accessToken is the Google ID token your Flask backend will verify
      session.accessToken = token.idToken || null;
      session.provider = token.provider || null;
      return session;
    },
  },

  events: {
    async signIn(message) {
      if (process.env.NODE_ENV !== "production") console.log("[nextauth] signIn:", message);
    },
  },

  debug: process.env.NODE_ENV !== "production",
});
