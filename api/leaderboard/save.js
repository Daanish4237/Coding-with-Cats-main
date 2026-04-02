// api/leaderboard/save.js
const { getPool } = require('../_db');
const { verifyToken } = require('../_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { stage_id, base_score, completion_time_ms } = req.body;

  // Validate stage_id: integer 1-15
  const stageNum = Number(stage_id);
  if (!Number.isInteger(stageNum) || stageNum < 1 || stageNum > 15) {
    return res.status(400).json({ error: 'stage_id must be an integer between 1 and 15' });
  }

  // Validate base_score: >= 0
  const baseScore = Number(base_score);
  if (!Number.isFinite(baseScore) || baseScore < 0) {
    return res.status(400).json({ error: 'base_score must be a non-negative number' });
  }

  // Validate completion_time_ms: > 0
  const completionTimeMs = Number(completion_time_ms);
  if (!Number.isFinite(completionTimeMs) || completionTimeMs <= 0) {
    return res.status(400).json({ error: 'completion_time_ms must be a positive number' });
  }

  // Compute time bonus
  const timeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));

  const studentId = user.student_id;

  try {
    const pool = getPool();

    // Step 1: Get personal best BEFORE this submission
    const bestResult = await pool.query(
      `SELECT MAX(final_score) AS best FROM leaderboards WHERE student_id = $1 AND stage_id = $2`,
      [studentId, stageNum]
    );
    const previousBest = bestResult.rows[0].best !== null ? Number(bestResult.rows[0].best) : null;

    // Step 2: Get last 2 scores for this student+stage
    const last2Result = await pool.query(
      `SELECT final_score FROM leaderboards WHERE student_id = $1 AND stage_id = $2 ORDER BY "recordedAt" DESC LIMIT 2`,
      [studentId, stageNum]
    );
    const last2 = last2Result.rows;

    // Step 3: Determine streak bonus
    // Apply if there are exactly 2 previous submissions and both beat the personal best before those 2
    let bonusApplied = false;
    if (previousBest !== null && last2.length === 2 && last2.every(r => Number(r.final_score) > previousBest)) {
      bonusApplied = true;
    }

    // Compute final score
    let finalScore = baseScore + timeBonus;
    if (bonusApplied) {
      finalScore = Math.floor(finalScore * 1.5);
    }

    // Compute rank: count of existing scores strictly greater than finalScore, plus 1
    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 AS rank FROM leaderboards WHERE stage_id = $1 AND final_score > $2`,
      [stageNum, finalScore]
    );
    const rank = Number(rankResult.rows[0].rank);

    // Insert the new leaderboard row
    await pool.query(
      `INSERT INTO leaderboards
         (leaderboard_id, student_id, stage_id, base_score, time_bonus, final_score,
          completion_time_ms, bonus_applied, rank, "recordedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [studentId, stageNum, baseScore, timeBonus, finalScore, completionTimeMs, bonusApplied, rank]
    );

    return res.status(201).json({ success: true, final_score: finalScore, rank, bonus_applied: bonusApplied });
  } catch (err) {
    console.error('Leaderboard save error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};
