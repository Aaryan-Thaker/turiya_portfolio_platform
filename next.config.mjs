/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://portoflio-backend-snowy.vercel.app/'
      }
    ];
  }
};

export default nextConfig;
