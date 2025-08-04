// pages/api/risk/submit.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'assessments.json');
    const newData = {
      ...req.body,
      submittedAt: new Date().toISOString(),
      id: Math.random().toString(36).slice(2) // Simple ID
    };

    // Create 'data' dir if it doesn't exist
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath));
    }

    // Append to JSON file (or create new)
    let existingData = [];
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath));
    }
    existingData.push(newData);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
}