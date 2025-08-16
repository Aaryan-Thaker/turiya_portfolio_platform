// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SessionProvider, getSession } from "next-auth/react";

function AppInner({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // ✅ Detect if running on a Vercel preview deployment
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (
        hostname.endsWith(".vercel.app") &&
        hostname !== "turiyaportfolioplatform.vercel.app" // <-- your production domain
      ) {
        localStorage.setItem("previewUrl", window.location.origin);
      }
    }

    const verifyRiskAssessment = async () => {
      const exemptRoutes = [
        "/auth/signin",
        "/risk-assessment",
        "/verify-email",
        "/api/auth", // next-auth
      ];

      if (exemptRoutes.some((route) => router.pathname.startsWith(route))) return;

      try {
        // If localStorage says done, skip
        const localCompleted = localStorage.getItem("riskAssessmentCompleted");
        if (localCompleted === "true") return;

        // get session to include backend JWT
        const session = await getSession();
        const token = session?.accessToken;

        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch("/api/risk/check", {
          method: "GET",
          credentials: "include",
          headers,
        });
        const data = await response.json();
        if (!data.completed) {
          sessionStorage.setItem("preAssessmentRoute", router.asPath);
          router.push("/risk-assessment");
        } else {
          localStorage.setItem("riskAssessmentCompleted", "true");
        }
      } catch (error) {
        console.error("Risk assessment check failed:", error);
        // Do not block navigation on error
      }
    };

    const handleRouteChange = () => verifyRiskAssessment();

    router.events.on("routeChangeStart", handleRouteChange);
    verifyRiskAssessment();

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <AppInner Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}
