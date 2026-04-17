# AIRA Backend — Express API for AIRA learning app

AI-powered learning platform teaching AI tools, prompt engineering, and modern digital skills. Duolingo-style gamified learning with XP, levels, streaks, and adaptive difficulty.

## Quick Start

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000` (override with `PORT`).

## Deploy

Deploys to [Render](https://render.com) via the included `render.yaml`. Required env vars:

- `LEMON_SQUEEZY_CHECKOUT_URL` — Buy URL from Lemon Squeezy product Share tab
- `LEMON_SQUEEZY_WEBHOOK_SECRET` — signing secret from Settings → Webhooks
- `ADMIN_KEY` — secret for manual-upgrade recovery endpoint

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: 'ok', timestamp }` |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` → JWT |
| POST | `/api/auth/login` | `{ email, password }` → JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/create` | Create new user `{ name, email? }` |
| GET | `/api/users/:userId` | Get user profile |
| GET | `/api/users/:userId/limits` | Check daily lesson limits |

### Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lessons/generate` | Get a lesson `{ userId, topic? }` |
| POST | `/api/lessons/check-answer` | Check answer |
| GET | `/api/lessons/curriculum/:userId` | Curriculum for user |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/progress/save` | Save lesson results |
| GET | `/api/progress/:userId` | Get user progress stats |

### Payments (Lemon Squeezy)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/checkout` | `{ userId }` → Lemon Squeezy checkout URL |
| POST | `/api/payments/webhook` | Lemon Squeezy webhook (HMAC verified) |
| POST | `/api/payments/manual-upgrade` | Admin recovery |

## Tech Stack
- Node.js 18+ / Express
- File-based JSON storage (`data/users.json`, `data/progress.json`)
- OpenAI for lesson generation
- HMAC-SHA256 webhook verification

## License
ISC
