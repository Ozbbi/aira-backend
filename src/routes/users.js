const express = require('express');
const router = express.Router();
const { createUser, getUser, getUserLimits } = require('../controllers/userController');

router.post('/create', createUser);
router.get('/:userId', getUser);
router.get('/:userId/limits', getUserLimits);

module.exports = router;
