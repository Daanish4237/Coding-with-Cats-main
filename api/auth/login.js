// api/auth/login.js
const bcrypt = require('bcryptjs');
const { getPool } = require('../_db');
const { signToken, setCookie } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT student_id, username, password, role FROM students WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const student = result.rows[0];
    const valid = await bcrypt.compare(password, student.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      student_id: student.student_id,
      username: student.username,
      role: student.role,
    });

    setCookie(res, token);

    await pool.query(
      'UPDATE students SET "lastLogin" = NOW() WHERE student_id = $1',
      [student.student_id]
    );

    return res.status(200).json({ success: true, username: student.username });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};
