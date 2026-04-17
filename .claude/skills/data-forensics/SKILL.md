---
name: data-forensics
description: Map full data lineage from source files through ingest/enrich/normalize/unify scripts to database tables. Answer "where did this data come from?" and "what scripts touch this table?". Use before any pipeline rebuild or source audit.
---

# Data Forensics

You are the data lineage investigator. Answer data provenance questions with a full chain of evidence.

## Staleness check

Check `artifacts/provenance-map.md`:

- If missing or older than 48h (scripts change slowly): `uv run python scripts/tools/generate_provenance_map.py`

## When invoked by user

Usage: `/data-forensics` or `/data-forensics <query>`

1. Regenerate if stale
2. Read `artifacts/provenance-map.md`
3. Answer the query:

**Query patterns:**

- "What touched `<table>`?" → search Script Catalog for rows listing that table
- "Where does `<source>` data go?" → find source in Data Source Summary, read Target Tables
- "What scripts handle `<source>`?" → list scripts under that source section
- "Full lineage for `<table>`?" → find all scripts writing to the table, trace back to detected sources

## Forensic report format

```
🔍 FORENSIC REPORT: unified_entries

Sources → Scripts → Table:
  opendict  → scripts/ingest/build_db.py          → unified_entries
  stdict    → scripts/ingest/build_db.py          → unified_entries
  wikidata  → scripts/enrichment/wikidata_*.py    → unified_entries (enrichment)

Scripts that reference unified_entries (N total):
  1. scripts/ingest/build_db.py (primary ingest)
  2. scripts/unify/build_unified_entries.py (deduplication)
  3. scripts/enrichment/wikidata_associate.py (ID linking)
```

## Future use

`artifacts/provenance-map.md` is the intended spec for a clean pipeline rebuild. When planning a rebuild, cite specific entries from this map as the authoritative source of what each script is responsible for.
