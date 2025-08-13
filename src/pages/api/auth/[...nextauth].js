// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftProvider from "next-auth/providers/microsoft";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXTAUTH_URL || "";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile offline_access User.Read"
        }
      }
    })
  ],

  // Use JWT sessions (serverless-friendly)
  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    // Called after sign in / provider returns. Persist backend JWT into token.accessToken.
    async jwt({ token, account, profile }) {
      // If this is first sign in (account present), exchange profile with backend to get backend JWT
      if (account && profile) {
        try {
          // Build minimal payload for backend to create/find user
          const payload = {
            email: profile.email,
            name: profile.name || profile.preferred_username || profile.email,
            provider: account.provider,
            providerAccountId: account.providerAccountId || profile.sub
          };

          // POST to your backend endpoint that will upsert user and return your backend JWT
          const res = await fetch(`${BACKEND_URL}/api/oauth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            // Expect backend to return { success: true, token: "<backend-jwt>", user: { id, email } }
            token.accessToken = data.token || data.accessToken || null;
            token.user = data.user || { email: profile.email, name: profile.name };
          } else {
            // still set a basic token.user so session has basic info
            token.user = { email: profile.email, name: profile.name };
            token.accessToken = null;
          }
        } catch (err) {
          console.error("Error exchanging OAuth profile with backend:", err);
          token.accessToken = null;
        }
      }
      return token;
    },

    // Make accessToken available in session on client
    async session({ session, token }) {
      session.accessToken = token.accessToken || null;
      // ensure session.user is populated
      session.user = session.user || token.user || {};
      return session;
    }
  }
});
