import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const res = await fetch('http://localhost:8000/api/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, confirm_password: confirmPassword })
    });

    const data = await res.json();

    if (data.success) {
      setSuccess('Registration successful! Please check your email to verify your account.');
    } else {
      setError(data.error || 'Something went wrong');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 m-4">
        <h1 className="text-2xl font-semibold text-center text-gray-800 mb-6">Create Account</h1>

        {error && <div className="text-red-600 text-sm text-center mb-4">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center mb-4">{success}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          >
            Sign Up
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">Login</Link>
        </div>
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
