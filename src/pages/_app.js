// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SessionProvider, getSession } from "next-auth/react";

function AppInner({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Detect Vercel preview deployments (optional)
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (
        hostname.endsWith(".vercel.app") &&
        hostname !== "turiyaportfolioplatform.vercel.app"
      ) {
        try {
          localStorage.setItem("previewUrl", window.location.origin);
        } catch (e) {
          // ignore storage errors
        }
      }
    }

    const verifyRiskAssessment = async () => {
      const exemptRoutes = [
        "/auth/signin",
        "/risk-assessment",
        "/verify-email",
        "/api/auth", // next-auth
      ];

      // skip check for exempt routes
      if (exemptRoutes.some((route) => router.pathname.startsWith(route))) return;

      try {
        // Check NextAuth session
        const s = await getSession();
        if (!s?.user) return;

        const response = await fetch("/api/proxy/risk/check", {
          method: "GET",
          credentials: "include",
        });

        // If endpoint returns 401 or similar, let the page handle auth flows
        if (response.status === 401) {
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (!data.completed) {
          try {
            sessionStorage.setItem("preAssessmentRoute", router.asPath);
          } catch (e) {}
          router.push("/risk-assessment");
        } else {
          try {
            localStorage.setItem("riskAssessmentCompleted", "true");
          } catch (e) {}
        }
      } catch (error) {
        console.error("Risk assessment check failed:", error);
        // Do not block navigation on error
      }
    };

    const handleRouteChange = () => verifyRiskAssessment();

    router.events.on("routeChangeStart", handleRouteChange);
    // run once on mount
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
