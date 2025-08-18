export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!data.success) return res.status(400).json(data);

    return res.status(200).json({ token: data.token, user: data.user });
  } catch (err) {
    console.error('Login frontend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
