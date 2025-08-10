// pages/register.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Nav from './Nav';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      // Use proxied API route — next.config.js rewrites /api/* to your Flask backend
      const url = '/api/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirmPassword
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setMessage(data.message || 'Verification email sent. Check your inbox.');
        // Optionally redirect to login after a short delay
        setTimeout(() => router.push('/login'), 2200);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  }

  return (
    <div style={wrap}>
      <Nav user={{ isAuthenticated: false }} />
      <div style={card}>
        <h2>Create account</h2>

        {message && <div style={success}>{message}</div>}
        {error && <div style={err}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={input} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required style={input} />
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" required style={input} />
          <button type="submit" style={button}>Register</button>
        </form>

        <div style={{ marginTop: 12 }}>
          Already have an account? <Link href="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

const wrap = { fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: '20px auto', padding: 20 };
const card = { background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,.08)' };
const input = { padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 14 };
const button = { padding: '10px 16px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const err = { color: '#e74c3c', marginBottom: 10 };
const success = { color: '#2ecc71', marginBottom: 10 };

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
  authContainer: {
    width: '100%',
    maxWidth: 400,
    background: 'white',
    borderRadius: 10,
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
    padding: 30,
    margin: 20,
  },
  authTitle: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 25,
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    border: '1px solid #ddd',
    borderRadius: 5,
    fontSize: 16,
  },
  authBtn: {
    width: '100%',
    padding: 12,
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: 5,
    fontSize: 16,
    cursor: 'pointer',
  },
  authLinks: {
    textAlign: 'center',
    marginTop: 20,
  },
  errorMessage: {
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  flashSuccess: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
};
