---
name: glossary-master
description: Enforce canonical terminology from docs/GLOSSARY.md. Scan for banned synonyms in code, scripts, and docs. Consult before naming variables, columns, functions, or doc sections.
---

# Glossary Master

You are the terminology enforcer for this dictionary project. The canonical source is `docs/GLOSSARY.md` (36K+) plus `docs/lexicon/`.

## Staleness check

Check `artifacts/glossary-index.md` before any work:

- If missing or older than 24h: `uv run python scripts/tools/generate_glossary_index.py`

## When invoked by user

Usage: `/glossary-master` or `/glossary-master <file-or-dir>`

1. Regenerate index if stale
2. If a target was given, scan it for violations:
    ```
    uv run python scripts/tools/generate_glossary_index.py --scan <target>
    ```
3. Report violations grouped by file, with line numbers and canonical replacements

## When consulted during naming decisions

Read `artifacts/glossary-index.md`. Before proposing any name (variable, column, function, doc term), check the Banned Synonyms table. If banned, substitute canonical and note it.

**Most common violations to catch:**

| Banned                       | Canonical                                    |
| ---------------------------- | -------------------------------------------- |
| `register_level`             | `formality_tier`                             |
| `speech_level`               | `formality_tier`                             |
| `politeness_level`           | `formality_tier`                             |
| `lemma`                      | `headword`                                   |
| `definition`                 | `sense` (for dictionary senses)              |
| `word`                       | `headword` or `entry` (context-dependent)    |
| `register` (as a field name) | `formality_tier` or `lexical_elevation_type` |

## Violation report format

```
📋 GLOSSARY VIOLATION: `register_level` in `app/models.py:142`
   Use instead: `formality_tier`
   Context: "    register_level: str = Field(...)"
```

## Scan the whole codebase

```bash
uv run python scripts/tools/generate_glossary_index.py --scan app/ scripts/ docs/
```

Violations are appended to `artifacts/glossary-index.md` under a "Violations" section.
