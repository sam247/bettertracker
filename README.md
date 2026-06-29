# BetterTracker

Internal SEO keyword tracker. Single-user tool for monitoring keyword rankings via the Serprobot API.

## Stack

- Next.js 15 (App Router)
- Vercel Postgres (Neon) + Drizzle ORM
- Serprobot API for rank checks
- Vercel Cron for scheduled checks

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`, or pull from Vercel:

```bash
vercel env pull .env.local
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Set automatically by Vercel Postgres |
| `POSTGRES_URL_NON_POOLING` | Use for `db:push` (direct connection) |
| `DATABASE_URL` | Optional override — app also reads `POSTGRES_URL` |
| `AUTH_SECRET` | Random string, min 32 characters |
| `AUTH_PASSWORD` | Your login password |
| `CRON_SECRET` | Random string for cron auth |
| `SERPROBOT_API_KEY` | From Serprobot account settings |
| `CRON_BATCH_SIZE` | Keywords per cron run (default: 20) |

### 3. Database

Push the schema to your database (use the **real** URL from Vercel, not a placeholder):

```bash
# Option A: pull env from Vercel, then push
vercel env pull .env.local
npm run db:push

# Option B: one-off with the non-pooling URL from Vercel dashboard
POSTGRES_URL_NON_POOLING="postgres://..." npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Sign in with `sampettiford@googlemail.com` and your `AUTH_PASSWORD`.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the **Vercel Postgres** integration (sets `DATABASE_URL`).
3. Add all other env vars from `.env.example`.
4. Deploy — `vercel.json` configures an hourly cron at `/api/cron/run-checks` (runs at :01 past each hour UTC, aligned with 00:01 UK checks).
5. Run `npm run db:push` against production `DATABASE_URL` once to create tables.

## Usage

1. **Create a project** — set name, target domain, Google region, and device.
2. **Add keywords** — bulk paste one keyword per line, assign a group and check frequency.
3. **Monitor rankings** — the table shows position, change, best position, and ranking URL.
4. **Manual check** — click "Check" on any row to run an immediate Serprobot check (1 credit).
5. **Automated checks** — the hourly cron processes due keywords at 00:01 UK time (daily/weekly/monthly), oldest first, with retries for recent failures.

## API credits

The header shows remaining Serprobot credits, usage today, and estimated monthly usage. Only `rank_check` calls consume credits (1 per check).
