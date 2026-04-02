/**
 * Property-based tests for Leaderboard_Service shape/ordering and stage validation.
 * Feature: vercel-deployment
 */

const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const leaderboardHandler = require('../../leaderboard/index');
const saveHandler = require('../../leaderboard/save');

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockRes() {
  const res = { _status: null, _body: null, _headers: {} };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  res.setHeader = (name, value) => { res._headers[name] = value; };
  return res;
}

function mockReq(query) {
  return { method: 'GET', query };
}

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

let mockQueryImpl = null;

jest.mock('../../_db', () => {
  const mockQuery = jest.fn(async (sql, values) => {
    if (mockQueryImpl) return mockQueryImpl(sql, values);
    return { rows: [] };
  });
  return { getPool: () => ({ query: mockQuery }) };
});

const { getPool } = require('../../_db');
const mockQuery = getPool().query;

// ---------------------------------------------------------------------------
// Property 5: Leaderboard Shape and Ordering
// For any valid stage number (1–15) with at least one saved score, the
// leaderboard response should be an array of at most 10 entries, sorted by
// score descending, where every entry contains student_id, username, score,
// stage_id, rank, and recordedAt.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 5: Leaderboard Shape and Ordering
describe('Property 5: Leaderboard Shape and Ordering', () => {
  // Validates: Requirements 6.2, 6.3

  beforeEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  // Arbitrary: a valid stage number 1–15
  const validStageArb = fc.integer({ min: 1, max: 15 });

  // Arbitrary: a single leaderboard row with all required fields
  const scoreRowArb = fc.record({
    leaderboard_id: fc.uuid(),
    student_id: fc.uuid(),
    username: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    score: fc.integer({ min: 0, max: 10000 }),
    stage_id: fc.integer({ min: 1, max: 15 }),
    rank: fc.integer({ min: 1, max: 100 }),
    recordedAt: fc.date().map((d) => d.toISOString()),
  });

  // Arbitrary: 1–10 score rows (at least one, at most 10 — simulating DB LIMIT 10)
  const scoreRowsArb = fc.array(scoreRowArb, { minLength: 1, maxLength: 10 });

  test('response is array of at most 10 entries with required fields, sorted by score descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStageArb,
        scoreRowsArb,
        async (stage, rows) => {
          // Sort rows descending by score (simulating ORDER BY final_score DESC)
          const sortedRows = [...rows].sort((a, b) => b.score - a.score);

          mockQueryImpl = async () => ({ rows: sortedRows });

          const req = mockReq({ stage: String(stage) });
          const res = mockRes();
          await leaderboardHandler(req, res);

          // Must return HTTP 200
          expect(res._status).toBe(200);

          const body = res._body;

          // Must be an array
          expect(Array.isArray(body)).toBe(true);

          // At most 10 entries
          expect(body.length).toBeLessThanOrEqual(10);

          // Must have at least one entry (we seeded at least one)
          expect(body.length).toBeGreaterThanOrEqual(1);

          // Every entry must contain all required fields
          for (const entry of body) {
            expect(entry).toHaveProperty('student_id');
            expect(entry).toHaveProperty('username');
            expect(entry).toHaveProperty('score');
            expect(entry).toHaveProperty('stage_id');
            expect(entry).toHaveProperty('rank');
            expect(entry).toHaveProperty('recordedAt');
          }

          // Must be sorted by score descending
          for (let i = 0; i < body.length - 1; i++) {
            expect(body[i].score).toBeGreaterThanOrEqual(body[i + 1].score);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Leaderboard Stage Validation
// For any stage value that is not an integer in the range 1–15 (including
// missing, zero, negative, or greater than 15), GET /api/leaderboard should
// return HTTP 400.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 6: Leaderboard Stage Validation
describe('Property 6: Leaderboard Stage Validation', () => {
  // Validates: Requirements 6.4, 6.5

  beforeEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  // Arbitrary: integer strings outside 1–15 (zero, negative, or > 15)
  const outOfRangeIntegerArb = fc.oneof(
    fc.constant('0'),
    fc.integer({ min: -10000, max: -1 }).map(String),
    fc.integer({ min: 16, max: 10000 }).map(String)
  );

  // Arbitrary: non-integer strings (letters, floats, symbols)
  const nonIntegerStringArb = fc.oneof(
    fc.string({ minLength: 1 }).filter((s) => !/^-?\d+$/.test(s) && s.trim().length > 0),
    fc.double({ min: 0.1, max: 14.9 }).filter((n) => !Number.isInteger(n)).map(String)
  );

  test('missing stage parameter → HTTP 400', async () => {
    const req = mockReq({});
    const res = mockRes();
    await leaderboardHandler(req, res);
    expect(res._status).toBe(400);
  });

  test('stage = empty string → HTTP 400', async () => {
    const req = mockReq({ stage: '' });
    const res = mockRes();
    await leaderboardHandler(req, res);
    expect(res._status).toBe(400);
  });

  test('out-of-range integer stage values → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        outOfRangeIntegerArb,
        async (stage) => {
          const req = mockReq({ stage });
          const res = mockRes();
          await leaderboardHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('non-integer string stage values → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonIntegerStringArb,
        async (stage) => {
          const req = mockReq({ stage });
          const res = mockRes();
          await leaderboardHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers for save handler tests
// ---------------------------------------------------------------------------

/**
 * Build a mock res that captures status, json, and headers (needed for save handler).
 */
function mockSaveRes() {
  const res = { _status: null, _body: null, _headers: {} };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  res.setHeader = (name, value) => { res._headers[name] = value; };
  return res;
}

/**
 * Build a signed JWT cookie header for the save handler.
 * Requires process.env.JWT_SECRET to be set.
 */
function makeAuthCookie(studentId, username) {
  const token = jwt.sign(
    { student_id: studentId, username, role: 'User' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

/**
 * Build a mock POST request for the save handler.
 */
function mockSaveReq(body, cookieHeader) {
  return {
    method: 'POST',
    headers: { cookie: cookieHeader || '' },
    body,
  };
}

// ---------------------------------------------------------------------------
// Property 7: Save Score ? Leaderboard Round Trip
// For any authenticated user and valid stage/score combination, saving a score
// and then fetching the leaderboard for that stage should result in the saved
// score appearing in the returned array.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 7: Save Score ? Leaderboard Round Trip
describe('Property 7: Save Score ? Leaderboard Round Trip', () => {
  // Validates: Requirements 7.2

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  const validStageArb = fc.integer({ min: 1, max: 15 });
  const validBaseScoreArb = fc.integer({ min: 0, max: 10000 });
  const validTimeArb = fc.integer({ min: 1, max: 600000 });
  const studentIdArb = fc.uuid();

  test('saved score appears in leaderboard response for that stage', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStageArb,
        validBaseScoreArb,
        validTimeArb,
        studentIdArb,
        async (stage, baseScore, completionTimeMs, studentId) => {
          const timeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));
          const finalScore = baseScore + timeBonus;

          // In-memory store for inserted rows
          const insertedRows = [];

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();

            // Personal best query ? no previous best
            if (sqlUpper.includes('MAX(FINAL_SCORE)')) {
              return { rows: [{ best: null }] };
            }
            // Last 2 scores query ? no previous submissions
            if (sqlUpper.includes('LIMIT 2')) {
              return { rows: [] };
            }
            // Rank query ? count of scores strictly greater
            if (sqlUpper.includes('COUNT(*)')) {
              const greaterCount = insertedRows.filter(r => r.final_score > finalScore).length;
              return { rows: [{ rank: greaterCount + 1 }] };
            }
            // INSERT ? store the row
            if (sqlUpper.startsWith('INSERT INTO LEADERBOARDS')) {
              insertedRows.push({
                student_id: values[0],
                stage_id: values[1],
                base_score: values[2],
                time_bonus: values[3],
                final_score: values[4],
                completion_time_ms: values[5],
                bonus_applied: values[6],
                rank: values[7],
              });
              return { rows: [] };
            }
            // Leaderboard GET query ? return inserted rows for this stage
            if (sqlUpper.includes('FROM LEADERBOARDS') && sqlUpper.includes('JOIN STUDENTS')) {
              const stageRows = insertedRows
                .filter(r => r.stage_id === stage)
                .sort((a, b) => b.final_score - a.final_score)
                .slice(0, 10)
                .map((r, i) => ({
                  leaderboard_id: `id-${i}`,
                  student_id: r.student_id,
                  username: 'testuser',
                  score: r.final_score,
                  stage_id: r.stage_id,
                  rank: r.rank,
                  recordedAt: new Date().toISOString(),
                }));
              return { rows: stageRows };
            }
            return { rows: [] };
          };

          // Step 1: Save the score
          const cookie = makeAuthCookie(studentId, 'testuser');
          const saveReq = mockSaveReq({ stage_id: stage, base_score: baseScore, completion_time_ms: completionTimeMs }, cookie);
          const saveRes = mockSaveRes();
          await saveHandler(saveReq, saveRes);
          expect(saveRes._status).toBe(201);
          expect(saveRes._body.success).toBe(true);

          // Step 2: Fetch leaderboard for that stage
          const getReq = mockReq({ stage: String(stage) });
          const getRes = mockRes();
          await leaderboardHandler(getReq, getRes);
          expect(getRes._status).toBe(200);

          const entries = getRes._body;
          expect(Array.isArray(entries)).toBe(true);

          // The saved final_score must appear in the leaderboard
          const found = entries.some(e => e.score === finalScore);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Rank Calculation Correctness
// For any set of existing scores for a stage and a new score being submitted,
// the returned rank should equal the count of existing scores strictly greater
// than the new score, plus one.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 8: Rank Calculation Correctness
describe('Property 8: Rank Calculation Correctness', () => {
  // Validates: Requirements 7.3

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  const validStageArb = fc.integer({ min: 1, max: 15 });
  // Array of 0�9 existing final_scores already in the DB
  const existingScoresArb = fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 0, maxLength: 9 });
  const newBaseScoreArb = fc.integer({ min: 0, max: 10000 });
  // Use a fixed completion time so time_bonus is deterministic
  const fixedTimeArb = fc.integer({ min: 1, max: 600000 });
  const studentIdArb = fc.uuid();

  test('returned rank equals count of existing scores strictly greater than new final_score, plus one', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStageArb,
        existingScoresArb,
        newBaseScoreArb,
        fixedTimeArb,
        studentIdArb,
        async (stage, existingScores, baseScore, completionTimeMs, studentId) => {
          const timeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));
          const finalScore = baseScore + timeBonus;

          // Expected rank: count of existing scores strictly greater + 1
          const expectedRank = existingScores.filter(s => s > finalScore).length + 1;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();

            if (sqlUpper.includes('MAX(FINAL_SCORE)')) {
              return { rows: [{ best: null }] };
            }
            if (sqlUpper.includes('LIMIT 2')) {
              return { rows: [] };
            }
            if (sqlUpper.includes('COUNT(*)')) {
              // Simulate the DB counting existing scores strictly greater than finalScore
              const count = existingScores.filter(s => s > finalScore).length;
              return { rows: [{ rank: count + 1 }] };
            }
            if (sqlUpper.startsWith('INSERT INTO LEADERBOARDS')) {
              return { rows: [] };
            }
            return { rows: [] };
          };

          const cookie = makeAuthCookie(studentId, 'testuser');
          const saveReq = mockSaveReq({ stage_id: stage, base_score: baseScore, completion_time_ms: completionTimeMs }, cookie);
          const saveRes = mockSaveRes();
          await saveHandler(saveReq, saveRes);

          expect(saveRes._status).toBe(201);
          expect(saveRes._body.rank).toBe(expectedRank);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Time Bonus Calculation
// For any completion_time_ms value, the computed time_bonus should equal
// max(0, floor((300000 - completion_time_ms) / 1000)).
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 14: Time Bonus Calculation
describe('Property 14: Time Bonus Calculation', () => {
  // Validates: Requirements 7.3

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  // Any positive completion_time_ms (handler requires > 0)
  const completionTimeMsArb = fc.integer({ min: 1, max: 1000000 });
  const studentIdArb = fc.uuid();

  test('time_bonus in saved row equals max(0, floor((300000 - completion_time_ms) / 1000))', async () => {
    await fc.assert(
      fc.asyncProperty(
        completionTimeMsArb,
        studentIdArb,
        async (completionTimeMs, studentId) => {
          const expectedTimeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));
          let capturedTimeBonus = null;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();
            if (sqlUpper.includes('MAX(FINAL_SCORE)')) {
              return { rows: [{ best: null }] };
            }
            if (sqlUpper.includes('LIMIT 2')) {
              return { rows: [] };
            }
            if (sqlUpper.includes('COUNT(*)')) {
              return { rows: [{ rank: 1 }] };
            }
            if (sqlUpper.startsWith('INSERT INTO LEADERBOARDS')) {
              // values: [studentId, stageNum, baseScore, timeBonus, finalScore, completionTimeMs, bonusApplied, rank]
              capturedTimeBonus = values[3];
              return { rows: [] };
            }
            return { rows: [] };
          };

          const cookie = makeAuthCookie(studentId, 'testuser');
          const saveReq = mockSaveReq(
            { stage_id: 1, base_score: 100, completion_time_ms: completionTimeMs },
            cookie
          );
          const saveRes = mockSaveRes();
          await saveHandler(saveReq, saveRes);

          expect(saveRes._status).toBe(201);
          expect(capturedTimeBonus).toBe(expectedTimeBonus);

          // Also verify final_score in response reflects the time bonus
          const expectedFinalScore = 100 + expectedTimeBonus;
          expect(saveRes._body.final_score).toBe(expectedFinalScore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Streak Multiplier Applied Correctly
// For any student who submits a score that beats their personal best for a
// stage 3 times in a row, the third submission's final_score should equal
// floor((base_score + time_bonus) * 1.5) and bonus_applied should be true.
// For all other submissions, bonus_applied should be false.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 15: Streak Multiplier Applied Correctly
describe('Property 15: Streak Multiplier Applied Correctly', () => {
  // Validates: Requirements 7.4

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  const validStageArb = fc.integer({ min: 1, max: 15 });
  const studentIdArb = fc.uuid();
  // base_score for the third submission
  const baseScoreArb = fc.integer({ min: 0, max: 5000 });
  // completion_time_ms for the third submission
  const completionTimeMsArb = fc.integer({ min: 1, max: 600000 });
  // The personal best before the streak (last 2 submissions both beat this)
  const previousBestArb = fc.integer({ min: 0, max: 1000 });

  test('third consecutive personal-best submission has bonus_applied=true and final_score=floor((base+time)*1.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStageArb,
        baseScoreArb,
        completionTimeMsArb,
        previousBestArb,
        studentIdArb,
        async (stage, baseScore, completionTimeMs, previousBest, studentId) => {
          const timeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));
          const rawFinalScore = baseScore + timeBonus;
          const expectedFinalScore = Math.floor(rawFinalScore * 1.5);

          // The last 2 submissions both beat previousBest
          const streak1Score = previousBest + 1;
          const streak2Score = previousBest + 2;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();
            // Personal best = previousBest (so last 2 scores beat it)
            if (sqlUpper.includes('MAX(FINAL_SCORE)')) {
              return { rows: [{ best: previousBest }] };
            }
            // Last 2 scores � both beat previousBest
            if (sqlUpper.includes('LIMIT 2')) {
              return {
                rows: [
                  { final_score: streak2Score },
                  { final_score: streak1Score },
                ],
              };
            }
            if (sqlUpper.includes('COUNT(*)')) {
              return { rows: [{ rank: 1 }] };
            }
            if (sqlUpper.startsWith('INSERT INTO LEADERBOARDS')) {
              return { rows: [] };
            }
            return { rows: [] };
          };

          const cookie = makeAuthCookie(studentId, 'testuser');
          const saveReq = mockSaveReq(
            { stage_id: stage, base_score: baseScore, completion_time_ms: completionTimeMs },
            cookie
          );
          const saveRes = mockSaveRes();
          await saveHandler(saveReq, saveRes);

          expect(saveRes._status).toBe(201);
          expect(saveRes._body.bonus_applied).toBe(true);
          expect(saveRes._body.final_score).toBe(expectedFinalScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submission without streak has bonus_applied=false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStageArb,
        baseScoreArb,
        completionTimeMsArb,
        studentIdArb,
        async (stage, baseScore, completionTimeMs, studentId) => {
          const timeBonus = Math.max(0, Math.floor((300000 - completionTimeMs) / 1000));
          const expectedFinalScore = baseScore + timeBonus;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();
            // No previous best ? streak cannot apply
            if (sqlUpper.includes('MAX(FINAL_SCORE)')) {
              return { rows: [{ best: null }] };
            }
            // No previous submissions
            if (sqlUpper.includes('LIMIT 2')) {
              return { rows: [] };
            }
            if (sqlUpper.includes('COUNT(*)')) {
              return { rows: [{ rank: 1 }] };
            }
            if (sqlUpper.startsWith('INSERT INTO LEADERBOARDS')) {
              return { rows: [] };
            }
            return { rows: [] };
          };

          const cookie = makeAuthCookie(studentId, 'testuser');
          const saveReq = mockSaveReq(
            { stage_id: stage, base_score: baseScore, completion_time_ms: completionTimeMs },
            cookie
          );
          const saveRes = mockSaveRes();
          await saveHandler(saveReq, saveRes);

          expect(saveRes._status).toBe(201);
          expect(saveRes._body.bonus_applied).toBe(false);
          expect(saveRes._body.final_score).toBe(expectedFinalScore);
        }
      ),
      { numRuns: 100 }
    );
  });
});
