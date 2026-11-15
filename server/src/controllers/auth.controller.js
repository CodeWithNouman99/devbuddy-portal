// Login, logout and "who am I".
// Note: we use Express 5, which automatically sends errors from async
// functions to the error handler, so no try/catch is needed here.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const audit = require('../utils/audit');
const { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie } = require('../utils/token');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const INVALID_CREDENTIALS = 'Invalid email or password.';

// A fake hash we compare against when the email does not exist, so that
// a wrong email takes the same time as a wrong password. Otherwise an attacker
// could measure response times to find out which emails are real.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function lockedMessage(lockUntil) {
  const minutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
  return `This account is locked after too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

// POST /api/auth/login   body: { email, password, rememberMe }
async function login(req, res) {
  const { email, password } = req.body;
  const rememberMe = req.body.rememberMe === true;
  const ip = req.ip;

  const user = await User.findOne({ email });

  // 1. Unknown email -> generic error (don't reveal which part was wrong)
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    await audit({ action: 'login_failed', details: { email, reason: 'unknown_email' }, ip });
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }

  // 2. Account currently locked -> refuse without even checking the password
  if (user.isLocked()) {
    await audit({ user: user._id, action: 'login_blocked_locked', details: { email }, ip });
    return res.status(423).json({ message: lockedMessage(user.lockUntil) });
  }

  // 3. Check the password against the stored bcrypt hash
  const passwordOk = await bcrypt.compare(password, user.passwordHash);

  if (!passwordOk) {
    // Add 1 to the counter with $inc. This is "atomic": two wrong attempts
    // at the same moment both get counted correctly.
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { failedLogins: 1 } },
      { returnDocument: 'after' }
    );

    // 5th wrong password in a row -> lock for 15 minutes and reset the counter
    if (updated.failedLogins >= MAX_FAILED_LOGINS) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      await User.updateOne({ _id: user._id }, { failedLogins: 0, lockUntil });
      await audit({ user: user._id, action: 'account_locked', details: { email, lockUntil }, ip });
      return res.status(423).json({ message: lockedMessage(lockUntil) });
    }

    await audit({
      user: user._id,
      action: 'login_failed',
      details: { email, reason: 'wrong_password', failedLogins: updated.failedLogins },
      ip,
    });
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }

  // 4. Right password but the account was deactivated by an admin. Checked
  //    after the password so this message can't be used to probe accounts.
  if (user.active === false) {
    await audit({ user: user._id, action: 'login_blocked_inactive', details: { email }, ip });
    return res.status(403).json({ message: 'This account has been deactivated. Ask an admin to restore it.' });
  }

  // 5. Success -> reset the lockout fields and remember when they logged in
  user.failedLogins = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user, rememberMe);
  setAuthCookie(res, token, rememberMe);

  await audit({ user: user._id, action: 'login_success', details: { email, rememberMe }, ip });
  res.json({ user });
}

// POST /api/auth/logout
// Works even if the token is already expired: we always clear the cookie.
async function logout(req, res) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyToken(token);
      await audit({ user: payload.sub, action: 'logout', ip: req.ip });
    } catch {
      // Expired or invalid token: nothing to log, just clear it.
    }
  }
  clearAuthCookie(res);
  res.json({ message: 'Signed out.' });
}

// GET /api/auth/me   (protected by requireAuth, which sets req.user)
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
