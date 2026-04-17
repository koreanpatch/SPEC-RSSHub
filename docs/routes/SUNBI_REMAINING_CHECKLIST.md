# Sunbi RSSHub Remaining Work Checklist

This checklist tracks what is left in `sunbi-rsshub` beyond "just write routes".

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## 1) Repo and Local Runtime

- [ ] Confirm toolchain: Node `>=22.20`, `pnpm@10`, `corepack enable`
- [ ] Install deps: `pnpm install`
- [ ] Create `.env` with at least:
    - [ ] `ACCESS_KEY`
    - [ ] `CACHE_TYPE`
    - [ ] `REDIS_URL` (if using Redis)
- [ ] Start local instance: `pnpm dev`
- [ ] Smoke check health/feed endpoint at `http://localhost:1200`

## 2) Route Delivery Backlog

## Implemented / present

- [x] `naver/webtoon-series` custom route is present (`lib/routes/naver/webtoon-series.ts`)

## Remaining from Sunbi route plan

- [ ] `sunbi-youtube` namespace + route(s)
- [ ] `viki` namespace + route(s)
- [ ] `weverse` namespace + route(s)
- [ ] `bubble` namespace + route(s)
- [ ] `netflix` Sunbi-targeted route(s) (existing upstream namespace exists, but custom Sunbi route contract should be validated explicitly)

For each remaining route:

- [ ] Create/verify `namespace.ts`
- [ ] Add route file with valid `Route` metadata (`path`, `example`, `radar`, `features`, `maintainers`)
- [ ] Ensure data items use `_extra` (not `extra`)
- [ ] Add `pubDate` where source provides timestamps
- [ ] Ensure item `link` is unique and human-readable
- [ ] Add caching (`cache.tryGet`) for detail fetch loops

## 3) Contract and Payload Validation

- [ ] Validate JSON output with `?format=json` for every route
- [ ] Verify `_extra.type` discriminator for each platform
- [ ] Verify required `_extra` keys used by Sunbi ingestion
- [ ] Check route path and docs examples are working
- [ ] Validate no unsupported `DataItem` top-level fields were added

## 4) Quality Gates

- [ ] Build route manifest: `pnpm build:routes`
- [ ] Lint: `pnpm lint`
- [ ] Tests: `pnpm vitest` (or `pnpm test` for full checks)
- [ ] Manual curl snapshots saved for each route
- [ ] Error paths tested (missing auth, source failures, empty feed behavior)

## 5) Deployment and Ops

- [ ] Choose runtime target:
    - [ ] Node process (`pnpm start`) or
    - [ ] Docker Compose or
    - [ ] Cloudflare Worker
- [ ] Provision production env vars (`ACCESS_KEY`, secrets, cookies/tokens)
- [ ] Enable Redis cache in production
- [ ] Configure uptime/health monitoring
- [ ] Verify Sunbi client points to this running fork instance

## 6) Maintenance

- [ ] Add upstream remote if missing
- [ ] Monthly upstream sync (`git fetch upstream && git merge upstream/main`)
- [ ] Re-run route smoke tests after each sync
- [ ] Track expiring auth values (for example `WEVERSE_TOKEN`) and rotation schedule

## 7) Definition of Done

- [ ] All target routes implemented and returning valid JSON feed
- [ ] `_extra` contract stable across all Sunbi routes
- [ ] CI/local quality checks green (`build:routes`, lint, tests)
- [ ] Production instance reachable and protected by `ACCESS_KEY`
- [ ] Runbook dry-run completed end-to-end
