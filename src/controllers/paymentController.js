const crypto = require('crypto');
const { readUsers, writeUsers } = require('../utils/storage');

/**
 * Lemon Squeezy integration.
 *
 * Env vars (set in backend/.env):
 *   LEMON_SQUEEZY_CHECKOUT_URL      — Your live "Buy URL" from the Lemon Squeezy dashboard
 *                                     (Products → AIRA Pro → Share → Copy URL).
 *                                     We append ?checkout[custom][user_id]=<id> so the
 *                                     webhook knows which user to mark Pro.
 *   LEMON_SQUEEZY_WEBHOOK_SECRET    — Signing secret from Settings → Webhooks.
 *                                     Used to verify `X-Signature` on every webhook.
 *
 * Flow:
 *   1. Mobile/web client calls POST /api/payments/checkout with { userId }.
 *   2. We return { url } — the Lemon Squeezy checkout URL with custom data attached.
 *   3. User pays. Lemon Squeezy POSTs to /api/payments/webhook.
 *   4. We verify HMAC, extract custom user_id, flip that user to tier='pro'.
 */

function buildCheckoutUrl(baseUrl, userId) {
  if (!baseUrl) return null;
  // Lemon Squeezy accepts checkout[custom][key] query params which round-trip
  // onto the order as `meta.custom_data.key`. Source of truth for the mapping.
  const url = new URL(baseUrl);
  url.searchParams.set('checkout[custom][user_id]', userId);
  // Optional prefill — harmless if user changes it on the checkout page.
  url.searchParams.set('logo', '0'); // keep checkout page lean
  return url.toString();
}

async function createCheckout(req, res) {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.tier === 'pro') {
    return res.status(400).json({ error: 'User is already Pro', alreadyPro: true });
  }

  const baseUrl = process.env.LEMON_SQUEEZY_CHECKOUT_URL;
  if (!baseUrl) {
    // Dev fallback: hand back a placeholder so the UI can still be built/tested.
    // STEP 8 setup: put the real URL in backend/.env to enable real checkout.
    return res.status(503).json({
      error: 'Checkout not configured',
      hint: 'Set LEMON_SQUEEZY_CHECKOUT_URL in backend/.env',
    });
  }

  const url = buildCheckoutUrl(baseUrl, userId);
  res.json({ url });
}

/**
 * Verify Lemon Squeezy's HMAC-SHA256 signature over the raw request body.
 * We need the raw body, not the parsed JSON — see server.js wiring for the
 * `express.raw` mount on this path.
 */
function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

async function handleWebhook(req, res) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.get('X-Signature');
  const rawBody = req.body; // Buffer (raw mount) — see server.js

  if (!verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventName = payload?.meta?.event_name;
  const customData = payload?.meta?.custom_data || {};
  const userId = customData.user_id;

  // We only care about successful one-time purchases. For a subscription
  // product we'd also handle subscription_created / subscription_cancelled.
  const successEvents = new Set(['order_created', 'order_paid']);
  if (!successEvents.has(eventName)) {
    // Ack so Lemon Squeezy doesn't retry events we don't use.
    return res.status(200).json({ ignored: true, event: eventName });
  }

  if (!userId) {
    console.warn('[webhook] successful order without custom user_id', payload?.data?.id);
    return res.status(200).json({ ignored: true, reason: 'no user_id' });
  }

  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    console.warn('[webhook] user_id from custom_data not found:', userId);
    return res.status(200).json({ ignored: true, reason: 'user not found' });
  }

  user.tier = 'pro';
  user.proActivatedAt = new Date().toISOString();
  user.lemonSqueezyOrderId = payload?.data?.id || null;
  await writeUsers(users);

  console.log(`[webhook] Upgraded user ${userId} to Pro (order ${payload?.data?.id})`);
  res.status(200).json({ ok: true });
}

// Manual upgrade endpoint — for admin use / recovery if webhook fails.
// Protect with a simple admin key from env.
async function manualUpgrade(req, res) {
  const { userId, adminKey } = req.body;
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.tier = 'pro';
  user.proActivatedAt = new Date().toISOString();
  await writeUsers(users);
  res.json({ ok: true, user });
}

module.exports = { createCheckout, handleWebhook, manualUpgrade };
