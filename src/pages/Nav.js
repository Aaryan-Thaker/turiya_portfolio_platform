import React from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function Nav({ user: propUser }) {
  const { data: session } = useSession();
  const user = session?.user || propUser || {};

  async function handleLogout() {
    await signOut({ callbackUrl: '/auth/signin' });
  }

  const isLoggedIn = user?.is_authenticated;

  return (
    <nav style={styles.nav}>
      <div style={styles.navTitle}>Portfolio Tracker</div>
      {isLoggedIn ? (
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
            Logout ({user.email || user.id || 'me'})
          </span>
        </>
      ) : (
        <Link href="/auth/signin" style={styles.navLink}>Login</Link>
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
  },
};
