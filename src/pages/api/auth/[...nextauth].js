// src/pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";

const BACKEND_JWT_SECRET = process.env.NEXTAUTH_SECRET; // same as backend
const BACKEND_JWT_ALGO = "HS256";
const BACKEND_JWT_EXPIRE_DAYS = 7;

function createBackendJwt(userId) {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + BACKEND_JWT_EXPIRE_DAYS * 24 * 60 * 60;
    const payload = {
      user_id: String(userId),
      iat: nowSec,
      exp: expSec,
      iss: "turiyaportfolioplatform",
      aud: "turiyaportfolioclient",
    };
    const token = jsonwebtoken.sign(payload, BACKEND_JWT_SECRET, {
      algorithm: BACKEND_JWT_ALGO,
      expiresIn: `${BACKEND_JWT_EXPIRE_DAYS}d`,
    });
    console.log("=== [createBackendJwt] token created ===", token);
    return token;
  } catch (err) {
    console.error("Error creating backend JWT:", err);
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
      console.log({ user, account, profile, email, credentials });
      return true; // allow all logins
    },

    async jwt({ token, user, account, profile }) {
      console.log("=== [jwt callback] BEFORE ===");
      console.log({ token, user, account, profile });

      try {
        if (user && account) {
          console.log("New login detected, generating backend JWT...");
          token.accessToken = createBackendJwt(user.id || user.sub);
          token.provider = account.provider;
          token.userId = user.id || user.sub;
        }

        console.log("=== [jwt callback] AFTER ===");
        console.log(token);
        return token;
      } catch (err) {
        console.error("Error in jwt callback:", err);
        return token;
      }
    },

    async session({ session, token, user }) {
      console.log("=== [session callback] BEFORE ===");
      console.log({ session, token, user });

      try {
        session.user.id = token.userId || null;
        session.accessToken = token.accessToken || null;
        session.provider = token.provider || null;

        console.log("=== [session callback] AFTER ===");
        console.log(session);

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

  debug: true,
});
