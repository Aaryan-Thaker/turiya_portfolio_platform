import React from 'react';
import Link from 'next/link';

export default function VerifyPage({ success, error }) {
  return (
    <div style={styles.body}>
      <div style={styles.container}>
        {success ? (
          <>
            <h2 style={styles.successMessage}>{success}</h2>
            <Link href="/login" style={styles.loginLink}>Login Now</Link>
          </>
        ) : error ? (
          <>
            <h2 style={styles.errorMessage}>{error}</h2>
            <Link href="/register" style={styles.loginLink}>Register Again</Link>
          </>
        ) : (
          <h2>Processing...</h2>
        )}
      </div>
    </div>
  );
}

const styles = {
  body: {
    fontFamily: 'Arial, sans-serif',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    margin: 0,
    padding: 0,
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    maxWidth: 500,
    background: 'white',
    borderRadius: 10,
    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
    padding: 30,
    textAlign: 'center',
  },
  successMessage: {
    color: '#2ecc71',
    marginBottom: 20,
  },
  errorMessage: {
    color: '#e74c3c',
    marginBottom: 20,
  },
  loginLink: {
    display: 'inline-block',
    marginTop: 20,
    padding: '10px 20px',
    background: '#3498db',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 5,
  },
};
