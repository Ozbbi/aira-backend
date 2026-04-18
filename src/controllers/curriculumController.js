const { readUsers, readLessons } = require('../utils/storage');

/**
 * Track metadata — static. The lessons.json file drives which lessons
 * belong in each track via their `trackId` field; this map gives us the
 * display-facing info (name, color, description, demo/pro gating).
 *
 * Design: 6 tracks. Only "foundations" is demo. Everything else is Pro.
 */
const TRACKS = [
  {
    id: 'foundations',
    title: 'AI Foundations',
    subtitle: 'Talk to AI like a smart friend',
    icon: '🧠',
    color: 'purple',
    description:
      'Learn the five ideas that change everything about how you work with AI. Five short lessons, free forever.',
    tier: 'demo',
    order: 1,
  },
  {
    id: 'critical',
    title: 'Critical Thinking',
    subtitle: "When NOT to trust AI",
    icon: '🔎',
    color: 'pink',
    description:
      "The track no other AI app teaches. Spot hallucinations, catch bias, verify like a journalist. This is where AI users become AI-safe.",
    tier: 'pro',
    order: 2,
  },
  {
    id: 'power',
    title: 'Power User',
    subtitle: 'The techniques pros use daily',
    icon: '⚡',
    color: 'indigo',
    description:
      'Chain of thought, role prompting, few-shot examples, follow-ups. The moves that separate casual users from power users.',
    tier: 'pro',
    order: 3,
  },
  {
    id: 'tools',
    title: 'Tools & Taste',
    subtitle: 'The right AI for the right job',
    icon: '🧰',
    color: 'cyan',
    description:
      'ChatGPT vs Claude vs Gemini, Perplexity for facts, Cursor for code, Midjourney for images. Know what to reach for.',
    tier: 'pro',
    order: 4,
  },
  {
    id: 'creators',
    title: 'AI for Creators',
    subtitle: 'Build, write, research, ship',
    icon: '🎨',
    color: 'amber',
    description:
      'Your personal prompt library, writing with AI without sounding like AI, the 10x research workflow, weekend projects that ship.',
    tier: 'pro',
    order: 5,
  },
  {
    id: 'master',
    title: 'The AI Master',
    subtitle: 'Meta-level craft',
    icon: '👑',
    color: 'gold',
    description:
      'Meta-prompting, agent chains, evaluation, ethics, and the mindset that makes you the person teams turn to when they need AI done well.',
    tier: 'pro',
    order: 6,
  },
];

function groupLessonsByTrack(lessons) {
  const byTrack = new Map();
  for (const lesson of lessons) {
    const trackId = lesson.trackId || 'foundations'; // fallback for legacy data
    if (!byTrack.has(trackId)) byTrack.set(trackId, []);
    byTrack.get(trackId).push(lesson);
  }
  // Sort each track's lessons by explicit `order` if present.
  for (const arr of byTrack.values()) {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return byTrack;
}

function summarizeLesson(lesson, completed, prevCompletedOrFirst) {
  const isCompleted = completed.has(lesson.id);
  let status;
  if (isCompleted) status = 'completed';
  else if (prevCompletedOrFirst) status = 'unlocked';
  else status = 'locked';
  return {
    id: lesson.id,
    trackId: lesson.trackId,
    order: lesson.order,
    title: lesson.title,
    subtitle: lesson.subtitle || null,
    description: lesson.description || null,
    difficulty: lesson.difficulty,
    xpReward: lesson.xpReward || 50,
    estimatedMinutes: lesson.estimatedMinutes || 5,
    tier: lesson.tier || 'demo',
    questionCount: lesson.questions ? lesson.questions.length : 0,
    status,
  };
}

/**
 * GET /api/curriculum           — anonymous, no progress
 * GET /api/curriculum?userId=x  — with per-user progress + unlock state
 */
async function getCurriculum(req, res) {
  const userId = req.query.userId;
  const lessons = await readLessons();
  const byTrack = groupLessonsByTrack(lessons);

  let user = null;
  if (userId) {
    const users = await readUsers();
    user = users.find((u) => u.id === userId) || null;
  }
  const completed = new Set(user?.completedLessonIds || []);
  const userTier = user?.tier || 'demo';

  const tracks = TRACKS.map((track) => {
    const trackLessons = byTrack.get(track.id) || [];
    const items = trackLessons.map((lesson, idx) => {
      const prevOrFirst =
        idx === 0 || completed.has(trackLessons[idx - 1].id);
      return summarizeLesson(lesson, completed, prevOrFirst);
    });
    const completedCount = items.filter((i) => i.status === 'completed').length;
    const locked = track.tier === 'pro' && userTier !== 'pro';
    return {
      ...track,
      locked,
      completedCount,
      totalCount: items.length,
      lessons: items,
    };
  });

  res.json({ tracks });
}

/**
 * GET /api/tracks/:trackId/lessons
 * Returns the lesson list for one track (summary shape, same as /curriculum).
 */
async function getTrackLessons(req, res) {
  const { trackId } = req.params;
  const track = TRACKS.find((t) => t.id === trackId);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const userId = req.query.userId;
  const lessons = await readLessons();
  const byTrack = groupLessonsByTrack(lessons);
  const trackLessons = byTrack.get(track.id) || [];

  let user = null;
  if (userId) {
    const users = await readUsers();
    user = users.find((u) => u.id === userId) || null;
  }
  const completed = new Set(user?.completedLessonIds || []);

  const items = trackLessons.map((lesson, idx) => {
    const prevOrFirst = idx === 0 || completed.has(trackLessons[idx - 1].id);
    return summarizeLesson(lesson, completed, prevOrFirst);
  });

  res.json({
    track: {
      id: track.id,
      title: track.title,
      subtitle: track.subtitle,
      icon: track.icon,
      color: track.color,
      description: track.description,
      tier: track.tier,
    },
    lessons: items,
  });
}

module.exports = { getCurriculum, getTrackLessons, TRACKS };
