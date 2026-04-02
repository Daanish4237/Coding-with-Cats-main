// api/admin/reports/progress.js
const { getPool } = require('../../_db');
const { verifyToken } = require('../../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = verifyToken(req);
  if (!payload || payload.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT
        s.student_id,
        s.username,
        s."totalPoints",
        COALESCE(
          json_agg(
            json_build_object(
              'stage_id', ss.stage_id,
              'score', ss.score,
              'completedAt', ss."completedAt"
            ) ORDER BY ss.stage_id
          ) FILTER (WHERE ss.stage_id IS NOT NULL),
          '[]'
        ) AS "completedStages"
      FROM students s
      LEFT JOIN student_stages ss
        ON s.student_id = ss.student_id AND ss.status = 'completed'
      GROUP BY s.student_id, s.username, s."totalPoints"
      ORDER BY s.username
    `);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
};
