// Run with: npm run seed
// Creates the first admin user and the 7 onboarding tasks.
// Add demo managers, HR and developers with: npm run seed -- --demo
// Safe to run more than once: it never creates duplicates.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('../config/env');
const connectDB = require('../config/db');
const { User, Task } = require('../models');
const seedDemo = require('./demo');

const withDemo = process.argv.includes('--demo');

const TASKS = [
  { taskId: 'T1', day: 1, title: 'Read company overview', description: 'Read the company overview: who we are, our clients, our values and how teams work together.' },
  { taskId: 'T2', day: 2, title: 'Local setup', description: 'Install the tools, get repository access and run the main project on your machine.' },
  { taskId: 'T3', day: 3, title: 'Git workflow', description: 'Learn our branching, commit message and pull request rules. Open a practice PR.' },
  { taskId: 'T4', day: 4, title: 'Codebase walkthrough', description: 'Walk through the codebase structure with your manager or a senior developer.' },
  { taskId: 'T5', day: 5, title: 'First bug fix', description: 'Pick a small "good first issue", fix it and get it reviewed.' },
  { taskId: 'T6', day: 6, title: 'Staging deploy', description: 'Deploy your fix to the staging environment and verify it works.' },
  { taskId: 'T7', day: 7, title: 'Feedback', description: 'Share feedback about your first week and plan next steps with your manager.' },
];

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env');
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters.');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email} (password not changed)`);
    return;
  }

  // 12 "salt rounds" = how slow the hash is. Slower = harder to brute force.
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: 'admin' });
  console.log(`Admin created: ${email}`);
}

async function seedTasks() {
  for (const task of TASKS) {
    // "upsert": update the task if it exists, otherwise create it.
    await Task.updateOne({ taskId: task.taskId }, { $set: task }, { upsert: true });
  }
  console.log(`${TASKS.length} onboarding tasks ready (T1-T7).`);
}

// Optional: a real manager account from .env (MANAGER_NAME, MANAGER_EMAIL,
// MANAGER_PASSWORD, MANAGER_PHONE). Creates the manager if the email is new;
// if it already exists, only updates the phone number. Skipped if
// MANAGER_EMAIL is empty.
async function seedManager() {
  const email = (process.env.MANAGER_EMAIL || '').trim().toLowerCase();
  if (!email) return;

  const name = process.env.MANAGER_NAME || 'Manager';
  const password = process.env.MANAGER_PASSWORD || '';
  const phone = process.env.MANAGER_PHONE || '';

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'manager') {
      console.log(`${email} exists but is "${existing.role}", not a manager; left unchanged.`);
      return;
    }
    if (phone) {
      existing.managerPhone = phone; // cleaned by the model setter
      await existing.save();
      console.log(`Manager phone updated: ${email} -> ${existing.managerPhone}`);
    }
    return;
  }

  if (password.length < 10) {
    throw new Error('MANAGER_PASSWORD must be at least 10 characters to create the manager.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const manager = await User.create({ name, email, passwordHash, role: 'manager', managerPhone: phone });
  console.log(`Manager created: ${email}${manager.managerPhone ? ` (phone ${manager.managerPhone})` : ' (no phone)'}`);
}

// One-time fix: in Phase 2 the staff phone field was called "whatsappNumber".
// Copy it to "managerPhone" and remove the old field. Does nothing once done.
async function migrateStaffPhoneField() {
  const result = await User.collection.updateMany({ whatsappNumber: { $exists: true } }, [
    { $set: { managerPhone: { $ifNull: ['$managerPhone', '$whatsappNumber'] } } },
    { $unset: 'whatsappNumber' },
  ]);
  if (result.modifiedCount > 0) {
    console.log(`Moved ${result.modifiedCount} staff phone number(s) to managerPhone.`);
  }
}

async function run() {
  try {
    await connectDB();
    await migrateStaffPhoneField();
    await seedAdmin();
    await seedTasks();
    await seedManager();
    if (withDemo) await seedDemo();
    console.log('Seed finished.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
