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
    if (isLoggedIn) fetchRisk();
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

  const navLinks = [
    { href: "/", label: "Portfolio" },
    { href: "/valuation", label: "Valuation" },
    { href: "/transactions", label: "Transactions" },
    // ❌ removed risk-assessment from here
  ];

  return (
    <nav style={styles.nav}>
      {/* Logo + Brand */}
      <div style={styles.brand}>
        <Image
          src="/logo.png" // make sure /public/logo.png exists
          alt="Turiya Advisory Logo"
          width={32}
          height={32}
          style={{ marginRight: 10 }}
        />
        <span style={styles.brandName}>Turiya Advisory Services</span>
      </div>

      {/* Links */}
      <div style={styles.links}>
        {isLoggedIn &&
          navLinks.map((link) => (
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
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={styles.userButton}
          >
            {user?.email || user?.id || "me"}
            <span style={{ marginLeft: 5 }}>▼</span>
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
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "10px 20px",
    background: "#00264d", // dark blue
    color: "#fff",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    margin: 0,
    width: "100%",
    height: 60,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    marginRight: 30,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },
  navLink: {
    color: "#fff",
    textDecoration: "none",
    padding: "8px 12px",
    fontSize: 15,
  },
  activeLink: {
    borderBottom: "2px solid #fff",
    fontWeight: "bold",
  },
  userButton: {
    background: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
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
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
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
  },
};
