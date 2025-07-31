/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://portoflio-backend-2ulb99mtz-aaryans-projects-56d3a379.vercel.app/api/:path*'
      }
    ];
  }
};

export default nextConfig;
