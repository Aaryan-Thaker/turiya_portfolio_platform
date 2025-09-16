// components/Nav.js
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function Nav({ user: propUser }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user || propUser || {};
  const isLoggedIn =
    status === "authenticated" ||
    user?.isAuthenticated ||
    user?.is_authenticated;

  const [riskProfile, setRiskProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch user's risk profile
  useEffect(() => {
    async function fetchRisk() {
      try {
        const token = session?.accessToken;
        const res = await fetch("/api/risk/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          const numericScore = data?.profile?.total_score ?? data?.total_score ?? null;
          const category = data?.profile?.riskProfile ?? null;

          if (numericScore && category) {
            setRiskProfile(`${numericScore} - ${category}`);
          } else if (category) {
            setRiskProfile(category);
          } else if (numericScore) {
            setRiskProfile(numericScore);
          } else {
            setRiskProfile("N/A");
          }
        } else {
          setRiskProfile("N/A");
        }
      } catch (err) {
        console.error("Failed to fetch risk profile", err);
        setRiskProfile("N/A");
      }
    }

    if (isLoggedIn) fetchRisk();
  }, [isLoggedIn, session]);

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
    try {
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const navLinks = [
    { href: "/", label: "Portfolio" },
    { href: "/valuation", label: "Valuation" },
    { href: "/transactions", label: "Transactions" },
  ];

  return (
    <>
      <nav style={styles.nav}>
        {/* Logo + Brand */}
        <div style={styles.brand}>
          <Image
            src="/logo.png"
            alt="Turiya Advisory Logo"
            width={36}
            height={36}
            priority
            style={{ marginRight: 10 }}
          />
          <span style={styles.brandName}>Turiya Advisory Services</span>
        </div>

        {/* Links */}
        <div style={styles.links}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                ...styles.navLink,
                ...(router.pathname === link.href ? styles.activeLink : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right-aligned user dropdown */}
        <div style={{ marginLeft: "auto", position: "relative" }} ref={dropdownRef}>
          {isLoggedIn ? (
            <button onClick={() => setMenuOpen(!menuOpen)} style={styles.userButton}>
              {user?.email || user?.id || "Account"} <span style={{ marginLeft: 5 }}>▼</span>
            </button>
          ) : (
            <Link href="/auth/signin" style={styles.navLink}>
              Login
            </Link>
          )}

          {menuOpen && (
            <div style={styles.dropdownMenu}>
              {riskProfile && (
                <div style={styles.dropdownHeader}>
                  Risk Score: <strong>{riskProfile}</strong>
                </div>
              )}
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
      </nav>

      {/* Spacer */}
      <div style={{ height: 70 }} />
    </>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    padding: "10px 20px",
    background: "#375a8a", // darker blue
    color: "#fff",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 60,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  brand: { display: "flex", alignItems: "center", marginRight: 30 },
  brandName: { fontSize: 20, fontWeight: "bold", color: "#fff", whiteSpace: "nowrap" },
  links: { display: "flex", alignItems: "center", gap: 15 },
  navLink: {
    color: "#fff",
    textDecoration: "none",
    padding: "8px 12px",
    fontSize: 15,
    borderRadius: 4,
    transition: "background 0.3s ease",
  },
  activeLink: { borderBottom: "2px solid #ffd700", fontWeight: "600" }, // gold highlight
  userButton: {
    background: "#4a73a1", // contrast against nav
    border: "1px solid #ffd700",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.3s ease",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: "100%",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 4,
    marginTop: 5,
    minWidth: 200,
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    zIndex: 100,
  },
  dropdownHeader: {
    padding: "10px 15px",
    borderBottom: "1px solid #eee",
    fontSize: 14,
    fontWeight: "bold",
    background: "#f9f9f9",
    color: "#333",
  },
  dropdownItem: {
    display: "block",
    padding: "10px 15px",
    textDecoration: "none",
    color: "#333",
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.2s ease",
  },
};

// Inject global hover styles once
if (typeof window !== "undefined" && !document.getElementById("nav-global-styles")) {
  const styleTag = document.createElement("style");
  styleTag.id = "nav-global-styles";
  styleTag.innerHTML = `
    body, html { margin: 0; padding: 0; }
    a:hover { background: rgba(255,255,255,0.2); }
    button:hover { background: rgba(255,215,0,0.3); }
    div[role="button"]:hover { background: #f1f1f1; }
  `;
  document.head.appendChild(styleTag);
}
