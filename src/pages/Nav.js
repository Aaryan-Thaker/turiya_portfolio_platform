// components/Nav.js
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Nav({ user: propUser }) {
  const { data: session, status } = useSession();
  const user = session?.user || propUser || {};
  const isLoggedIn =
    status === "authenticated" ||
    user?.isAuthenticated ||
    user?.is_authenticated;

  const [riskProfile, setRiskProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch user’s risk profile
  useEffect(() => {
    async function fetchRisk() {
      try {
        const res = await fetch("/api/risk/profile");
        if (res.ok) {
          const data = await res.json();
          setRiskProfile(data?.profile || null);
        }
      } catch (err) {
        console.error("Failed to fetch risk profile", err);
      }
    }
    if (isLoggedIn) {
      fetchRisk();
    }
  }, [isLoggedIn]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await signOut({ callbackUrl: "/auth/signin" });
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.navTitle}>Portfolio Tracker</div>
      {isLoggedIn ? (
        <>
          <Link href="/" style={styles.navLink}>
            Portfolio
          </Link>
          <Link href="/valuation" style={styles.navLink}>
            Valuation
          </Link>
          <Link href="/transactions" style={styles.navLink}>
            Transactions
          </Link>

          {/* User Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                ...styles.navLink,
                cursor: "pointer",
                userSelect: "none",
                background: "#f7f7f7",
                border: "1px solid #ddd",
              }}
            >
              {user?.email || user?.id || "me"}{" "}
              {riskProfile ? `(${riskProfile})` : ""}
              <span style={{ marginLeft: 5 }}>▼</span>
            </button>

            {menuOpen && (
              <div style={styles.dropdownMenu}>
                <Link
                  href="/risk-assessment"
                  style={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  Redo Risk Assessment
                </Link>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleLogout}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleLogout();
                    }
                  }}
                  style={styles.dropdownItem}
                >
                  Logout
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <Link href="/auth/signin" style={styles.navLink}>
          Login
        </Link>
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
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: "100%",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 4,
    marginTop: 5,
    minWidth: 180,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    zIndex: 100,
  },
  dropdownItem: {
    display: "block",
    padding: "10px 15px",
    textDecoration: "none",
    color: "#333",
    cursor: "pointer",
    fontSize: 14,
  },
};
