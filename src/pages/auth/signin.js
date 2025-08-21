// pages/auth/signin.js
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    // fetch providers for dynamic rendering
    getProviders().then(setProviders);
  }, []);

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
        <h2 style={{marginBottom: 10}}>Sign in</h2>
        <p style={{marginTop: 0, marginBottom: 16, color: '#555'}}>Choose a provider to continue</p>

        {!providers && <div>Loading providers…</div>}

        {providers && Object.values(providers).map((p) => (
          <div key={p.name} style={{marginBottom: 12}}>
            <button
              onClick={() => signIn(p.id, { callbackUrl: '/portfolio' })}
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

        <div style={{marginTop: 18, fontSize: 13, color: '#666'}}>
          Note, accounts are created via OAuth providers (Google, Microsoft). If you previously used a password, you&apos;ll need to sign in using the linked provider.
        </div>
      </div>
    </div>
  );
}
