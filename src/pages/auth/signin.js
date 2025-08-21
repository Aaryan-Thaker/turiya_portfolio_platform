// pages/auth/signin.js
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [providers, setProviders] = useState({});

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await getProviders();
        if (res) setProviders(res);
      } catch (err) {
        console.error("Error fetching providers:", err);
      }
    }
    fetchProviders();
  }, []);

  if (!providers || Object.keys(providers).length === 0) {
    return <div>Loading providers…</div>;
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
          Choose a provider to continue
        </p>

        {Object.values(providers).map((p) => (
          <div key={p.name} style={{ marginBottom: 12 }}>
            <button
              onClick={() => signIn(p.id, {
                callbackUrl: process.env.NEXT_PUBLIC_NEXTAUTH_URL || '/',
              })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              Continue with {p.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
