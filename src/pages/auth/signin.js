import { getProviders, signIn } from "next-auth/react";

export default function SignIn({ providers }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Sign in to your account</h1>
      {Object.values(providers).map((provider) => (
        <div key={provider.name}>
          <button
            onClick={() => signIn(provider.id)}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with {provider.name}
          </button>
        </div>
      ))}
    </div>
  );
}

// Fetch providers at build time
export async function getServerSideProps() {
  const providers = await getProviders();
  return { props: { providers } };
}
