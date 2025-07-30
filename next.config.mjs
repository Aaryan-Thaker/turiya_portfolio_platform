/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://your-flask-backend.onrender.com/:path*'
      }
    ];
  }
};

export default nextConfig;
