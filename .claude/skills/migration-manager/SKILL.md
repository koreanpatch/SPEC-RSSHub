---
name: migration-manager
description: Orchestrate Supabase migrations end-to-end: validate SQL against schema-index, generate timestamped filenames, run supabase db push, confirm row counts. Invoke for any schema change.
disable-model-invocation: true
---

# Migration Manager

Orchestrate the full Supabase migration workflow safely.

## Pre-flight checks

1. **Schema index freshness**: Check `artifacts/schema-index.md` is < 24h old.
    - If stale: `uv run python scripts/tools/generate_schema_index.py` first.
2. **Glossary check**: If adding new column names, confirm they're canonical via `/glossary-master`.

## Migration file naming

Always use: `YYYYMMDDHHMMSS_<snake_case_description>.sql`

Example: `20260326143000_add_etymology_source_column.sql`

Generate timestamp: `date +%Y%m%d%H%M%S`

Files live in: `supabase/migrations/`

## Pre-apply SQL validation

Before running `supabase db push`, check the migration SQL for:

- [ ] No `DROP TABLE` without explicit user confirmation
- [ ] No column renames without a corresponding update to `app/models.py`
- [ ] FKs reference tables that exist in `artifacts/schema-index.md`
- [ ] New column names are not in the banned synonyms list (`artifacts/glossary-index.md`)
- [ ] ID columns are `TEXT NOT NULL` with 8-char base62 values (not `SERIAL` or `UUID`)

## Apply migration

```bash
supabase db push
```

## Post-apply verification

After pushing, confirm the change landed:

```bash
# Check row counts unchanged for data tables (unless migration inserts data)
# Check new column appears in a test query
```

Regenerate schema-index immediately after:

```bash
uv run python scripts/tools/generate_schema_index.py
git add artifacts/schema-index.md
git commit -m "chore: refresh schema-index after migration"
```

## Rollback

If migration fails, note the error. Do NOT attempt to manually undo SQL in production.
Document the failed migration in `artifacts/migration-log.md` with the error and next steps.
