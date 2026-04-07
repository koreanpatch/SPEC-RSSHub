---
name: ecosystem-status
description: Health dashboard across all three repos: dictionary, sunbi, and bibim_parser. Shows artifact freshness, violation counts, contract drift status, and sidecar health. Run at the start of cross-repo work.
---

# Ecosystem Status

Produce a unified health snapshot across dictionary + sunbi + bibim_parser.

## Artifact paths (relative to src/)

```
dictionary/artifacts/schema-index.md       — schema freshness
dictionary/artifacts/glossary-index.md     — violation count
dictionary/artifacts/provenance-map.md     — pipeline freshness
dictionary/artifacts/janitor-report-*.md   — latest janitor report
artifacts/contract-drift.md                — cross-repo drift (src/artifacts/)
```

When reading artifact files, check their modification timestamps to assess freshness.
Run `stat <file>` or `ls -la <file>` to get mtime if the file doesn't embed a timestamp.

## When invoked (/ecosystem-status)

Check each artifact and produce a dashboard:

```
## Ecosystem Status — YYYY-MM-DD HH:MM

### dictionary
  schema-index.md     ✓ fresh (2h ago) — 47 tables
  glossary-index.md   ✓ fresh (1d ago) — 312 terms, 0 violations
  provenance-map.md   ⚠ stale (4d ago) — run /data-forensics
  Latest janitor:     2026-03-24 — 3 candidates pending

### Contract Drift (src/artifacts/contract-drift.md)
  Last checked: 2026-03-25
  Open issues:  0 BREAKING, 1 cosmetic

### sunbi
  Run /sunbi-contract-check from sunbi/ for full validation
  Quick: check artifacts/contract-drift.md for open issues

### bibim sidecar
  Run /bibim-contract-check from bibim_parser/ for full validation
  Quick: curl -s http://localhost:8001/health (manual — not auto-polled)

### Overall
  🟢 All critical artifacts fresh
  ⚠️  1 stale artifact (provenance-map)
```

## Staleness thresholds

| Artifact          | Stale after |
| ----------------- | ----------- |
| schema-index.md   | 24h         |
| glossary-index.md | 24h         |
| provenance-map.md | 48h         |
| contract-drift.md | 7d          |

## Remediation guide

| Stale artifact    | Command                 | Repo        |
| ----------------- | ----------------------- | ----------- |
| schema-index.md   | `/schema-master`        | dictionary/ |
| glossary-index.md | `/glossary-master`      | dictionary/ |
| provenance-map.md | `/data-forensics`       | dictionary/ |
| contract-drift.md | `/ecosystem-sync-check` | src/        |
