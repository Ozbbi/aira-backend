const express = require('express');
const router = express.Router();
const { saveProgress, getProgress } = require('../controllers/progressController');

router.post('/save', saveProgress);
router.get('/:userId', getProgress);

module.exports = router;
