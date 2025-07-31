/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/api/:path*',
        destination: 'https://portoflio-backend-snowy.vercel.app/api/:path*'
      }
    ];
  }
};

export default nextConfig;
