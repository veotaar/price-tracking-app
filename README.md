# Price Tracking App

Track product prices across stores and countries, normalize for pack sizes, convert currencies on the fly, and visualize historical trends. All backed by TimescaleDB time-series analytics.

[Live demo for the public frontend](https://compare.ulus.uk/)

## Architecture

A Bun + Turborepo monorepo with two independent product surfaces:

| App | Stack | Port | Description |
| --- | --- | --- | --- |
| `apps/api` | Elysia | 3000 | Internal API. Auth, CRUD, job workers, Bull Board (`/api/ui`) |
| `apps/api-public` | Elysia | 3001 | Public read-only API. published products and analytics |
| `apps/web` | React + Vite | 5173 | Internal admin dashboard |
| `apps/web-public` | React + Vite | 5174 / 8080 | Public product catalog and price comparison |

```
apps/
  api/            # Auth, admin routes, scraping workers, scheduler
  api-public/     # Public product & analytics endpoints
  web/            # Internal dashboard (countries, sites, items, products)
  web-public/     # Public storefront (product listing, price charts)
packages/
  typescript-config/
```

## Domain Model

```
product → product_item → item → price
                                  ↑
            site → country    exchange_rate
```

- A **product** groups **items** (URLs) from different **sites** and **countries**.
- **price** stores scraped values in native currency. **exchange_rate** stores daily EUR-based FX rates.
- Both are TimescaleDB hypertables partitioned by time, queried with `time_bucket()` / `time_bucket_gapfill()`.
- `product_item.normalization_factor` allows fair comparison across pack sizes.
- `site.price_divisor` handles site-specific price normalization.
- Only products marked `published` appear on the public surface.

## Tech Stack

**Runtime:** Bun 1.3.10 · TypeScript · Turborepo · Biome

**Backend:** Elysia · Drizzle ORM · Better Auth (argon2id) · BullMQ + Redis · Playwright & Cheerio (scraping)

**Frontend:** React 19 · Vite · TanStack Router & Query · Tailwind CSS v4 · shadcn/ui · Recharts

**Data:** PostgreSQL + TimescaleDB · Redis (job queues + caching)

## Background Jobs

Started as side-effects on API boot via BullMQ workers:

| Job | Schedule | What it does |
| --- | --- | --- |
| Price scrape | Every 3h per item | Fetch/browser-scrape price → insert → invalidate caches |
| Exchange rates | Daily at 15:00 UTC | Fetch EUR-based FX rates → insert → invalidate caches |

Bull Board UI is available at `/api/ui` on the internal API.

## Getting Started

### Prerequisites

- **Bun** ≥ 1.3.10
- **PostgreSQL** ≥ 18 with TimescaleDB (needs `uuidv7()` support)
- **Redis**

### Setup

```bash
# Install dependencies
bun install

# Create env files from examples
cp apps/api/.env.example apps/api/.env
cp apps/api-public/.env.example apps/api-public/.env
cp .env.example .env

# Run database migrations
bunx --bun drizzle-kit migrate --config apps/api/drizzle.config.ts

# Start all apps in dev mode
bun dev
```

### Environment Variables

| Variable | Required by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Both APIs | PostgreSQL + TimescaleDB connection string |
| `REDIS_URL` | Both APIs | Defaults to `redis://localhost:6379` |
| `BETTER_AUTH_SECRET` | Internal API | Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Internal API | Trusted auth origin |
| `FRONTEND_URL` | Both APIs | CORS origin |
| `PORT` | Both APIs | `3000` (api) / `3001` (api-public) |

## Commands

```bash
bun run dev                          # Dev mode (all apps via Turbo)
bun run build                        # Production build
bun run check-types                  # TypeScript validation
bun run format-and-lint              # Biome check
bun run format-and-lint:fix          # Biome auto-fix

bun --filter @repo/api dev           # Run a single app
bun --filter @repo/api test          # Run tests
```

## Deployment

`docker-compose.yml` runs the **public** stack only (`api-public` + `web-public`). It expects `DATABASE_URL` and `REDIS_URL` as external config. Nginx proxies `/api` to the public API so both share one origin.

```bash
docker compose up --build
```
