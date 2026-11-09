// src/pages/api/proxy/[...path].js
import { getToken } from "next-auth/jwt";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  const backendBase = (process.env.BACKEND_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

  // Extract session token securely server-side from the encrypted JWT cookie
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const bearerToken = token?.accessToken || token?.idToken;

  const { path = [] } = req.query;
  const subPath = Array.isArray(path) ? path.join("/") : path;
  const queryIndex = req.url ? req.url.indexOf("?") : -1;
  const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : "";
  const targetUrl = `${backendBase}/api/${subPath}${queryString}`;

  const headers = {
    Accept: req.headers["accept"] || "application/json",
  };

  // Securely attach bearer token server-side if present
  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  if (req.headers["content-type"]) {
    headers["Content-Type"] = req.headers["content-type"];
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "object" && req.body !== null) {
      fetchOptions.body = JSON.stringify(req.body);
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    } else if (req.body) {
      fetchOptions.body = req.body;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, fetchOptions);
    const contentType = backendRes.headers.get("content-type") || "";

    res.status(backendRes.status);
    if (contentType.includes("application/json")) {
      const data = await backendRes.json();
      return res.json(data);
    } else {
      const text = await backendRes.text();
      return res.send(text);
    }
  } catch (error) {
    console.error("Backend proxy error:", error);
    return res.status(502).json({ error: "Failed to connect to backend service" });
  }
}

