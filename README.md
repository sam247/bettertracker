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

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon/Vercel Postgres connection string |
| `AUTH_SECRET` | Random string, min 32 characters |
| `AUTH_PASSWORD` | Your login password |
| `CRON_SECRET` | Random string for cron auth |
| `SERPROBOT_API_KEY` | From Serprobot account settings |
| `CRON_BATCH_SIZE` | Keywords per cron run (default: 20) |

### 3. Database

Push the schema to your database:

```bash
npm run db:push
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
4. Deploy — `vercel.json` configures an hourly cron at `/api/cron/run-checks`.
5. Run `npm run db:push` against production `DATABASE_URL` once to create tables.

## Usage

1. **Create a project** — set name, target domain, Google region, and device.
2. **Add keywords** — bulk paste one keyword per line, assign a group and check frequency.
3. **Monitor rankings** — the table shows position, change, best position, and ranking URL.
4. **Manual check** — click "Check" on any row to run an immediate Serprobot check (1 credit).
5. **Automated checks** — the hourly cron processes due keywords (oldest first), retries recent failures.

## API credits

The header shows remaining Serprobot credits, usage today, and estimated monthly usage. Only `rank_check` calls consume credits (1 per check).
