const express = require('express');
const router = express.Router();
const {
  generateLesson,
  checkAnswer,
  getCurriculum,
  getLessonById,
} = require('../controllers/lessonController');

router.post('/generate', generateLesson);
router.post('/check-answer', checkAnswer);
router.get('/curriculum/:userId', getCurriculum);
router.get('/:lessonId', getLessonById);

module.exports = router;
