---
name: sunbi-dict-contract
description: 'Live reference for the dictionary API contract: endpoints, response shapes, field names, and versioning. Invoke before writing any code that calls the dictionary API. Usage: /dict-contract'
argument-hint: ''
---

# Dictionary API Contract (Sunbi)

## Read first (short path)

1. **`docs/dev/architecture/dictionary-api-contract.md`** — hub with links to canonical docs.
2. **`docs/API_CONTRACT.md`** — Sunbi client view: routes, env, how types are generated.

This skill describes **how to work safely** with the contract, not every field.

## Three sources of truth (priority)

1. **`dictionary/docs/sunbi-dictionary-contract.md`** (in the [dictionary](https://github.com/koreanpatch/dictionary) repo clone) — wire contract ground truth.
2. **`docs/dictionary/types/dictionary-api.d.ts`** — TypeScript shapes shipped with Sunbi (generated / maintained per pipeline).
3. **`docs/audits/CONTRACT_DRIFT.md`** — recorded drift between consumer and producer (when the file exists).

If (1) and (2) disagree, treat the **dictionary repo** as authoritative for HTTP semantics and **regenerate or update** Sunbi types.

## Field name discipline

Verify every response field against the contract / `dictionary-api.d.ts` before relying on it.

**High-frequency mistake:** renamed fields (e.g. prefer **`formality_tier`** — do not introduce `register_level` in new code).  
For banned synonyms and glossary rules, see **`dictionary/artifacts/glossary-index.md`** in the dictionary repo when available.

## Adding a new API touchpoint

1. Confirm the route exists and is stable in the dictionary contract (avoid undocumented experimental routes for production UX).
2. If the flow crosses the extension boundary, add or extend a **`Message`** variant in **`src/shared/types/messages.ts`** where runtime messaging is involved.
3. For HTTP: extend **`src/shared/services/dictionary.ts`** (and related modules) — keep shapes aligned with **`dictionary-api.d.ts`**.
4. Run **`.claude/skills/sunbi/sunbi-contract-check`** (or the `/sunbi-contract-check` workflow) after type or route changes.
5. Update **`docs/API_CONTRACT.md`** or the architecture hub if the local doc was stale.

## Base URL and keys

- **Never hardcode** the production API base URL in scattered call sites — use env / shared config (`VITE_DICTIONARY_API_URL` is baked at build time; restart dev server after `.env` changes).
- See **`docs/API_CONTRACT.md`** for key handling and probe commands.

## When to run `/sunbi-contract-check`

- After pulling new changes from the dictionary repo.
- Before a release branch cut.
- Whenever you add, rename, or remove fields in Sunbi types that mirror API responses.
