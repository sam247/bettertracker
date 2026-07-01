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
| `CRON_BATCH_SIZE` | Keywords per **cron** run only (default: 20). Manual checks run all due keywords in one request. |
| `GADS_MCP_API_URL` | Base URL of `br-gads-api` (mcp-hub) — no trailing slash |
| `GADS_MCP_API_SECRET` | Shared secret matching `BR_GADS_API_SECRET` on the API server |
| `GADS_DEFAULT_CUSTOMER_ID` | Default Google Ads customer ID (e.g. `6388433929`) |
| `GADS_METRICS_CRON_BATCH_SIZE` | Keywords refreshed per volume cron run (default: 200) |
| `GADS_METRICS_STALE_DAYS` | Days before cached volume is refreshed (default: 60) |

Google Ads credentials live **only** on the `br-gads-api` server (mcp-hub). BetterTracker never calls Google directly.

### Search volume caching

- `searchVolume` and `searchVolumeUpdatedAt` are cached Keyword Planner metadata.
- Refreshed when volume is missing or older than **60 days** (configurable via `GADS_METRICS_STALE_DAYS`).
- Monthly cron on the 1st at 03:00 UTC processes stale keywords in batches (`/api/cron/refresh-volumes`).
- Ranking checks (Serprobot) are completely separate.

### Ranking check schedule

Each keyword’s **Freq** setting (daily / weekly / monthly) controls when it becomes due. The cron is only a daily poller — it runs keywords whose `nextCheckAt` has passed, scheduled at **00:01 UK time** after each check.

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
4. Deploy — `vercel.json` configures a daily ranking cron at 00:01 UTC and a monthly volume cron on the 1st.
5. Run `npm run db:push` against production `DATABASE_URL` once to create tables.

## Usage

1. **Create a project** — set name, target domain, Google region, and device.
2. **Add keywords** — bulk paste one keyword per line, assign a group and check frequency.
3. **Monitor rankings** — position, movement, best, ranking URL, and cached search volume.
4. **Search volume** — cached from Google Ads via `br-gads-api`; refreshes when missing or older than 60 days. Use **Refresh stale volumes** for a manual server-side refresh.
5. **Manual check** — click "Check" on any row to run an immediate Serprobot check (1 credit).
6. **Automated checks** — daily cron picks up due rankings (per keyword frequency); monthly cron for stale search volumes.

## API credits

The header shows remaining Serprobot credits, usage today, and estimated monthly usage. Only `rank_check` calls consume credits (1 per check).
