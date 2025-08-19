/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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