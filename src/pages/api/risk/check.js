// pages/api/risk/check.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'assessments.json');
    if (!fs.existsSync(filePath)) {
      return res.status(200).json({ completed: false });
    }

    const data = JSON.parse(fs.readFileSync(filePath));
    // Check if any submission exists (adjust logic as needed)
    res.status(200).json({ completed: data.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check submissions' });
  }
}