---
name: bibim-gap-disposition
description: 'Update the gap analysis disposition ledger (TSV) after implementing or rejecting findings. Tracks what was fixed, rejected, or deferred so future /gap-analysis runs skip resolved items. Usage: /gap-disposition'
---

<objective>
After the user has implemented fixes for gap analysis findings, **append rows** to the disposition ledger at `docs/plans/gap_analysis/disposition.tsv`. This TSV is the single source of truth for which findings have been implemented, rejected, or deferred — and why.

The `/gap-analysis` skill classifies findings and appends them to this same TSV with `disposition=open`. This skill resolves open rows by updating them to `implemented`, `rejected`, or `deferred` based on what actually changed in the codebase.
</objective>

<context>
User input: $ARGUMENTS

**The ledger:** `docs/plans/gap_analysis/disposition.tsv`

TSV columns (tab-separated, header row):

```
id	surface	tag	finding	confidence	category	disposition	reason	commit	date
```

Column definitions:

- `id`: Finding ID — `U{n}` (unambiguous), `A{n}` (ambiguous), `N{n}` (uncertain)
- `surface`: The Korean surface form (e.g., 았었, 처럼, 것)
- `tag`: The POS/stem-class tag involved (e.g., EP, JKB, MAG)
- `finding`: One-line description of the finding
- `confidence`: `unambiguous` / `ambiguous` / `uncertain`
- `category`: `missing_suffix` / `missing_stem` / `wrong_pos` / `tag_convention` / `transition_gap` / `compound_coverage` / `dialectal` / `unknown`
- `disposition`: `open` / `implemented` / `rejected` / `deferred`
- `reason`: Why this disposition — concise but specific enough for future readers
- `commit`: Short hash (7 chars) of the implementing commit, blank if rejected/deferred
- `date`: ISO date (YYYY-MM-DD)

Key reference files:

- Grammar files: `grammar/endings/*.tsv`, `grammar/particles/*.yaml`, `grammar/config/*.yaml`
- Dictionary files: `dictionary/stems/*.tsv`
- Git history: recent commits show what was changed
  </context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=gap-disposition`.

## 0.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/_common/state-logging.md`. The intent is "resolve open gap findings in disposition ledger"; the approach is "detect implemented changes, ask user for undetectable dispositions, update TSV".

## 1. Load Current State

Read these in parallel:

- `docs/plans/gap_analysis/disposition.tsv` — the ledger
- Run `rtk git log --oneline -30` for recent commit context

Identify all rows where `disposition=open`. These are the findings to resolve.

## 2. Detect Implemented Changes

For each `open` row, check whether the fix was applied:

- **missing_suffix** (`missing EP/EC/ETM/ETN/EF/JKQ`): Grep the relevant TSV in `grammar/endings/` for the surface form
- **wrong_pos** (`NNG→MAG`, etc.): Check if the stem was removed from the old file and added to the new one in `dictionary/stems/`
- **missing_stem**: Grep the relevant TSV in `dictionary/stems/` for the surface form
- **tag_convention** (`JKB vs JX`, etc.): Grep the relevant YAML in `grammar/particles/`
- **transition_gap**: Read `grammar/config/morphotactics.yaml` for new edges
- **compound_coverage**: Check if compound generation covers the form

For each detected change, find the implementing commit via `rtk git log --oneline --all -- {file}`.

## 3. Ask User for Undetectable Dispositions

Some dispositions can't be auto-detected (e.g., "rejected because not worth the bundle size"). For any `open` finding where the outcome is unclear, ask the user in a single batch:

> "I resolved N findings automatically. These remain open — what's the disposition?"
>
> - A1: 처럼 JKB vs JX → implemented / rejected / deferred?
> - N5: zero-freq dialectal EC → implemented / rejected / deferred?

One line per finding. Keep it concise.

## 4. Update the TSV

For each resolved finding, update its row in-place:

- Set `disposition` to `implemented`, `rejected`, or `deferred`
- Fill in `reason` (concise but specific)
- Fill in `commit` hash if implemented
- Set `date` to today

**Important**: Edit existing rows, do not append duplicates. The `id` column is the key.

## 4.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N implemented, N rejected, N deferred, N still open). Log incidents if auto-detection was wrong or if findings had to be reclassified.

## 5. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/_common/auto-finalize.md`. Stage the updated disposition TSV. Commit: "gap-disposition: resolve N findings — N implemented, N rejected, N deferred". PR title should summarize dispositions.

## 6. Report to User

Summarize:

- How many findings resolved this run
- Breakdown: N implemented, N rejected, N deferred, N still open
- Any findings that remain open (need future attention)
- PR URL

</process>

<rules>
- Always prefix commands with `rtk`
- Always use `uv run python`, never bare `python`
- NEVER auto-disposition a finding without evidence — if you can't detect the change and the user didn't say, leave it as `open`
- The TSV is append-only for new findings. Existing rows are updated in-place (disposition, reason, commit, date columns only)
- Never remove a past `implemented` or `rejected` row unless the user explicitly asks
- `deferred` rows CAN be promoted to `implemented` or `rejected` in future runs
- Keep the `reason` column concise but specific — future readers must understand WHY without external context
- Commit references should be short hashes (7 chars)
- If the TSV doesn't exist yet, create it with the header row and no data rows
- Use tab characters as delimiters, not spaces. Preserve Korean characters exactly.
- After all work is done, auto-commit and create a PR via the standard procedures
- Do not ask for confirmation before writing — just update the TSV and report
</rules>

<success_criteria>

- [ ] All `open` rows in the TSV cross-referenced against current codebase state
- [ ] Every resolvable finding updated to `implemented` / `rejected` / `deferred`
- [ ] Commit hashes included for implemented findings where detectable
- [ ] Reasons filled in for all resolved findings
- [ ] Auto-committed and PR created via auto-pr procedure
- [ ] User sees summary of disposition counts, remaining open items, and PR URL
      </success_criteria>
