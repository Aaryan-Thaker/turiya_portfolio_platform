// pages/api/get-nextauth-url.js
export default function handler(req, res) {
  const url = process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  res.json({ NEXTAUTH_URL: url });
}
