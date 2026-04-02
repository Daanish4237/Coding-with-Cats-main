/**
 * Property-based tests for Auth_Service registration validation and login/check round trips.
 * Feature: vercel-deployment
 */

const fc = require('fast-check');
const bcrypt = require('bcryptjs');
const registerHandler = require('../../auth/register');
const loginHandler = require('../../auth/login');
const checkHandler = require('../../auth/check');

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock res object that captures status + json calls.
 */
function mockRes() {
  const res = { _status: null, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  return res;
}

/**
 * Build a minimal mock req object for POST /api/auth/register.
 */
function mockReq(body) {
  return { method: 'POST', body };
}

// ---------------------------------------------------------------------------
// DB mock — a single mutable query function shared across all tests.
// Each describe block sets mockQueryImpl to control DB behaviour.
// ---------------------------------------------------------------------------

let lastInsertValues = null;
let mockQueryImpl = null; // set per-describe to control DB behaviour

jest.mock('../../_db', () => {
  const mockQuery = jest.fn(async (sql, values) => {
    if (mockQueryImpl) return mockQueryImpl(sql, values);
    // Default: capture INSERT values and return empty rows
    lastInsertValues = values;
    return { rows: [] };
  });
  return { getPool: () => ({ query: mockQuery }) };
});

// Grab a reference to the mock query so we can set mockQueryImpl
const { getPool } = require('../../_db');
const mockQuery = getPool().query;

// ---------------------------------------------------------------------------
// Property 4: Registration Input Validation
// For any registration request where at least one of the following is true:
//   - username is empty/missing
//   - email is empty/missing
//   - password is empty/missing
//   - password length < 6
//   - email is not a valid email format
// the Auth_Service should return HTTP 400.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 4: Registration Input Validation
describe('Property 4: Registration Input Validation', () => {
  // Validates: Requirements 2.5, 2.6, 2.7

  // Arbitrary: a non-empty string that is NOT a valid email
  const invalidEmailArb = fc.string({ minLength: 1 }).filter(
    (s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  );

  // Arbitrary: a password shorter than 6 characters (may be empty)
  const shortPasswordArb = fc.string({ minLength: 0, maxLength: 5 });

  // Arbitrary: a valid-looking username (non-empty, non-whitespace-only)
  const validUsernameArb = fc.string({ minLength: 1 }).filter(
    (s) => s.trim().length > 0
  );

  // Arbitrary: a valid email
  const validEmailArb = fc.tuple(
    fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.constantFrom('com', 'net', 'org', 'io')
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

  // Arbitrary: a valid password (≥ 6 chars)
  const validPasswordArb = fc.string({ minLength: 6 });

  test('missing username → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(undefined, null, '', '   '),
        validEmailArb,
        validPasswordArb,
        async (username, email, password) => {
          const req = mockReq({ username, email, password });
          const res = mockRes();
          await registerHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('missing email → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        fc.constantFrom(undefined, null, '', '   '),
        validPasswordArb,
        async (username, email, password) => {
          const req = mockReq({ username, email, password });
          const res = mockRes();
          await registerHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('missing password → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        validEmailArb,
        fc.constantFrom(undefined, null, ''),
        async (username, email, password) => {
          const req = mockReq({ username, email, password });
          const res = mockRes();
          await registerHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('password shorter than 6 characters → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        validEmailArb,
        shortPasswordArb.filter((p) => p.length > 0), // non-empty but < 6
        async (username, email, password) => {
          const req = mockReq({ username, email, password });
          const res = mockRes();
          await registerHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('invalid email format → HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        invalidEmailArb,
        validPasswordArb,
        async (username, email, password) => {
          const req = mockReq({ username, email, password });
          const res = mockRes();
          await registerHandler(req, res);
          expect(res._status).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Registration Always Assigns User Role
// For any registration request body — including one that explicitly sets
// role='Admin' — the created student record should always have role='User'.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 11: Registration Always Assigns User Role
describe('Property 11: Registration Always Assigns User Role', () => {
  // Validates: Requirements 11.4

  const validUsernameArb = fc.string({ minLength: 1 }).filter(
    (s) => s.trim().length > 0
  );

  const validEmailArb = fc.tuple(
    fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.constantFrom('com', 'net', 'org', 'io')
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

  const validPasswordArb = fc.string({ minLength: 6 });

  // Any role value the client might send, including 'Admin'
  const roleArb = fc.oneof(
    fc.constant('Admin'),
    fc.constant('admin'),
    fc.constant('ADMIN'),
    fc.constant('User'),
    fc.constant('superuser'),
    fc.string()
  );

  test('stored role is always "User" regardless of role field in request body', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameArb,
        validEmailArb,
        validPasswordArb,
        roleArb,
        async (username, email, password, role) => {
          lastInsertValues = null;
          const req = mockReq({ username, email, password, role });
          const res = mockRes();
          await registerHandler(req, res);

          // Handler should succeed (201) and the INSERT should store role='User'
          expect(res._status).toBe(201);
          expect(lastInsertValues).not.toBeNull();
          // values array: [student_id, username, email, hashedPassword, role]
          const storedRole = lastInsertValues[4];
          expect(storedRole).toBe('User');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// ---------------------------------------------------------------------------
// Shared arbitraries for round-trip properties
// ---------------------------------------------------------------------------

const validUsernameRoundTripArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z0-9_]+$/.test(s));

const validEmailRoundTripArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
    fc.constantFrom('com', 'net', 'org', 'io')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const validPasswordRoundTripArb = fc.string({ minLength: 6, maxLength: 30 }).filter(
  (s) => s.trim().length >= 6
);

/**
 * Build a mock res that also captures Set-Cookie headers (needed for login → check).
 */
function mockResWithCookies() {
  const res = { _status: null, _body: null, _headers: {} };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  res.setHeader = (name, value) => { res._headers[name] = value; };
  return res;
}

/**
 * Build an in-memory DB mock that simulates register → login → check.
 * Returns a mockQueryImpl function that stores users in the provided Map.
 */
function makeInMemoryDbMock(userStore) {
  return async function inMemoryQuery(sql, values) {
    const sqlUpper = sql.trim().toUpperCase();

    // INSERT into students — store user in memory
    if (sqlUpper.startsWith('INSERT INTO STUDENTS')) {
      const [student_id, username, email, password, role] = values;
      if (userStore.has(username)) {
        const err = new Error('duplicate');
        err.code = '23505';
        throw err;
      }
      userStore.set(username, { student_id, username, email, password, role });
      return { rows: [] };
    }

    // SELECT from students by username (login lookup)
    if (sqlUpper.startsWith('SELECT') && sqlUpper.includes('FROM STUDENTS') && sqlUpper.includes('WHERE USERNAME')) {
      const username = values[0];
      const user = userStore.get(username);
      return { rows: user ? [user] : [] };
    }

    // UPDATE lastLogin — no-op
    if (sqlUpper.startsWith('UPDATE STUDENTS')) {
      return { rows: [] };
    }

    return { rows: [] };
  };
}

// ---------------------------------------------------------------------------
// Property 1: Register → Login Round Trip
// For any valid username, email, and password, registering a new account and
// then logging in with the same credentials should succeed (HTTP 200) and
// return the same username.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 1: Register → Login Round Trip
describe('Property 1: Register → Login Round Trip', () => {
  // Validates: Requirements 2.2, 3.2

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null; // reset before each test
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  test('register then login with same credentials returns HTTP 200 and matching username', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameRoundTripArb,
        validEmailRoundTripArb,
        validPasswordRoundTripArb,
        async (username, email, password) => {
          const userStore = new Map();
          mockQueryImpl = makeInMemoryDbMock(userStore);

          // Step 1: Register
          const registerReq = { method: 'POST', body: { username, email, password } };
          const registerRes = mockResWithCookies();
          await registerHandler(registerReq, registerRes);
          expect(registerRes._status).toBe(201);

          // Step 2: Login with same credentials
          const loginReq = { method: 'POST', body: { username, password } };
          const loginRes = mockResWithCookies();
          await loginHandler(loginReq, loginRes);

          expect(loginRes._status).toBe(200);
          expect(loginRes._body).toMatchObject({ success: true, username });
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

// ---------------------------------------------------------------------------
// Property 2: Login → Check Round Trip
// For any registered user, logging in should set a JWT cookie such that a
// subsequent GET /api/auth/check call returns { authenticated: true } with
// the correct username and student_id.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 2: Login → Check Round Trip
describe('Property 2: Login → Check Round Trip', () => {
  // Validates: Requirements 3.2, 4.2

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  test('login sets JWT cookie; check returns authenticated: true with correct username and student_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameRoundTripArb,
        validEmailRoundTripArb,
        validPasswordRoundTripArb,
        async (username, email, password) => {
          const userStore = new Map();
          mockQueryImpl = makeInMemoryDbMock(userStore);

          // Step 1: Register
          const registerReq = { method: 'POST', body: { username, email, password } };
          const registerRes = mockResWithCookies();
          await registerHandler(registerReq, registerRes);
          expect(registerRes._status).toBe(201);

          // Step 2: Login — capture the Set-Cookie header
          const loginReq = { method: 'POST', body: { username, password } };
          const loginRes = mockResWithCookies();
          await loginHandler(loginReq, loginRes);
          expect(loginRes._status).toBe(200);

          const setCookieHeader = loginRes._headers['Set-Cookie'];
          expect(setCookieHeader).toBeDefined();

          // Extract just the token=<value> part from the Set-Cookie header
          // e.g. "token=eyJ...; Path=/; HttpOnly; ..."
          const tokenCookiePart = setCookieHeader.split(';')[0];

          // Step 3: Check — pass the cookie in the request headers
          const checkReq = {
            method: 'GET',
            headers: { cookie: tokenCookiePart },
          };
          const checkRes = mockResWithCookies();
          await checkHandler(checkReq, checkRes);

          expect(checkRes._status).toBe(200);
          expect(checkRes._body).toMatchObject({
            authenticated: true,
            username,
          });
          // student_id should be present and match what was registered
          expect(checkRes._body.student_id).toBeDefined();
          const storedUser = userStore.get(username);
          expect(checkRes._body.student_id).toBe(storedUser.student_id);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

// ---------------------------------------------------------------------------
// Property 3: Login → Logout → Check Round Trip
// For any registered user, logging in and then logging out should result in
// GET /api/auth/check returning { authenticated: false }.
// ---------------------------------------------------------------------------

// Feature: vercel-deployment, Property 3: Login → Logout → Check Round Trip
describe('Property 3: Login → Logout → Check Round Trip', () => {
  // Validates: Requirements 5.2

  const logoutHandler = require('../../auth/logout');

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-property-tests';
    mockQueryImpl = null;
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  test('login then logout results in check returning authenticated: false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUsernameRoundTripArb,
        validEmailRoundTripArb,
        validPasswordRoundTripArb,
        async (username, email, password) => {
          const userStore = new Map();
          mockQueryImpl = makeInMemoryDbMock(userStore);

          // Step 1: Register
          const registerReq = { method: 'POST', body: { username, email, password } };
          const registerRes = mockResWithCookies();
          await registerHandler(registerReq, registerRes);
          expect(registerRes._status).toBe(201);

          // Step 2: Login — capture the Set-Cookie header with JWT
          const loginReq = { method: 'POST', body: { username, password } };
          const loginRes = mockResWithCookies();
          await loginHandler(loginReq, loginRes);
          expect(loginRes._status).toBe(200);

          const loginCookieHeader = loginRes._headers['Set-Cookie'];
          expect(loginCookieHeader).toBeDefined();

          // Extract the token=<value> part to pass as a cookie to logout
          const tokenCookiePart = loginCookieHeader.split(';')[0];

          // Step 3: Logout — pass the JWT cookie so the handler can clear it
          const logoutReq = {
            method: 'POST',
            headers: { cookie: tokenCookiePart },
          };
          const logoutRes = mockResWithCookies();
          logoutHandler(logoutReq, logoutRes);
          expect(logoutRes._status).toBe(200);
          expect(logoutRes._body).toMatchObject({ success: true });

          // Capture the cleared cookie from logout response
          const clearedCookieHeader = logoutRes._headers['Set-Cookie'];
          expect(clearedCookieHeader).toBeDefined();

          // Extract the cleared token value (token=; Max-Age=0; ...)
          const clearedCookiePart = clearedCookieHeader.split(';')[0];

          // Step 4: Check — pass the cleared cookie; should return authenticated: false
          const checkReq = {
            method: 'GET',
            headers: { cookie: clearedCookiePart },
          };
          const checkRes = mockResWithCookies();
          checkHandler(checkReq, checkRes);

          expect(checkRes._status).toBe(200);
          expect(checkRes._body).toMatchObject({ authenticated: false });
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
