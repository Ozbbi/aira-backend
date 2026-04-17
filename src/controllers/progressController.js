const { readUsers, writeUsers } = require('../utils/storage');
const { calculateXp, getLevelFromXp, getXpProgress } = require('../utils/xpCalculator');
const { resetDailyIfNeeded } = require('./userController');

async function saveProgress(req, res) {
  const { userId, lessonId, correctCount, totalCount } = req.body;
  if (!userId || !lessonId || correctCount === undefined || !totalCount) {
    return res.status(400).json({ error: 'userId, lessonId, correctCount, and totalCount are required' });
  }

  const users = await readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = users[userIndex];
  resetDailyIfNeeded(user);

  const xpEarned = calculateXp(correctCount, totalCount);
  const oldLevel = user.level;

  const isFirstTime = !user.completedLessonIds.includes(lessonId);

  user.xp += xpEarned;
  user.level = getLevelFromXp(user.xp);

  // First-time completions count toward totals + daily limit; replays don't
  if (isFirstTime) {
    user.totalLessonsCompleted += 1;
    user.lessonsCompletedToday += 1;
    user.completedLessonIds.push(lessonId);
  }

  // Accuracy history (keep last 10)
  const accuracy = Math.round((correctCount / totalCount) * 100);
  user.accuracyHistory.push(accuracy);
  if (user.accuracyHistory.length > 10) {
    user.accuracyHistory = user.accuracyHistory.slice(-10);
  }

  // Streak logic
  const today = new Date().toISOString().split('T')[0];
  if (user.lastActiveDate === today) {
    // no change to streak
  } else if (user.lastActiveDate === getYesterday()) {
    user.streak += 1;
  } else {
    user.streak = 1;
  }
  user.lastActiveDate = today;

  users[userIndex] = user;
  await writeUsers(users);

  res.json({
    xpEarned,
    newTotalXp: user.xp,
    oldLevel,
    newLevel: user.level,
    leveledUp: user.level > oldLevel,
    streak: user.streak,
  });
}

async function getProgress(req, res) {
  const users = await readUsers();
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  resetDailyIfNeeded(user);

  const progress = getXpProgress(user.xp);
  const avgAccuracy =
    user.accuracyHistory.length > 0
      ? Math.round(
          user.accuracyHistory.reduce((a, b) => a + b, 0) /
            user.accuracyHistory.length
        )
      : 0;

  res.json({
    xp: user.xp,
    level: user.level,
    xpForNextLevel: progress.xpNeededForNext,
    streak: user.streak,
    totalLessonsCompleted: user.totalLessonsCompleted,
    averageAccuracy: avgAccuracy,
    tier: user.tier,
  });
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

module.exports = { saveProgress, getProgress };
