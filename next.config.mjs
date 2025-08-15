/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false,
  },

  async rewrites() {
    return [
      // Keep NextAuth routes handled locally in Next.js
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // All other API requests go to Flask backend
      {
        source: '/api/:path*',
        destination: 'https://portoflio-backend-snowy.vercel.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
