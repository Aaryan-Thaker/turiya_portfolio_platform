import { getProviders, signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function SignInPage() {
  const [providers, setProviders] = useState(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  // When session updates, save Google ID token to localStorage and redirect
  useEffect(() => {
    // session.accessToken is the Google ID token (set in NextAuth session callback)
    if (session?.accessToken) {
      try {
        localStorage.setItem("jwt_token", session.accessToken);
      } catch (e) {
        // ignore storage errors
      }
      // redirect to home (or preserve returnTo if you add)
      router.replace("/");
    }
  }, [session, router]);

  if (status === "loading") {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Checking session…</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: 420,
        padding: 24,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ marginBottom: 10 }}>Sign in</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#555' }}>
          Continue with Google to access your portfolio
        </p>

        {!providers && <div>Loading providers…</div>}

        {providers?.google && (
          <button
            onClick={() => signIn(providers.google.id)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Continue with Google
          </button>
        )}

        <div style={{ marginTop: 18, fontSize: 13, color: '#666' }}>
          Note: accounts are created via Google sign-in only.
        </div>
      </div>
    </div>
  );
}
