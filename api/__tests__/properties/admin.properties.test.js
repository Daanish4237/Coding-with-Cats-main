/**
 * Property-based tests for Admin_Service role enforcement.
 * Feature: vercel-deployment
 */

// Feature: vercel-deployment, Property 10: Admin Role Enforcement
// For any Admin_Service route (/api/admin/*), a request carrying a JWT with
// role='User' or no JWT at all should be rejected with HTTP 403.
// Validates: Requirements 11.6, 12.7

const fc = require('fast-check');
const jwt = require('jsonwebtoken');

const stagesHandler = require('../../admin/stages');
const stagesIdHandler = require('../../admin/stages/[id]');
const progressHandler = require('../../admin/reports/progress');

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

function makeReq(method, cookieHeader, query = {}, body = {}) {
  return {
    method,
    headers: { cookie: cookieHeader || '' },
    query,
    body,
  };
}

// ---------------------------------------------------------------------------
// DB mock — admin routes need a pool but should never reach DB for 403 cases
// ---------------------------------------------------------------------------

jest.mock('../../_db', () => {
  const mockQuery = jest.fn(async () => ({ rows: [] }));
  return { getPool: () => ({ query: mockQuery }) };
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Any role that is NOT 'Admin'
const nonAdminRoleArb = fc.oneof(
  fc.constant('User'),
  fc.constant('user'),
  fc.constant('admin'),   // wrong case
  fc.constant('ADMIN'),   // wrong case
  fc.constant(''),
  fc.string().filter((s) => s !== 'Admin')
);

// A valid student_id (UUID-like)
const studentIdArb = fc.uuid();

// A valid username
const usernameArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
  (s) => /^[a-zA-Z0-9_]+$/.test(s)
);

/**
 * Build a signed JWT cookie with the given role.
 */
function makeJwtCookie(studentId, username, role) {
  const token = jwt.sign(
    { student_id: studentId, username, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

// ---------------------------------------------------------------------------
// Property 10: Admin Role Enforcement
// ---------------------------------------------------------------------------

describe('Property 10: Admin Role Enforcement', () => {
  // Validates: Requirements 11.6, 12.7

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-admin-property-tests';
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/stages — non-Admin JWT → 403
  // -------------------------------------------------------------------------
  test('GET /api/admin/stages with non-Admin role JWT → HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        nonAdminRoleArb,
        async (studentId, username, role) => {
          const cookie = makeJwtCookie(studentId, username, role);
          const req = makeReq('GET', cookie);
          const res = mockRes();
          await stagesHandler(req, res);
          expect(res._status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/stages — no JWT → 403
  // -------------------------------------------------------------------------
  test('GET /api/admin/stages with no JWT → HTTP 403', async () => {
    const req = makeReq('GET', '');
    const res = mockRes();
    await stagesHandler(req, res);
    expect(res._status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // POST /api/admin/stages — non-Admin JWT → 403
  // -------------------------------------------------------------------------
  test('POST /api/admin/stages with non-Admin role JWT → HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        nonAdminRoleArb,
        async (studentId, username, role) => {
          const cookie = makeJwtCookie(studentId, username, role);
          const req = makeReq('POST', cookie, {}, { name: 'Test', difficulty: 'Easy', description: 'Desc', maxScore: 100 });
          const res = mockRes();
          await stagesHandler(req, res);
          expect(res._status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // POST /api/admin/stages — no JWT → 403
  // -------------------------------------------------------------------------
  test('POST /api/admin/stages with no JWT → HTTP 403', async () => {
    const req = makeReq('POST', '', {}, { name: 'Test', difficulty: 'Easy', description: 'Desc', maxScore: 100 });
    const res = mockRes();
    await stagesHandler(req, res);
    expect(res._status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // PUT /api/admin/stages/:id — non-Admin JWT → 403
  // -------------------------------------------------------------------------
  test('PUT /api/admin/stages/:id with non-Admin role JWT → HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        nonAdminRoleArb,
        fc.uuid(),
        async (studentId, username, role, stageId) => {
          const cookie = makeJwtCookie(studentId, username, role);
          const req = makeReq('PUT', cookie, { id: stageId }, { name: 'Updated' });
          const res = mockRes();
          await stagesIdHandler(req, res);
          expect(res._status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // PUT /api/admin/stages/:id — no JWT → 403
  // -------------------------------------------------------------------------
  test('PUT /api/admin/stages/:id with no JWT → HTTP 403', async () => {
    const req = makeReq('PUT', '', { id: 'some-id' }, { name: 'Updated' });
    const res = mockRes();
    await stagesIdHandler(req, res);
    expect(res._status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // DELETE /api/admin/stages/:id — non-Admin JWT → 403
  // -------------------------------------------------------------------------
  test('DELETE /api/admin/stages/:id with non-Admin role JWT → HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        nonAdminRoleArb,
        fc.uuid(),
        async (studentId, username, role, stageId) => {
          const cookie = makeJwtCookie(studentId, username, role);
          const req = makeReq('DELETE', cookie, { id: stageId });
          const res = mockRes();
          await stagesIdHandler(req, res);
          expect(res._status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // DELETE /api/admin/stages/:id — no JWT → 403
  // -------------------------------------------------------------------------
  test('DELETE /api/admin/stages/:id with no JWT → HTTP 403', async () => {
    const req = makeReq('DELETE', '', { id: 'some-id' });
    const res = mockRes();
    await stagesIdHandler(req, res);
    expect(res._status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/reports/progress — non-Admin JWT → 403
  // -------------------------------------------------------------------------
  test('GET /api/admin/reports/progress with non-Admin role JWT → HTTP 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        nonAdminRoleArb,
        async (studentId, username, role) => {
          const cookie = makeJwtCookie(studentId, username, role);
          const req = makeReq('GET', cookie);
          const res = mockRes();
          await progressHandler(req, res);
          expect(res._status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/reports/progress — no JWT → 403
  // -------------------------------------------------------------------------
  test('GET /api/admin/reports/progress with no JWT → HTTP 403', async () => {
    const req = makeReq('GET', '');
    const res = mockRes();
    await progressHandler(req, res);
    expect(res._status).toBe(403);
  });
});
