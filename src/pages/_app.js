import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";

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
        } catch (e) {}
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
        // Use token stored in localStorage (set on signin) — this is the Google ID token
        const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
        if (!token) return; // if no token, frontend will redirect to signin elsewhere

        const response = await fetch("/api/risk/check", {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
