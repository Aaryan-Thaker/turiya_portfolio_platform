import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

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
  callbacks: {
    /**
     * Called when a user signs in.
     * We call our Flask backend to upsert/login the user.
     */
    async signIn({ user, account, profile }) {
      try {
        const res = await fetch(`${process.env.FLASK_API_URL}/api/oauth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: user.email,
            name: user.name,
            provider: account.provider,
        }),
        });

        if (!res.ok) {
          console.error("Flask OAuth login failed:", await res.text())
          return false
        }

        const data = await res.json()
        if (!data.success) {
          console.error("Flask backend returned error:", data.error)
          return false
        }

        // Store JWT in user object for token callback
        user.jwt = data.token
        return true
      } catch (err) {
        console.error("Error during OAuth signIn:", err)
        return false
      }
    },

    /**
     * Add JWT from Flask backend to the NextAuth token
     */
    async jwt({ token, user }) {
      if (user?.jwt) {
        token.jwt = user.jwt
      }
      return token
    },

    /**
     * Make JWT available to the client in the session
     */
    async session({ session, token }) {
      if (token?.jwt) {
        session.jwt = token.jwt
      }
      return session
    },
  },
})
