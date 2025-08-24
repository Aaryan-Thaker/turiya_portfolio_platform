"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function Nav({ user: propUser }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [localTokenChecked, setLocalTokenChecked] = useState(false);

  // Determine effective user & token
  const userFromSession = session?.user || null;
  const tokenFromSession = session?.accessToken || null;
  const tokenFromStorage =
    typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
  const effectiveToken = tokenFromSession || tokenFromStorage;
  const user = userFromSession || propUser || {};

  // Redirect to signin if not authenticated (client-side)
  useEffect(() => {
    // wait until session resolves
    if (status === "loading") return;

    // mark we've checked localStorage (so UI can render reasonable fallback)
    setLocalTokenChecked(true);

    // if no token found, redirect to sign-in
    if (!effectiveToken) {
      router.replace("/auth/signin");
    }
  }, [status, effectiveToken, router]);

  async function handleLogout() {
    try {
      // Clear local storage token first
      if (typeof window !== "undefined") {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("riskAssessmentCompleted");
        localStorage.removeItem("preAssessmentRoute");
      }
    } catch (e) {
      // ignore
    }

    // Sign out via NextAuth and redirect to signin
    await signOut({ callbackUrl: "/auth/signin" });
  }

  const isLoggedIn = !!effectiveToken;

  // show loading until we've checked token/session
  if (status === "loading" || !localTokenChecked) {
    return <nav style={styles.nav}>Loading...</nav>;
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.navTitle}>Portfolio Tracker</div>

      {isLoggedIn ? (
        <>
          <Link href="/" style={styles.navLink}>Portfolio</Link>
          <Link href="/valuation" style={styles.navLink}>Valuation</Link>
          <Link href="/transactions" style={styles.navLink}>Transactions</Link>

          <button
            onClick={handleLogout}
            style={{ ...styles.navLink, cursor: "pointer", background: "transparent", border: "none" }}
            title="Logout"
          >
            Logout ({user?.email || user?.id || "me"})
          </button>
        </>
      ) : (
        <Link href="/auth/signin" style={styles.navLink}>Login</Link>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottom: "1px solid #eee",
  },
  navTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 30,
    color: "#2c3e50",
  },
  navLink: {
    marginRight: 15,
    textDecoration: "none",
    color: "#333",
    padding: "8px 15px",
    borderRadius: 4,
    fontSize: 15,
  },
};
