const express = require('express');
const router = express.Router();
const { getCurriculum, getTrackLessons } = require('../controllers/curriculumController');

// The new tracks-based curriculum. Existing /api/lessons/curriculum/:userId
// route stays in place for backward compatibility with older mobile clients.
router.get('/curriculum', getCurriculum);
router.get('/tracks/:trackId/lessons', getTrackLessons);

module.exports = router;
