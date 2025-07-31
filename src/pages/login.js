import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // for session cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Login success, redirect to homepage
        router.push('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    }
  }

  return (
    <>
      <style>{`
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .auth-container {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          padding: 30px;
          margin: 20px;
        }
        .auth-title {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 25px;
        }
        .auth-form input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }
        .auth-btn {
          width: 100%;
          padding: 12px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        }
        .auth-links {
          text-align: center;
          margin-top: 20px;
        }
        .error-message {
          color: #e74c3c;
          margin-bottom: 15px;
          text-align: center;
        }
        a {
          color: #3498db;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="auth-container">
        <h1 className="auth-title">Login</h1>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="auth-btn">Login</button>
        </form>

        <div className="auth-links">
          Don&apos;t have an account? <Link href="/register">Sign Up</Link>
        </div>
      </div>
    </>
  );
}
