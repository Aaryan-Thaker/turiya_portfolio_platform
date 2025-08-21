import { getProviders, signIn } from "next-auth/react";

export default function SignIn({ providers }) {
  if (!providers) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Sign In</h1>
        <p>No authentication providers configured. Please contact the admin.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sign In</h1>
      {Object.values(providers).map((provider) => (
        <div key={provider.name} style={{ margin: '10px 0' }}>
          <button
            onClick={() => signIn(provider.id, { callbackUrl: "/" })}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Sign in with {provider.name}
          </button>
        </div>
      ))}
    </div>
  );
}

// Fetch providers server-side
export async function getServerSideProps(context) {
  const providers = await getProviders();
  return {
    props: { providers: providers ?? null }, // fallback to null
  };
}
