/** @type {import('next').NextConfig} */
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
      // Everything else goes to Flask backend
      {
        source: "/api/:path*",
        destination: "https://portoflio-backend-snowy.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
