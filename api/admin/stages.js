// api/admin/stages.js
const { getPool } = require('../_db');
const { verifyToken } = require('../_auth');

module.exports = async (req, res) => {
  const payload = verifyToken(req);
  if (!payload || payload.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const pool = getPool();

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM stages ORDER BY stage_id');
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const { name, difficulty, description, maxScore } = req.body || {};
    if (!name || !difficulty || !description || maxScore == null) {
      return res.status(400).json({ error: 'Missing required fields: name, difficulty, description, maxScore' });
    }
    try {
      const result = await pool.query(
        `INSERT INTO stages (stage_id, name, difficulty, description, "maxScore")
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING *`,
        [name, difficulty, description, maxScore]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
