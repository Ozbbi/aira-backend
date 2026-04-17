require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const userRoutes = require('./routes/users');
const lessonRoutes = require('./routes/lessons');
const progressRoutes = require('./routes/progress');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Production CORS: allow localhost (any port) for dev, our Vercel deploys,
// and any *.vercel.app preview. Reflects origin for now — we'll tighten
// after the custom domain is live.
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/aira-website-ten\.vercel\.app$/,
  /^https:\/\/aira-app\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
];
app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser clients (curl, mobile native, server-to-server) send no
      // Origin header — allow those through.
      if (!origin) return cb(null, true);
      const ok = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
      return cb(null, ok ? origin : false);
    },
    credentials: true,
  })
);
app.use(morgan('dev'));

// Lemon Squeezy webhook needs the RAW body to verify HMAC, so its raw
// parser MUST run before express.json(). Mount the webhook path explicitly
// first, then json(), then everything else (including the rest of payments).
const {
  handleWebhook: paymentWebhook,
} = require('./controllers/paymentController');
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentWebhook
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'AIRA API is running', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AIRA backend running on port ${PORT}`);
});
