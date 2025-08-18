export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { provider, email, name } = req.body;

  if (!provider || !email) {
    return res.status(400).json({ error: 'Missing provider or email' });
  }

  try {
    // Send data to Python backend endpoint
    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/oauth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, email, name }),
    });

    const data = await response.json();

    if (!data.success) return res.status(400).json(data);

    // Return JWT to frontend session handling
    return res.status(200).json({ token: data.token, user: data.user });
  } catch (err) {
    console.error('OAuth frontend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
