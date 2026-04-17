---
name: dedup-hunter
description: Before writing new code, scan for existing functions, classes, or DB columns that already do the same thing. Prevents reinventing the wheel. Fires automatically before Write/Edit tool calls and on-demand via /dedup-hunter.
---

# Dedup Hunter

Prevent duplication before it happens. Scan for existing implementations before writing new ones.

## When invoked by user (/dedup-hunter <description>)

Given a description of what is about to be written, search for:

1. **Existing functions**: `grep -r "def <keyword>" app/ scripts/` for Python; `grep -r "function <keyword>\|const <keyword>"` for TypeScript
2. **Existing utilities**: Check `app/utils/`, `scripts/utils/`, `scripts/tools/`
3. **Existing DB columns**: Read `artifacts/schema-index.md` — does a column with this name or purpose already exist?
4. **Similar patterns**: Read `artifacts/provenance-map.md` — does a script already do this transformation?

Report findings with file:line references. The user decides whether to reuse or proceed.

## When auto-triggered (PreToolUse before Write/Edit)

Scan the function/class name about to be created. If a similar name exists:

```
⚠️ DEDUP CHECK: `normalize_headword` already exists at `app/utils/normalize.py:34`
   Reuse existing? Or proceed with new implementation?
```

Only flag high-confidence matches (same or very similar name). Don't flag false positives.

## DB column dedup check

Before adding a new column to a migration, check `artifacts/schema-index.md`:

- Does a column with this name already exist on this table?
- Does a column with a different name serve the same purpose?

## Output format

```
🔍 DEDUP CHECK for: "function to normalize Korean headwords"

Existing matches:
  app/utils/normalize.py:34   def normalize_headword(text: str) -> str
  scripts/headwords/headword_utils.py:12   def canonicalize_headword(h) -> str

DB column check:
  Table unified_entries already has column `headword` (TEXT NOT NULL)
  No existing `normalized_headword` column found.

Recommendation: Reuse app/utils/normalize.py:normalize_headword
```
