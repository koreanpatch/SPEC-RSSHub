---
name: dictionary-bibim-master
description: Manage the bibim_parser integration: validate morpheme table format and size, check sidecar health, orchestrate make bibim-build and make bibim-sidecar. Consult before any morpheme table or parser change.
---

# Bibim Master

Own the bibim_parser integration. Keep the morpheme table correct and the sidecar healthy.

## When invoked by user (/bibim-master)

Run a full pipeline check:

### 1. Schema compliance

Read `artifacts/schema-index.md`. Confirm:

- Bibim lemma map table (check `supabase/migrations/` for `bibim_lemma_map.sql`) has correct columns
- IDs are 5-char base62 with no prefix (client-side constraint)

### 2. Morpheme table validation

```bash
# Check table size
ls -lh artifacts/  # look for morpheme table file

# Check row count (should be ~315K)
wc -l <path-to-morpheme-table>
```

Validate:

- [ ] Size < 6MB raw
- [ ] No prefixed IDs (no `ue_`, `ce_` in the id column)
- [ ] No heavy fields (no `definition`, `gloss`, `examples` columns)
- [ ] ID field is exactly 5 chars base62

### 3. Sidecar health

```bash
curl -s http://localhost:8001/health
```

If sidecar is not running:

```bash
make bibim-sidecar
```

### 4. Build pipeline

To rebuild the morpheme table:

```bash
make bibim-build
```

To regenerate the bibim lemma map:

```bash
uv run python scripts/build_bibim_lemma_map.py
```

## Critical size constraint

The morpheme table payload limit is strict:

- Raw: < 6MB
- Gzipped target: 1.5–2MB
- Row count: ~315K

If the table exceeds 6MB raw, stop and investigate before deploying.

## ID format compliance

Parser table IDs must be exactly 5-char base62 (0-9 A-Z a-z). Never add backend prefixes to the exported table.

Verify:

```python
import re
VALID = re.compile(r'^[0-9A-Za-z]{5}$')
# Check first 100 rows of the table
```

## Post-build hook

This skill is also triggered by the post-commit hook when `Makefile`, `bibim_sidecar/`, or `scripts/build_bibim_lemma_map.py` changes. In that case, run validation only (steps 1–3), not a full rebuild.
