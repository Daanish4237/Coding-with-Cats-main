// api/_auth.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const COOKIE_NAME = 'token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function setCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, COOKIE_OPTS));
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { ...COOKIE_OPTS, maxAge: 0 }));
}

module.exports = { signToken, verifyToken, setCookie, clearCookie };
