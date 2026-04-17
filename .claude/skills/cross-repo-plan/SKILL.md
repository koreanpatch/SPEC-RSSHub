---
name: cross-repo-plan
description: Break a cross-repo feature or fix into scoped per-repo task prompts. Use when a feature touches two or more of: dictionary, sunbi, bibim_parser, nlp. Output is a set of ready-to-paste prompts, one per repo session.
---

# Cross-Repo Plan

Given a feature description or checklist, produce one focused prompt per affected repo.

## When invoked (/cross-repo-plan <feature description or checklist path>)

1. Read `artifacts/contract-drift.md` to identify any open BREAKING issues first.
2. Read the feature description or the file at the given path.
3. Identify which repos are affected: dictionary / sunbi / bibim_parser / nlp.
4. For each affected repo, write a self-contained Claude Code prompt that:
    - States the repo context (e.g. "You are working in ~/code/src/dictionary")
    - References the relevant source files by path
    - Cites the relevant skill to load first (e.g. "Read docs/ranking.md first")
    - Lists exactly what to build (tests, production changes, docs)
    - States constraints (what NOT to change)
    - Ends with a verification step (what command to run to confirm it worked)

## Output format

Write prompts to `artifacts/cross-repo-plan-<slug>.md`:

```
## Cross-Repo Plan — <feature name> — YYYY-MM-DD

### Prompt 1 of N — dictionary/
**Run from:** ~/code/src/dictionary
**Load first:** docs/ranking.md
...

### Prompt 2 of N — sunbi/
**Run from:** ~/code/src/sunbi
...

## Rules
- Each prompt must be runnable without the others (no "see prompt 1 for context").
- If a prompt depends on output from another (e.g. sunbi depends on a new dict API field), note the dependency explicitly at the top of the downstream prompt.
- Do not combine two repos into one prompt.
```
