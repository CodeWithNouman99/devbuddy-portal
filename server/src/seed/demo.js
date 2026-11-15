// Demo data, only created with: npm run seed -- --demo
// Fake people, numbers in a made-up range (92300555xxxx) and @example.com emails.
// Every demo developer gets isDemo: true, so the bot never messages them.
// Safe to run more than once: existing users/developers are skipped.
const bcrypt = require('bcryptjs');
const { User, Developer, Progress, Task, Question } = require('../models');
const { cleanWhatsappNumber } = require('../utils/phone');

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// Demo managers get their phone from DEMO_MANAGER_PHONE (see seedDemoStaff).
const DEMO_STAFF = [
  { key: 'sana', name: 'Sana Malik', email: 'sana.malik@example.com', role: 'manager' },
  { key: 'bilal', name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', role: 'manager' },
  { key: 'ayesha', name: 'Ayesha Khan', email: 'ayesha.khan@example.com', role: 'hr' },
];

// The WhatsApp number of the Nth demo developer: 923005550101, ...0102, ...
function demoNumber(index) {
  return `92300555${String(101 + index).padStart(4, '0')}`;
}

// DEMO_MANAGER_PHONE from .env, cleaned to digits. Empty = no phone.
function demoManagerPhone() {
  const raw = (process.env.DEMO_MANAGER_PHONE || '').trim();
  if (!raw) return null;
  const phone = cleanWhatsappNumber(raw);
  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error(`DEMO_MANAGER_PHONE "${raw}" is not a valid number (e.g. 0300 1234567).`);
  }
  return phone;
}

// day = current onboarding day, stuck = current task pending for 2+ days,
// completed = finished all 7 days
const DEMO_DEVELOPERS = [
  { name: 'Hamza Raza', role: 'Frontend', manager: 'sana', day: 3 },
  { name: 'Fatima Noor', role: 'Backend', manager: 'sana', day: 5, stuck: true },
  { name: 'Usman Tariq', role: 'Full Stack', manager: 'bilal', completed: true },
  { name: 'Zainab Ali', role: 'QA', manager: 'bilal', day: 2 },
  { name: 'Ahmed Hassan', role: 'DevOps', manager: 'bilal', day: 4, stuck: true },
  { name: 'Mariam Siddiqui', role: 'Frontend', manager: 'sana', day: 1 },
  { name: 'Omar Farooq', role: 'Backend', manager: 'bilal', day: 6 },
  { name: 'Hira Javed', role: 'Full Stack', manager: 'sana', day: 3, stuck: true },
  { name: 'Ali Haider', role: 'QA', manager: 'sana', completed: true },
  { name: 'Saad Qureshi', role: 'Backend', manager: 'bilal', day: 2 },
  { name: 'Iqra Shah', role: 'DevOps', manager: 'sana', day: 5 },
  { name: 'Daniyal Khan', role: 'Frontend', manager: 'bilal', day: 1, stuck: true },
];

const DEMO_QUESTIONS = {
  'Hamza Raza': [
    { question: 'Where do I find the environment variables for staging?', answer: 'They are in the team vault under "Staging / Web". Ask your manager for vault access if you cannot see it.', foundInDocs: true, resolved: true },
  ],
  'Fatima Noor': [
    { question: 'Which branch should my first bug fix go into?', answer: 'Create a branch from "develop" named fix/<ticket-id> and open the PR against "develop".', foundInDocs: true, resolved: true },
    { question: 'Who approves database migrations before they run on staging?', answer: '', foundInDocs: false, resolved: false },
  ],
  'Ahmed Hassan': [
    { question: 'How do I get access to the AWS console?', answer: '', foundInDocs: false, resolved: false },
  ],
  'Hira Javed': [
    { question: 'Is there a code style guide for React components?', answer: 'Yes, see "Frontend conventions" in the engineering handbook. ESLint and Prettier enforce most of it.', foundInDocs: true, resolved: true },
  ],
};

