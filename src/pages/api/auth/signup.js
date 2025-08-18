export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, confirm_password } = req.body;
  if (!email || !password || !confirm_password) 
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirm_password }),
    });

    const data = await response.json();
    if (!data.success) return res.status(400).json(data);

    return res.status(200).json(data);
  } catch (err) {
    console.error('Signup frontend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
