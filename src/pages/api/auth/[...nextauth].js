import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt", // use JWT, not database
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET, // make sure backend matches this
  },

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("=== [signIn callback] ===");
      console.log("user:", user);
      console.log("account:", account);
      console.log("profile:", profile);
      console.log("email:", email);
      console.log("credentials:", credentials);
      try {
        // allow all logins for now
        return true;
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
        if (account && user) {
          console.log("New login detected, attaching account data...");
          token.accessToken = account.access_token || null;
          token.refreshToken = account.refresh_token || null;
          token.provider = account.provider || null;
          token.userId = user.id || null;
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
        session.accessToken = token.accessToken || null;
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
    async signIn(message) {
      console.log(">>> [Event] signIn:", message);
    },
    async signOut(message) {
      console.log(">>> [Event] signOut:", message);
    },
    async createUser(message) {
      console.log(">>> [Event] createUser:", message);
    },
    async linkAccount(message) {
      console.log(">>> [Event] linkAccount:", message);
    },
    async session(message) {
      console.log(">>> [Event] session:", message);
    },
    async error(message) {
      console.error(">>> [Event] error:", message);
    },
  },

  debug: true, // enables NextAuth debug logging
});
