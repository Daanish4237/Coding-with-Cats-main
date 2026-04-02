// api/shop/items.js
const { getPool } = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT item_id, name, type, price, description FROM items ORDER BY price'
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
};
