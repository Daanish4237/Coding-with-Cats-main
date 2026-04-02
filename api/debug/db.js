// Temporary debug endpoint — DELETE before going to production
// GET /api/debug/db — tests DB connection and lists tables
module.exports = async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'DATABASE_URL is not set' });
  }

  // Mask the password for safe display
  const masked = dbUrl.replace(/:([^@]+)@/, ':****@');

  try {
    const { getPool } = require('../_db');
    const pool = getPool();
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    return res.status(200).json({
      connected: true,
      url: masked,
      tables: result.rows.map(r => r.table_name),
    });
  } catch (err) {
    return res.status(500).json({
      connected: false,
      url: masked,
      error: err.message,
    });
  }
};
