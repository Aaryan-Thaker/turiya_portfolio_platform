// pages/pingtest.js
import { useEffect, useState } from 'react';
import Nav from './Nav';

export default function PingTest() {
  const [pong, setPong] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch('/api/ping', { method: 'GET' });
        if (!res.ok) {
          setErr(`Status ${res.status}`);
          return;
        }
        const data = await res.json();
        setPong(JSON.stringify(data));
      } catch (e) {
        setErr(e.message);
      }
    }
    ping();
  }, []);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 20 }}>
      <Nav user={{ isAuthenticated: false }} />
      <h2>Ping test</h2>
      {pong && <div style={{ color: '#2ecc71' }}>Backend says: {pong}</div>}
      {err && <div style={{ color: '#e74c3c' }}>Error: {err}</div>}
    </div>
  );
}