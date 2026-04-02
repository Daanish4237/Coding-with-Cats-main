// api/auth/register.js
const bcrypt = require('bcryptjs');
const { getPool } = require('../_db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body || {};

  // Validation
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!password || typeof password !== 'string' || password === '') {
    return res.status(400).json({ error: 'Password is required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const student_id = require('crypto').randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = 'User'; // Always 'User' regardless of request body

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO students (student_id, username, email, password, role, "totalPoints")
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [student_id, username.trim(), email.trim(), hashedPassword, role]
    );

    return res.status(201).json({ success: true, username: username.trim() });
  } catch (err) {
    // PostgreSQL unique violation code
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    return res.status(500).json({ error: 'Database error' });
  }
};
