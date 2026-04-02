// api/shop/buy.js
const { getPool } = require('../_db');
const { verifyToken } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { item_id } = req.body || {};
  const pool = getPool();

  try {
    // Check item exists
    const itemResult = await pool.query(
      'SELECT * FROM items WHERE item_id=$1',
      [item_id]
    );
    if (itemResult.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemResult.rows[0];

    // Get student totalPoints
    const studentResult = await pool.query(
      'SELECT "totalPoints" FROM students WHERE student_id=$1',
      [payload.student_id]
    );
    const { totalPoints } = studentResult.rows[0];

    // Check sufficient points
    if (totalPoints < item.price) {
      return res.status(402).json({ error: 'Insufficient points' });
    }

    // Deduct points
    await pool.query(
      'UPDATE students SET "totalPoints" = "totalPoints" - $1 WHERE student_id=$2',
      [item.price, payload.student_id]
    );

    // Insert purchase record
    await pool.query(
      'INSERT INTO student_items (student_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [payload.student_id, item_id]
    );

    return res.status(200).json({
      success: true,
      remainingPoints: totalPoints - item.price,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
};
