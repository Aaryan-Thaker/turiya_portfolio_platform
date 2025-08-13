// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXTAUTH_URL ||
  "";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: "common", // allows personal + work/school accounts
      authorization: {
        params: {
          scope: "openid email profile offline_access User.Read",
        },
      },
    }),
  ],

  // Use JWT sessions (serverless-friendly)
  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    // After sign in: exchange OAuth profile with backend to get backend JWT
    async jwt({ token, account, profile }) {
      if (account && profile) {
        try {
          const payload = {
            email: profile.email,
            name:
              profile.name ||
              profile.preferred_username ||
              profile.email,
            provider: account.provider,
            providerAccountId:
              account.providerAccountId || profile.sub,
          };

          const res = await fetch(`${BACKEND_URL}/api/oauth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = await res.json();
            token.accessToken =
              data.token || data.accessToken || null;
            token.user =
              data.user || {
                email: profile.email,
                name: profile.name,
              };
          } else {
            token.user = {
              email: profile.email,
              name: profile.name,
            };
            token.accessToken = null;
          }
        } catch (err) {
          console.error(
            "Error exchanging OAuth profile with backend:",
            err
          );
          token.accessToken = null;
        }
      }
      return token;
    },

    // Expose backend JWT + user in session
    async session({ session, token }) {
      session.accessToken = token.accessToken || null;
      session.user = session.user || token.user || {};
      return session;
    },
  },
});
