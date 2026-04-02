/**
 * Property-based tests for Shop_Service purchase logic.
 * Feature: vercel-deployment
 */

// Feature: vercel-deployment, Property 12: Shop Purchase Deducts Points Correctly
// Feature: vercel-deployment, Property 13: Insufficient Points Rejected
// Validates: Requirements 14.5, 14.6

const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const buyHandler = require('../../shop/buy');

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

function makeReq(body, cookieHeader) {
  return {
    method: 'POST',
    headers: { cookie: cookieHeader || '' },
    body,
  };
}

function makeJwtCookie(studentId, username) {
  const token = jwt.sign(
    { student_id: studentId, username, role: 'User' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

let mockQueryImpl = null;

jest.mock('../../_db', () => {
  const mockQuery = jest.fn(async (sql, values) => {
    if (mockQueryImpl) return mockQueryImpl(sql, values);
    return { rows: [], rowCount: 0 };
  });
  return { getPool: () => ({ query: mockQuery }) };
});

const { getPool } = require('../../_db');
const mockQuery = getPool().query;

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const studentIdArb = fc.uuid();
const usernameArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
  (s) => /^[a-zA-Z0-9_]+$/.test(s)
);
const itemIdArb = fc.uuid();

// Price in range 1..10000
const priceArb = fc.integer({ min: 1, max: 10000 });

// ---------------------------------------------------------------------------
// Property 12: Shop Purchase Deducts Points Correctly
// For any student with totalPoints >= item.price, purchasing an item should
// result in remainingPoints = totalPoints - item.price and a new row in
// student_items.
// ---------------------------------------------------------------------------

describe('Property 12: Shop Purchase Deducts Points Correctly', () => {
  // Validates: Requirements 14.5

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-shop-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  test('purchase with sufficient points returns HTTP 200 and remainingPoints = totalPoints - price', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        itemIdArb,
        priceArb,
        // totalPoints is >= price (price..price+10000)
        fc.integer({ min: 0, max: 10000 }),
        async (studentId, username, itemId, price, extra) => {
          const totalPoints = price + extra; // guaranteed >= price
          let studentItemsInserted = false;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();

            // Item lookup
            if (sqlUpper.includes('FROM ITEMS')) {
              return { rows: [{ item_id: itemId, name: 'Test Item', type: 'cosmetic', price, description: 'desc' }], rowCount: 1 };
            }
            // Student totalPoints lookup
            if (sqlUpper.includes('FROM STUDENTS') && sqlUpper.includes('SELECT')) {
              return { rows: [{ totalPoints }], rowCount: 1 };
            }
            // Deduct points UPDATE
            if (sqlUpper.startsWith('UPDATE STUDENTS')) {
              return { rows: [], rowCount: 1 };
            }
            // Insert into student_items
            if (sqlUpper.includes('INTO STUDENT_ITEMS')) {
              studentItemsInserted = true;
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          };

          const cookie = makeJwtCookie(studentId, username);
          const req = makeReq({ item_id: itemId }, cookie);
          const res = mockRes();
          await buyHandler(req, res);

          expect(res._status).toBe(200);
          expect(res._body.success).toBe(true);
          expect(res._body.remainingPoints).toBe(totalPoints - price);
          expect(studentItemsInserted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Insufficient Points Rejected
// For any student with totalPoints < item.price, a purchase attempt should
// return HTTP 402 and leave totalPoints unchanged (no student_items INSERT).
// ---------------------------------------------------------------------------

describe('Property 13: Insufficient Points Rejected', () => {
  // Validates: Requirements 14.6

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-shop-property-tests';
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  afterEach(() => {
    mockQueryImpl = null;
    mockQuery.mockClear();
  });

  test('purchase with insufficient points returns HTTP 402 and does not insert into student_items', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        usernameArb,
        itemIdArb,
        priceArb,
        // totalPoints is strictly less than price (0..price-1)
        fc.integer({ min: 0, max: 9999 }),
        async (studentId, username, itemId, price, deficit) => {
          // Ensure totalPoints < price
          const totalPoints = Math.min(deficit, price - 1);
          let studentItemsInserted = false;
          let pointsUpdated = false;

          mockQueryImpl = async (sql, values) => {
            const sqlUpper = sql.trim().toUpperCase();

            // Item lookup
            if (sqlUpper.includes('FROM ITEMS')) {
              return { rows: [{ item_id: itemId, name: 'Test Item', type: 'cosmetic', price, description: 'desc' }], rowCount: 1 };
            }
            // Student totalPoints lookup
            if (sqlUpper.includes('FROM STUDENTS') && sqlUpper.includes('SELECT')) {
              return { rows: [{ totalPoints }], rowCount: 1 };
            }
            // Should NOT reach UPDATE or INSERT
            if (sqlUpper.startsWith('UPDATE STUDENTS')) {
              pointsUpdated = true;
              return { rows: [], rowCount: 1 };
            }
            if (sqlUpper.includes('INTO STUDENT_ITEMS')) {
              studentItemsInserted = true;
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          };

          const cookie = makeJwtCookie(studentId, username);
          const req = makeReq({ item_id: itemId }, cookie);
          const res = mockRes();
          await buyHandler(req, res);

          expect(res._status).toBe(402);
          expect(studentItemsInserted).toBe(false);
          expect(pointsUpdated).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
