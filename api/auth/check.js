// api/auth/check.js
const { verifyToken } = require('../_auth');
const { getPool } = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = verifyToken(req);

  if (!payload) {
    return res.status(200).json({ authenticated: false });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT "totalPoints" FROM students WHERE student_id = $1',
      [payload.student_id]
    );
    const totalPoints = result.rows.length > 0 ? (result.rows[0].totalPoints ?? 0) : 0;

    return res.status(200).json({
      authenticated: true,
      username: payload.username,
      student_id: payload.student_id,
      role: payload.role,
      totalPoints,
    });
  } catch (err) {
    // Fall back gracefully — still authenticated, just no points data
    return res.status(200).json({
      authenticated: true,
      username: payload.username,
      student_id: payload.student_id,
      role: payload.role,
      totalPoints: 0,
    });
  }
};
