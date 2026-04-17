const express = require('express');
const router = express.Router();
const { signup, login, me, mergeAnonymous } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', me);
router.post('/merge-anonymous', mergeAnonymous);

module.exports = router;
