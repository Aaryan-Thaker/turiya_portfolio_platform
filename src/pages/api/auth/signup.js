import { db } from '../../../lib/db.js';
import { users } from '../../../lib/schema.js';
import { hash } from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const existing = await db.select().from(users).where(users.email.eq(email)).limit(1);
  if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

  const hashed_password = await hash(password, 12);
  await db.insert(users).values({ email, hashed_password, verified: 'true' });

  return res.status(201).json({ success: true });
}
