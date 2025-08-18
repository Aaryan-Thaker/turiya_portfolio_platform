/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Inject environment variable safely at build time
  env: {
    NEXT_PUBLIC_NEXTAUTH_URL: process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
  },

  async rewrites() {
    return [
      // Keep NextAuth routes in Next.js
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*'
      },
      // Everything else goes to Flask backend
      {
        source: '/api/:path*',
        destination: 'https://portoflio-backend-snowy.vercel.app/api/:path*'
      }
    ];
  }
};

export default nextConfig;