async function seedDemoStaff(password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const managerPhone = demoManagerPhone();
  const byKey = {};

  for (const { key, ...staff } of DEMO_STAFF) {
    let user = await User.findOne({ email: staff.email });
    if (!user) {
      user = await User.create({ ...staff, passwordHash });
      console.log(`Demo ${staff.role} created: ${staff.email}`);
    }

    // Every demo manager gets DEMO_MANAGER_PHONE, on every seed run, so
    // changing it in .env and re-seeding updates them. If it's empty, any
    // old phone is removed. Real managers (MANAGER_*) are never touched here.
    if (user.role === 'manager') {
      user.managerPhone = managerPhone ?? undefined;
      await user.save();
    }
    byKey[key] = user;
  }

  console.log(
    managerPhone
      ? `Demo managers' phone set to ${managerPhone} (DEMO_MANAGER_PHONE).`
      : 'DEMO_MANAGER_PHONE is empty: demo managers have no phone.'
  );
  return byKey;
}

async function seedDemoDevelopers(staff, admin) {
  const tasks = await Task.find().sort({ day: 1 }).lean();
  const now = Date.now();
  let created = 0;

  // Demo developers created by an older seed (before isDemo existed): mark them now.
  const marked = await Developer.updateMany(
    { whatsappNumber: { $in: DEMO_DEVELOPERS.map((_, i) => demoNumber(i)) }, isDemo: { $ne: true } },
    { $set: { isDemo: true } }
  );
  if (marked.modifiedCount > 0) console.log(`Marked ${marked.modifiedCount} existing demo developer(s) as isDemo.`);

  for (const [index, demo] of DEMO_DEVELOPERS.entries()) {
    const whatsappNumber = demoNumber(index);
    if (await Developer.exists({ whatsappNumber })) continue;

    const currentDay = demo.completed ? 7 : demo.day;
    // Stuck developers have spent 2 extra days on their current task.
    const daysSinceJoining = demo.completed ? 9 : currentDay - 1 + (demo.stuck ? 2 : 0);
    const joinDate = new Date(now - daysSinceJoining * DAY);
    joinDate.setUTCHours(0, 0, 0, 0);

    const developer = await Developer.create({
      name: demo.name,
      whatsappNumber,
      role: demo.role,
      joinDate,
      manager: staff[demo.manager]._id,
      currentDay,
      status: demo.completed ? 'completed' : 'active',
      createdBy: admin?._id,
      isDemo: true,
    });

    // One Progress row per day reached so far
    const progressRows = tasks
      .filter((task) => task.day <= currentDay)
      .map((task) => {
        const isCurrent = task.day === currentDay && !demo.completed;
        const assignedAt = isCurrent
          ? new Date(now - (demo.stuck ? 2 * DAY + 3 * HOUR : 3 * HOUR))
          : new Date(joinDate.getTime() + (task.day - 1) * DAY + 9 * HOUR);
        return {
          developer: developer._id,
          taskId: task.taskId,
          day: task.day,
          status: isCurrent ? 'pending' : 'done',
          assignedAt,
          completedAt: isCurrent ? null : new Date(assignedAt.getTime() + 6 * HOUR),
        };
      });
    await Progress.insertMany(progressRows);

    const questions = DEMO_QUESTIONS[demo.name] || [];
    await Question.insertMany(
      questions.map((q, i) => ({ ...q, developer: developer._id, askedAt: new Date(now - (i + 1) * 5 * HOUR) }))
    );

    created++;
  }
  console.log(`${created} demo developers created (${DEMO_DEVELOPERS.length - created} already existed).`);
}

async function seedDemo() {
  const password = process.env.DEMO_PASSWORD || '';
  if (password.length < 10) {
    throw new Error('Set DEMO_PASSWORD (at least 10 characters) in server/.env to use --demo.');
  }

  const admin = await User.findOne({ role: 'admin' });
  const staff = await seedDemoStaff(password);
  await seedDemoDevelopers(staff, admin);
}

module.exports = seedDemo;
