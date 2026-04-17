---
name: waste-disposal
description: Execute permanent deletion of candidates from janitor reports. Two-step: preview then confirm. Always writes a before/after papertrail to artifacts/waste-disposal-log.md. Never runs automatically.
disable-model-invocation: true
---

# Waste Disposal

Permanently delete cleanup candidates from janitor reports. This skill is **always manual** — it never runs from hooks or automatic dispatch.

## Workflow

### Step 1: Preview

List all available janitor reports:

```bash
ls -t artifacts/janitor-report-*.md
```

Read the most recent (or user-specified) report. Group candidates by type and confidence:

```
PREVIEW — artifacts/janitor-report-2026-03-26.md
─────────────────────────────────────────────────
Unused imports (high confidence ≥90%):  12 items
Orphaned files (medium confidence):      3 items
─────────────────────────────────────────────────
Proceed with deletion? Confirm per group.
```

### Step 2: Per-group confirmation

Ask the user to confirm EACH group separately before touching anything:

- "Delete 12 unused imports from these files? (yes/no)"
- "Delete 3 orphaned scripts? (yes/no)"

Never batch-delete across groups without separate confirmation.

### Step 3: Execute and log

For each confirmed group:

1. Record what is about to be deleted in `artifacts/waste-disposal-log.md`:
    ```
    ## 2026-03-26 14:32 — Unused imports (12 items)
    Source report: artifacts/janitor-report-2026-03-26.md
    Files affected: [list]
    ```
2. Perform the deletion
3. Record completion with count

### Papertrail format

Every waste-disposal run appends to `artifacts/waste-disposal-log.md`:

```markdown
## YYYY-MM-DD HH:MM — <type> (<count> items)

**Source report:** `artifacts/janitor-report-YYYY-MM-DD.md`
**Confirmed by:** user

### Before

[list of items with file paths]

### After

Status: COMPLETED / PARTIAL / ABORTED
Items deleted: N
```

## Hard limits

- Never delete files in `app/` without reading the file first to confirm it's truly dead
- Never delete `__init__.py` files
- Never delete migration files in `supabase/migrations/`
- Never hard-delete DB rows — soft-delete is managed by the DB schema
- If unsure about a candidate, mark it SKIPPED in the log and leave it for manual review
