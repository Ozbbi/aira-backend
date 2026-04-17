const { readUsers, writeUsers, readLessons } = require('../utils/storage');
const { pickDifficulty } = require('../utils/difficultyEngine');
const { resetDailyIfNeeded } = require('./userController');

async function generateLesson(req, res) {
  const { userId, topic } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  resetDailyIfNeeded(user);

  // Check daily limit for free users
  const dailyLimit = user.tier === 'pro' ? Infinity : 5;
  if (user.lessonsCompletedToday >= dailyLimit) {
    return res.status(402).json({
      error: 'daily_limit_reached',
      message: 'Upgrade to Pro for unlimited lessons',
      upgradeUrl: '/pro',
    });
  }

  const lessons = await readLessons();
  const { minDifficulty, maxDifficulty } = pickDifficulty(user);

  // Filter lessons by difficulty range and optional topic
  let candidates = lessons.filter(
    (l) => l.difficulty >= minDifficulty && l.difficulty <= maxDifficulty
  );

  if (topic) {
    const topicLower = topic.toLowerCase();
    const topicFiltered = candidates.filter((l) =>
      l.topic.toLowerCase().includes(topicLower)
    );
    if (topicFiltered.length > 0) {
      candidates = topicFiltered;
    }
  }

  if (candidates.length === 0) {
    candidates = lessons;
  }

  // Pick random lesson
  const lesson = candidates[Math.floor(Math.random() * candidates.length)];
  res.json({
    ...lesson,
    airaIntro: lesson.airaIntro || null,
    airaOutro: lesson.airaOutro || null,
    realWorldScenario: lesson.realWorldScenario || null,
  });
}

async function checkAnswer(req, res) {
  const { userId, lessonId, questionId, userAnswer } = req.body;
  if (!userId || !lessonId || !questionId || userAnswer === undefined) {
    return res.status(400).json({ error: 'userId, lessonId, questionId, and userAnswer are required' });
  }

  const lessons = await readLessons();
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const question = lesson.questions.find((q) => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  let correct = false;

  if (question.type === 'multiple_choice') {
    correct = userAnswer === question.correctAnswer;
  } else if (question.type === 'true_false') {
    correct = userAnswer === question.correctAnswer;
  } else if (question.type === 'fill_blank') {
    correct =
      String(userAnswer).trim().toLowerCase() ===
      String(question.correctAnswer).trim().toLowerCase();
  } else if (question.type === 'prompt_write') {
    const answer = String(userAnswer).toLowerCase();
    correct = question.correctAnswer.every((kw) =>
      answer.includes(kw.toLowerCase())
    );
  }

  const xpEarned = correct ? 10 : 0;

  const airaFeedback = question.airaFeedback
    ? correct
      ? question.airaFeedback.correct
      : question.airaFeedback.incorrect
    : null;

  res.json({
    correct,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    xpEarned,
    airaFeedback,
  });
}

async function getCurriculum(req, res) {
  const { userId } = req.params;
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  resetDailyIfNeeded(user);

  const lessons = await readLessons();
  const completed = new Set(user.completedLessonIds);

  // Group by topic, preserving lesson order from the data file
  const topicsMap = new Map();
  for (const lesson of lessons) {
    if (!topicsMap.has(lesson.topic)) {
      topicsMap.set(lesson.topic, []);
    }
    topicsMap.get(lesson.topic).push(lesson);
  }

  // Build curriculum: a lesson is unlocked iff it's the first in its topic
  // OR the previous lesson in the same topic is completed.
  const topics = [];
  for (const [topicName, topicLessons] of topicsMap.entries()) {
    const items = topicLessons.map((lesson, idx) => {
      const isCompleted = completed.has(lesson.id);
      const prevCompleted = idx === 0 || completed.has(topicLessons[idx - 1].id);
      let status;
      if (isCompleted) status = 'completed';
      else if (prevCompleted) status = 'unlocked';
      else status = 'locked';
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || null,
        difficulty: lesson.difficulty,
        questionCount: lesson.questions.length,
        status,
      };
    });
    const completedCount = items.filter((i) => i.status === 'completed').length;
    topics.push({
      name: topicName,
      lessons: items,
      completedCount,
      totalCount: items.length,
    });
  }

  res.json({ topics });
}

async function getLessonById(req, res) {
  const lessons = await readLessons();
  const lesson = lessons.find((l) => l.id === req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Enforce daily limit when a userId is provided. We allow already-completed
  // lessons to be replayed even at the limit (replays don't count toward daily).
  const userId = req.query.userId;
  if (userId) {
    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      resetDailyIfNeeded(user);
      const dailyLimit = user.tier === 'pro' ? Infinity : 5;
      const alreadyCompleted = user.completedLessonIds.includes(lesson.id);
      if (!alreadyCompleted && user.lessonsCompletedToday >= dailyLimit) {
        return res.status(402).json({
          error: 'daily_limit_reached',
          message: 'Upgrade to Pro for unlimited lessons',
          upgradeUrl: '/pro',
        });
      }
    }
  }

  res.json({
    ...lesson,
    airaIntro: lesson.airaIntro || null,
    airaOutro: lesson.airaOutro || null,
    realWorldScenario: lesson.realWorldScenario || null,
  });
}

module.exports = { generateLesson, checkAnswer, getCurriculum, getLessonById };
