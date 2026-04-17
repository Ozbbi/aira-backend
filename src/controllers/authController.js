const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { readUsers, writeUsers } = require('../utils/storage');

const JWT_SECRET = process.env.JWT_SECRET || 'aira_dev_secret_change_in_prod';
const JWT_EXPIRES = '90d'; // long-lived for mobile apps
const SALT_ROUNDS = 10;

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function safeUser(user) {
  // Never expose passwordHash to the client
  const { passwordHash, ...safe } = user;
  return safe;
}

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const users = await readUsers();

  // Reject duplicate email (case-insensitive)
  const emailLower = email.trim().toLowerCase();
  if (users.find((u) => u.email?.toLowerCase() === emailLower)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = {
    id: nanoid(),
    name: name.trim(),
    email: emailLower,
    passwordHash,
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

  const token = signToken(user.id);
  res.status(201).json({ token, user: safeUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const users = await readUsers();
  const emailLower = email.trim().toLowerCase();
  const user = users.find((u) => u.email?.toLowerCase() === emailLower);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user.id);
  res.json({ token, user: safeUser(user) });
}

async function me(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const users = await readUsers();
  const user = users.find((u) => u.id === payload.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: safeUser(user) });
}

// Merge an anonymous (offline_xxx) user's progress into a real account after signup/login.
// Called optionally when user had offline data they want to keep.
async function mergeAnonymous(req, res) {
  const { token, anonymousUserId } = req.body;
  if (!token || !anonymousUserId) {
    return res.status(400).json({ error: 'token and anonymousUserId required' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!anonymousUserId.startsWith('offline_')) {
    return res.status(400).json({ error: 'anonymousUserId must be an offline_ id' });
  }

  // offline_ ids are client-only — no backend record to merge. Just acknowledge.
  // If we ever persist offline users, this is where the merge logic lives.
  res.json({ merged: false, reason: 'offline-only account — no server data to merge' });
}

module.exports = { signup, login, me, mergeAnonymous };
