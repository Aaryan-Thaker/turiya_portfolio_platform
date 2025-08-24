// pages/auth/signin.js
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

  // Redirect once session exists
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Session after login:", session);
      router.push("/");
    }
  }, [session, status, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 420,
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: 10 }}>Sign in</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#555" }}>
          Choose a provider to continue
        </p>

        {!providers && <div>Loading providers…</div>}

        {providers &&
          Object.values(providers).map((p) => (
            <div key={p.name} style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => signIn(p.id)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Continue with {p.name}
              </button>
            </div>
          ))}

        <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
          Note, accounts are created via OAuth providers (Google, Microsoft).
        </div>

        {/* 🔎 Debug Panel */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            fontSize: 12,
            background: "#f9f9f9",
            border: "1px solid #eee",
            borderRadius: 8,
            color: "#333",
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          <strong>Debug session:</strong>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(session, null, 2)}
          </pre>
          <div>Status: {status}</div>
        </div>
      </div>
    </div>
  );
}
