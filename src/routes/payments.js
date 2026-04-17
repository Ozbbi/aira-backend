const express = require('express');
const router = express.Router();

const {
  createCheckout,
  manualUpgrade,
} = require('../controllers/paymentController');

// Client asks us for a checkout URL with the user's id attached as custom data.
router.post('/checkout', createCheckout);

// Admin recovery — manually mark a user as Pro (protected by ADMIN_KEY).
router.post('/manual-upgrade', manualUpgrade);

// NOTE: /webhook is mounted directly in server.js with express.raw() because
// it needs the unparsed body for HMAC verification.

module.exports = router;
