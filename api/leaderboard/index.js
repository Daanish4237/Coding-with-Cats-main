// api/leaderboard/index.js
const { getPool } = require('../_db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { stage } = req.query;

  // Validate stage param: must be present and an integer 1-15
  if (stage === undefined || stage === null || stage === '') {
    return res.status(400).json({ error: 'Missing required query parameter: stage' });
  }

  const stageNum = Number(stage);
  if (!Number.isInteger(stageNum) || stageNum < 1 || stageNum > 15) {
    return res.status(400).json({ error: 'stage must be an integer between 1 and 15' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT l.leaderboard_id, l.student_id, s.username, l.final_score AS score,
              l.stage_id, l.rank, l."recordedAt"
       FROM leaderboards l
       JOIN students s ON l.student_id = s.student_id
       WHERE l.stage_id = $1
       ORDER BY l.final_score DESC
       LIMIT 10`,
      [stageNum]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};
