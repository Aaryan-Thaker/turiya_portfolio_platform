import React from 'react';
import Link from 'next/link';

export default function Nav({ user }) {
  async function handleLogout() {
    try {
      const res = await fetch('http://localhost:8000/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        alert('Logout failed');
      }
    } catch {
      alert('Logout failed');
    }
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.navTitle}>Portfolio Tracker</div>
      {user && user.isAuthenticated ? (
        <>
          <Link href="/" style={styles.navLink}>Portfolio</Link>
          <Link href="/valuation" style={styles.navLink}>Valuation</Link>
          <Link href="/transactions" style={styles.navLink}>Transactions</Link>
          <span
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogout(); } }}
            style={{ ...styles.navLink, cursor: 'pointer', userSelect: 'none' }}
            title="Logout"
          >
            Logout ({user.id})
          </span>
        </>
      ) : (
        <Link href="/login" style={styles.navLink}>Login</Link>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottom: '1px solid #eee',
  },
  navTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 30,
    color: '#2c3e50',
  },
  navLink: {
    marginRight: 15,
    textDecoration: 'none',
    color: '#333',
    padding: '8px 15px',
    borderRadius: 4,
    fontSize: 15,
    transition: 'all 0.3s ease',
    outline: 'none',
  },
};
