// api/admin/stages/[id].js
const { getPool } = require('../../_db');
const { verifyToken } = require('../../_auth');

module.exports = async (req, res) => {
  const payload = verifyToken(req);
  if (!payload || payload.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;
  const pool = getPool();

  if (req.method === 'PUT') {
    const { name, difficulty, description, maxScore, isActive } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE stages
         SET name=$1, difficulty=$2, description=$3, "maxScore"=$4, "isActive"=$5
         WHERE stage_id=$6`,
        [name, difficulty, description, maxScore, isActive, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(
        'DELETE FROM stages WHERE stage_id=$1',
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
