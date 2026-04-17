---
name: sunbi-master
description: Check that dictionary API endpoints and response shapes match what the Sunbi extension expects, per docs/sunbi-dictionary-contract.md. Flag drift. Consult before any API change.
---

# Sunbi Master

Guard the contract between this dictionary API and the Sunbi reading extension. The authoritative contract is `docs/sunbi-dictionary-contract.md`.

## When invoked by user (/sunbi-master)

Perform a full contract check:

1. Read `docs/sunbi-dictionary-contract.md`
2. Read `artifacts/schema-index.md` (regenerate if stale)
3. For each endpoint listed in the contract, check `app/routers/` for:
    - Endpoint still exists at the correct path
    - Response model in `app/models.py` contains all required fields
    - Field names match contract exactly (not banned synonyms)
    - `formality_tier` is serialized as a string (not an integer or enum)

4. Write drift findings to `../artifacts/contract-drift.md` (the `src/artifacts/` level)

## When consulted during API planning

Before adding, removing, or renaming any field on an API response, check the contract:

- Is this field used by Sunbi? If yes, flag as breaking change.
- Does the new field name match the contract exactly?

## Key contract invariants

- `GET /words/{headword}` must return `formality_tier` (not `register_level`)
- `GET /search/` must support `q` query parameter
- `GET /hanja/{char}` must return `compound_crossref` array
- `GET /bulk/words` must accept `{"headwords": [...]}` body
- All endpoints must return 404 (not 500) for missing entries

## Sunbi repo reciprocal

The Sunbi repo has a counterpart skill at `src/sunbi/.claude/skills/sunbi-contract-check/` that checks from the frontend side. Run both when making contract-affecting changes.

In **sunbi-rsshub**, the bundled copy lives at `.claude/skills/contract-check/`.

## Write drift to src/artifacts/

```bash
mkdir -p ../artifacts
# append findings to ../artifacts/contract-drift.md
```
