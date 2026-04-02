/**
 * Property-based tests for Shop_Service purchase logic.
 * Feature: vercel-deployment
 */

// Feature: vercel-deployment, Property 12: Shop Purchase Deducts Points Correctly
// Feature: vercel-deployment, Property 13: Insufficient Points Rejected
// Validates: Requirements 14.5, 14.6

const fc = require("fast-check");
const jwt = require("jsonwebtoken");
const buyHandler = require("../../shop/buy");

function mockRes() {
  const res = { _status: null, _body: null, _headers: {} };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body)  => { res._body  = body; return res; };
  res.setHeader = (name, value) => { res._headers[name] = value; };
  return res;
}

function makeReq(body, cookieHeader) {
  return { method: "POST", headers: { cookie: cookieHeader || "" }, body };
}

function makeJwtCookie(studentId, username) {
  const token = jwt.sign(
    { student_id: studentId, username, role: "User" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return "token=" + token;
}

let mockQueryImpl = null;

jest.mock("../../_db", () => {
  const mockQuery = jest.fn(async (sql, values) => {
    if (mockQueryImpl) return mockQueryImpl(sql, values);
    return { rows: [], rowCount: 0 };
  });
  return { getPool: () => ({ query: mockQuery }) };
});

const { getPool } = require("../../_db");
const mockQuery = getPool().query;

const studentIdArb = fc.uuid();
const usernameArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_]+$/.test(s));
const itemIdArb = fc.uuid();
const priceArb = fc.integer({ min: 1, max: 10000 });

describe("Property 12: Shop Purchase Deducts Points Correctly", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-for-shop-property-tests";
    mockQueryImpl = null;
    mockQuery.mockClear();
  });
  afterEach(() => { mockQueryImpl = null; mockQuery.mockClear(); });

  test("purchase with sufficient points returns HTTP 200 and remainingPoints = totalPoints - price", async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb, usernameArb, itemIdArb, priceArb,
        fc.integer({ min: 0, max: 10000 }),
        async (studentId, username, itemId, price, extra) => {
          const totalPoints = price + extra;
          let studentItemsInserted = false;
          mockQueryImpl = async (sql) => {
            const s = sql.trim().toUpperCase();
            if (s.includes("FROM ITEMS")) return { rows: [{ item_id: itemId, name: "Test Item", type: "cosmetic", price, description: "desc" }], rowCount: 1 };
            if (s.includes("FROM STUDENTS") && s.includes("SELECT")) return { rows: [{ totalPoints }], rowCount: 1 };
            if (s.startsWith("UPDATE STUDENTS")) return { rows: [], rowCount: 1 };
            if (s.includes("INTO STUDENT_ITEMS")) { studentItemsInserted = true; return { rows: [], rowCount: 1 }; }
            return { rows: [], rowCount: 0 };
          };
          const req = makeReq({ item_id: itemId }, makeJwtCookie(studentId, username));
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

describe("Property 13: Insufficient Points Rejected", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-for-shop-property-tests";
    mockQueryImpl = null;
    mockQuery.mockClear();
  });
  afterEach(() => { mockQueryImpl = null; mockQuery.mockClear(); });

  test("purchase with insufficient points returns HTTP 402 and does not insert into student_items", async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb, usernameArb, itemIdArb, priceArb,
        fc.integer({ min: 0, max: 9999 }),
        async (studentId, username, itemId, price, deficit) => {
          const totalPoints = Math.min(deficit, price - 1);
          let studentItemsInserted = false;
          let pointsUpdated = false;
          mockQueryImpl = async (sql) => {
            const s = sql.trim().toUpperCase();
            if (s.includes("FROM ITEMS")) return { rows: [{ item_id: itemId, name: "Test Item", type: "cosmetic", price, description: "desc" }], rowCount: 1 };
            if (s.includes("FROM STUDENTS") && s.includes("SELECT")) return { rows: [{ totalPoints }], rowCount: 1 };
            if (s.startsWith("UPDATE STUDENTS")) { pointsUpdated = true; return { rows: [], rowCount: 1 }; }
            if (s.includes("INTO STUDENT_ITEMS")) { studentItemsInserted = true; return { rows: [], rowCount: 1 }; }
            return { rows: [], rowCount: 0 };
          };
          const req = makeReq({ item_id: itemId }, makeJwtCookie(studentId, username));
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