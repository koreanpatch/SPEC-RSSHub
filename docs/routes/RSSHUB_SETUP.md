# RSSHub Self-Hosted Setup

← [INDEX](INDEX.md) | See also: [ARCH.md](ARCH.md)

## Repo

`spec-rsshub` — your fork of `DIYgod/RSSHub`
Custom routes live in `lib/v2/` subdirectories.

## Why a Fork (not vanilla Docker)

RSSHub's Docker image bakes routes at build time — volume-mounting custom
routes does not work. A fork lets you add routes to `lib/v2/` and build
your own image. Upstream updates are pulled via `git merge upstream/main`.

## Initial Setup

```bash
# 1. Fork on GitHub: DIYgod/RSSHub → your-org/spec-rsshub
# 2. Clone locally
git clone https://github.com/your-org/spec-rsshub.git
cd spec-rsshub

# 3. Add upstream remote for future updates
git remote add upstream https://github.com/DIYgod/RSSHub.git

# 4. Install dependencies (RSSHub uses pnpm)
corepack enable
pnpm install

# 5. Start dev server (hot reload)
pnpm dev
# Routes available at http://localhost:1200
```

## Directory Structure for Custom Routes

```
lib/v2/
├── naver/
│   ├── namespace.ts            ← already exists upstream; extend it
│   ├── webtoon-series.ts       ← NEW: see ROUTE_NAVER_WEBTOON.md
│   └── ...
├── sunbi-youtube/              ← NEW namespace (avoids upstream conflict)
│   ├── namespace.ts
│   └── channel-full.ts         ← see ROUTE_YOUTUBE.md
├── viki/                       ← NEW
│   ├── namespace.ts
│   └── drama-series.ts         ← see ROUTE_VIKI.md
├── netflix/                    ← NEW
│   ├── namespace.ts
│   └── drama-series.ts         ← see ROUTE_NETFLIX.md
├── weverse/                    ← NEW
│   ├── namespace.ts
│   └── artist-feed.ts          ← see ROUTE_WEVERSE.md
└── bubble/                     ← NEW
    ├── namespace.ts
    └── artist-notify.ts        ← see ROUTE_BUBBLE.md
```

## Environment Variables

Create `.env` in the repo root (gitignored):

```bash
# Required
NODE_ENV=production
CACHE_TYPE=redis
REDIS_URL=redis://redis:6379/

# Access control — all Sunbi requests must include ?key=VALUE
ACCESS_KEY=<generate with: openssl rand -hex 32>

# Optional: platform auth
WEVERSE_TOKEN=<bearer token from browser devtools>
  # How to get: Open weverse.io → DevTools → Network → any /api/ request
  # → Headers → Authorization → copy the Bearer token
  # Expires: ~30 days, must be refreshed manually

NETFLIX_COOKIE=<optional; full episode data>
  # How to get: netflix.com → DevTools → Application → Cookies
  # → copy the full Cookie header string
  # Needed for: Falcor cache with episode-level data

NAVER_COOKIE=<optional; cafe/paywalled webtoon content>
  # How to get: comic.naver.com → DevTools → Application → Cookies
```

## Docker Compose (production)

`docker-compose.yml` in repo root:

```yaml
version: '3.8'

services:
    rsshub:
        build:
            context: .
            dockerfile: Dockerfile
        image: sunbi/rsshub:latest
        restart: unless-stopped
        ports:
            - '1200:1200'
        environment:
            NODE_ENV: production
            CACHE_TYPE: redis
            REDIS_URL: redis://redis:6379/
            CACHE_EXPIRE: 600
            CACHE_CONTENT_EXPIRE: 3600
            ACCESS_KEY: '${ACCESS_KEY}'
            WEVERSE_TOKEN: '${WEVERSE_TOKEN:-}'
            NETFLIX_COOKIE: '${NETFLIX_COOKIE:-}'
            NAVER_COOKIE: '${NAVER_COOKIE:-}'
            # Limit concurrent requests to avoid anti-bot triggers
            REQUEST_TIMEOUT: '20000'
            REQUEST_RETRY: '2'
        depends_on:
            redis:
                condition: service_healthy
        networks:
            - sunbi-internal
        healthcheck:
            test: ['CMD', 'curl', '-f', 'http://localhost:1200/healthz']
            interval: 30s
            timeout: 10s
            retries: 3

    redis:
        image: redis:7-alpine
        restart: unless-stopped
        command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
        volumes:
            - rsshub_redis:/data
        networks:
            - sunbi-internal
        healthcheck:
            test: ['CMD', 'redis-cli', 'ping']
            interval: 10s
            timeout: 5s
            retries: 3

networks:
    sunbi-internal:
        name: sunbi-internal

volumes:
    rsshub_redis:
```

## Build and Deploy Commands

```bash
# Development
pnpm dev                        # hot reload at localhost:1200

# Test a specific route
curl "http://localhost:1200/naver/webtoon/series/758037?format=json"
curl "http://localhost:1200/sunbi-youtube/channel/UCVSjwV8LXSoqxDKRcNGPrQg?format=json"

# Production build + run
docker compose build
docker compose up -d
docker compose logs -f rsshub

# Update from upstream (monthly)
git fetch upstream
git merge upstream/main
# resolve conflicts in lib/v2/ (your custom namespaces won't conflict)
docker compose build
docker compose up -d
```

## TTL Reference by Route

| Route                                   | Cache TTL             | Why                       |
| --------------------------------------- | --------------------- | ------------------------- |
| `naver/webtoon/series/*`                | 15 min (series list)  | New episodes weekly       |
| `naver/webtoon/series/*` individual eps | 24 h                  | Immutable once live       |
| `sunbi-youtube/channel/*`               | 15 min                | Videos can drop any time  |
| `viki/series/*`                         | 30 min (episode list) | Dramas air 1-2x/week      |
| `netflix/drama/*`                       | 60 min                | Episodes drop weekly      |
| `weverse/artist/*`                      | 5 min                 | Posts/lives are real-time |
| `bubble/artist/*`                       | 10 min                | Message notifications     |

## Verifying the `_extra` field

JSON Feed output (`?format=json`) uses the key **`_extra`** on each item (see `lib/views/json.ts`). Confirm it is present:

```bash
curl "http://localhost:1200/naver/webtoon/series/758037?format=json" | \
  jq '.items[0]._extra'
```

Expected for Naver Webtoon:

```json
{
    "type": "webtoon_episode",
    "platform": "naver",
    "titleId": "758037",
    "episodeNo": "200",
    "thumbnail": "https://...",
    "seriesTitle": "...",
    "isFree": true,
    "sourceLocale": "ko",
    "ocrPending": true
}
```

The ingestion Edge Function reads this object to populate `feed.items` columns.
See [INGESTION.md](INGESTION.md) for the full mapping.
