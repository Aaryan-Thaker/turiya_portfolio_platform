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

        {/* User dropdown */}
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
                  Risk Score: {riskProfile}
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
    background: "#1E1E1E", // Charcoal
    color: "#EAEAEA",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 60,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
  },
  brand: { display: "flex", alignItems: "center", marginRight: 30 },
  brandName: { fontSize: 19, fontWeight: "600", color: "#EAEAEA", whiteSpace: "nowrap" },
  links: { display: "flex", alignItems: "center", gap: 18 },
  navLink: {
    color: "#EAEAEA",
    textDecoration: "none",
    padding: "8px 12px",
    fontSize: 15,
    borderRadius: 4,
    transition: "all 0.3s ease",
  },
  activeLink: {
    borderBottom: "2px solid #00A86B", // Subtle finance green
    fontWeight: "600",
  },
  userButton: {
    background: "#2A2A2A",
    border: "1px solid #444",
    color: "#EAEAEA",
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.3s ease, color 0.3s ease",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: "100%",
    background: "#2B2B2B",
    border: "1px solid #444",
    borderRadius: 6,
    marginTop: 6,
    minWidth: 220,
    boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
    zIndex: 100,
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "10px 15px",
    borderBottom: "1px solid #3A3A3A",
    fontSize: 14,
    color: "#DADADA",
    background: "#242424",
  },
  dropdownItem: {
    display: "block",
    padding: "10px 15px",
    textDecoration: "none",
    color: "#EAEAEA",
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
    a:hover { background: rgba(255,255,255,0.08); }
    button:hover { background: #353535; }
    div[role="button"]:hover, .dropdown-item:hover { background: #353535; }
  `;
  document.head.appendChild(styleTag);
}
