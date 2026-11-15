// Everything about the login token (JWT) and the cookie that carries it.
const jwt = require('jsonwebtoken');
const { jwtSecret, cookieSecure } = require('../config/env');

const COOKIE_NAME = 'devbuddy_token';
const SHORT_SESSION = 8 * 60 * 60 * 1000; // 8 hours
const LONG_SESSION = 7 * 24 * 60 * 60 * 1000; // 7 days ("Keep me signed in")

// The cookie settings that make the token hard to steal:
//  httpOnly -> JavaScript in the browser cannot read it (protects against XSS)
//  secure   -> only sent over HTTPS
//  sameSite -> not sent when another website makes a request (protects against CSRF)
const baseCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'strict',
  path: '/',
};

// Create a signed token that says "this is user X with role Y".
function signToken(user, rememberMe) {
  const lifetimeMs = rememberMe ? LONG_SESSION : SHORT_SESSION;
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, {
    expiresIn: Math.floor(lifetimeMs / 1000), // seconds
  });
}

// Check the signature and expiry. Throws if the token is fake or expired.
function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

function setAuthCookie(res, token, rememberMe) {
  res.cookie(COOKIE_NAME, token, {
    ...baseCookieOptions,
    // With maxAge the cookie survives closing the browser.
    // Without it, it is a "session cookie" that disappears when the browser closes.
    ...(rememberMe ? { maxAge: LONG_SESSION } : {}),
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
