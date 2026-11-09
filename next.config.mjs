/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:5000";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow all https domains (safe fallback for testing)
      },
    ],
    // If you want tighter control, replace with something like:
    // domains: ["logo.clearbit.com", "storage.googleapis.com", "your-backend.com"]
  },
  async rewrites() {
    return [
      // Keep NextAuth routes in Next.js
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
      // Keep Next.js proxy routes in Next.js
      {
        source: "/api/proxy/:path*",
        destination: "/api/proxy/:path*",
      },
      // Everything else goes to Flask backend
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
