---
name: contract-check
description: Validate that Sunbi's API calls match the current dictionary API contract. Reads dictionary schema-index and contract doc from the sibling repo. Run before any Sunbi fetch layer change.
---

# Sunbi Contract Check

Validate that Sunbi's fetch layer matches what the dictionary API actually provides.

## Artifact paths (relative to src/)

```
dictionary/artifacts/schema-index.md        — current dictionary schema
dictionary/docs/sunbi-dictionary-contract.md — official contract
```

## When invoked (/sunbi-contract-check)

1. Read `../dictionary/docs/sunbi-dictionary-contract.md`
2. Read `../dictionary/artifacts/schema-index.md` (check freshness, warn if > 24h)
3. Scan Sunbi's fetch layer for contract compliance:
    - `src/fetch.ts` — does each API call match an existing endpoint?
    - `src/dictionary.ts` — do field accesses match current response shape?

## Key fields to validate

| Field Sunbi uses               | Must match                                                 |
| ------------------------------ | ---------------------------------------------------------- |
| `formality_tier`               | dictionary returns `formality_tier` (not `register_level`) |
| `headword`                     | dictionary returns `headword` (not `word` or `lemma`)      |
| `sense`                        | dictionary returns `sense` list (not `definition`)         |
| `hanja_info.compound_crossref` | dictionary returns this array                              |

## Output

```
CONTRACT CHECK — YYYY-MM-DD

✓ GET /words/{headword} — fields match
✓ GET /search/?q= — endpoint exists
⚠ src/fetch.ts:142 uses field `register_level` — dictionary now returns `formality_tier`
```

Write findings to `../artifacts/contract-drift.md` (src/artifacts/).
