import React from 'react';
import Link from 'next/link';

export default function Nav({ user }) {
  async function handleLogout() {
    try {
      const res = await fetch(`/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Clear client-side token storage regardless of server success
      try {
        localStorage.removeItem('token');
      } catch (err) {
        // ignore
      }

      // Delete cookie named 'token' by expiring it
      const isProd = process.env.NODE_ENV === 'production';
      let cookie = `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      if (isProd) {
        cookie += ' SameSite=None; Secure;';
      } else {
        cookie += ' SameSite=Lax;';
      }
      document.cookie = cookie;

      if (res.ok) {
        window.location.href = '/login';
      } else {
        // still redirect to login to clear client state
        window.location.href = '/login';
      }
    } catch (err) {
      // best-effort: clear client state and redirect
      try { localStorage.removeItem('token'); } catch {}
      const cookie = `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      document.cookie = cookie;
      window.location.href = '/login';
    }
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.navTitle}>Portfolio Tracker</div>
      {user && (user.isAuthenticated || user.is_authenticated) ? (
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
            Logout ({user.id || user.email || 'me'})
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
