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

  // 👇 keep this simple, no `session: { strategy: "jwt" }` here
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (typeof window === "undefined") return url;

      try {
        const previewUrl = localStorage.getItem("previewUrl");
        if (previewUrl && url.startsWith(baseUrl)) {
          return url.replace(baseUrl, previewUrl);
        }
      } catch (err) {
        console.error("Redirect callback error:", err);
      }
      return url;
    },

    async signIn({ user, account }) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_FLASK_API_URL}/api/oauth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              provider: account.provider,
            }),
          }
        );

        if (!res.ok) {
          console.error("Flask OAuth login failed:", await res.text());
          return false;
        }

        const data = await res.json();
        if (!data.success) {
          console.error("Flask backend returned error:", data.error);
          return false;
        }

        user.jwt = data.token; // attach Flask JWT
        return true;
      } catch (err) {
        console.error("Error during OAuth signIn:", err);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user?.jwt) {
        token.jwt = user.jwt;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.jwt) {
        session.jwt = token.jwt;
      }
      return session;
    },
  },
});
