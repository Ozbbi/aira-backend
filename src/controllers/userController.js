const { nanoid } = require('nanoid');
const { readUsers, writeUsers } = require('../utils/storage');

function resetDailyIfNeeded(user) {
  const today = new Date().toISOString().split('T')[0];
  if (user.lastActiveDate !== today) {
    user.lessonsCompletedToday = 0;
  }
  if (!Array.isArray(user.completedLessonIds)) {
    user.completedLessonIds = [];
  }
}

async function createUser(req, res) {
  const { name, email } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const users = await readUsers();
  const user = {
    id: nanoid(),
    name,
    email: email || null,
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: null,
    tier: 'free',
    lessonsCompletedToday: 0,
    totalLessonsCompleted: 0,
    accuracyHistory: [],
    completedLessonIds: [],
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeUsers(users);
  res.status(201).json(user);
}

async function getUser(req, res) {
  const users = await readUsers();
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  resetDailyIfNeeded(user);
  res.json(user);
}

async function getUserLimits(req, res) {
  const users = await readUsers();
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  resetDailyIfNeeded(user);

  const dailyLimit = user.tier === 'pro' ? Infinity : 5;
  const canTakeLesson = user.lessonsCompletedToday < dailyLimit;

  res.json({
    tier: user.tier,
    lessonsToday: user.lessonsCompletedToday,
    dailyLimit: user.tier === 'pro' ? 'unlimited' : 5,
    canTakeLesson,
  });
}

module.exports = { createUser, getUser, getUserLimits, resetDailyIfNeeded };
