// Team & roles (admin only): list, invite, change role, deactivate.
const bcrypt = require('bcryptjs');
const { matchedData } = require('express-validator');
const { User } = require('../models');
const audit = require('../utils/audit');

const DUPLICATE_EMAIL = 'A user with this email already exists.';

// GET /api/users
async function listUsers(req, res) {
  const users = await User.find().sort({ name: 1 }); // toJSON hides the secret fields
  res.json({ users });
}

// GET /api/users/managers -> [{ _id, name }] (for the "Add developer" dropdown)
async function listManagers(req, res) {
  const managers = await User.find({ role: 'manager', active: { $ne: false } }).select('name').sort({ name: 1 }).lean();
  res.json({ managers });
}

// POST /api/users   body: { name, email, role, managerPhone?, password }
async function createUser(req, res) {
  const { name, email, role, managerPhone, password } = matchedData(req, { locations: ['body'] });

  if (await User.exists({ email })) {
    return res.status(409).json({ message: DUPLICATE_EMAIL });
  }

  let user;
  try {
    user = await User.create({
      name,
      email,
      role,
      // Only managers get WhatsApp alerts, so only they keep a phone number.
      managerPhone: role === 'manager' ? managerPhone : undefined,
      passwordHash: await bcrypt.hash(password, 12),
    });
  } catch (err) {
    // Two admins inviting the same email at the same moment
    if (err.code === 11000) return res.status(409).json({ message: DUPLICATE_EMAIL });
    throw err;
  }

  // Never log the password, not even the temporary one.
  await audit({
    user: req.user._id,
    action: 'user_created',
    details: { targetUserId: user._id, name, email, role },
    ip: req.ip,
  });

  res.status(201).json({ user });
}

// PATCH /api/users/:id   body: { role?, active? }
async function updateUser(req, res) {
  const { role, active } = matchedData(req, { locations: ['body'] });
  const isSelf = req.user._id.equals(req.params.id);

  // An admin locking themselves out (or demoting the last admin by accident)
  // would leave nobody able to manage the team.
  if (isSelf && active === false) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }
  if (isSelf && role !== undefined && role !== req.user.role) {
    return res.status(400).json({ message: 'You cannot change your own role.' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const changes = []; // one audit entry per change
  const target = { targetUserId: user._id, email: user.email };

  if (role !== undefined && role !== user.role) {
    changes.push({ action: 'user_role_changed', details: { ...target, from: user.role, to: role } });
    user.role = role;
  }
  if (active !== undefined && active !== (user.active !== false)) {
    changes.push({ action: active ? 'user_reactivated' : 'user_deactivated', details: target });
    user.active = active;
  }

  if (changes.length > 0) {
    await user.save();
    for (const change of changes) {
      await audit({ user: req.user._id, ...change, ip: req.ip });
    }
  }

  res.json({ user });
}

module.exports = { listUsers, listManagers, createUser, updateUser };
