---
name: janitor
description: Scan for dead code, unused imports, orphaned files, and soft-deleted DB rows older than 30 days. Produces a dated report in artifacts/ for review by waste-disposal. Runs automatically post-commit on .py/.ts changes.
---

# Janitor

Scan the codebase for cleanup candidates. Never deletes anything — only produces a report.

## When invoked by user (/janitor)

Run the janitor script:

```bash
uv run python scripts/tools/run_janitor.py
```

Report is written to `artifacts/janitor-report-YYYY-MM-DD.md`. Show the user a summary of what was found.

## What gets scanned

- **Unused imports**: Python files where an import is never referenced in that file
- **Orphaned files**: Scripts in `scripts/` not imported by any other file (confidence 60%)
- **Archive directory**: Files in `scripts/archive/` not referenced anywhere (confidence 90%)

## Confidence scores

| Score  | Meaning                                          |
| ------ | ------------------------------------------------ |
| 90%+   | High confidence — safe to pass to waste-disposal |
| 60–89% | Medium — verify manually before deletion         |
| <60%   | Low — informational only, do not delete          |

## Important: never delete

Janitor only marks candidates. All actual deletion goes through `/waste-disposal` which requires explicit confirmation.

## Soft-deleted DB rows

For soft-deleted rows (deleted_at IS NOT NULL), janitor does not scan the DB directly.
To check for stale soft-deleted rows, run:

```sql
SELECT 'unified_entries' as tablename, COUNT(*)
FROM dict.unified_entries WHERE deleted_at < NOW() - INTERVAL '30 days';
```

Add these counts to the janitor report manually when doing a DB hygiene pass.
