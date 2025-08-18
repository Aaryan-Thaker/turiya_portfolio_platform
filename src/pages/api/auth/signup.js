import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, hashedPassword } = req.body;

  try {
    await db.insert(users).values({
      email,
      hashed_password: hashedPassword,
    });
    res.status(200).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'User creation failed' });
  }
}
