---
name: bibim-update-docs
description: 'Update all stale documentation in docs/ to match the current codebase state. Usage: /update-docs [specific file]'
argument-hint: '[specific file to update, or omit to update all stale docs]'
---

<objective>
Discover living documentation files in `docs/` and at the project root, check each for staleness against the current committed codebase, and update any stale docs in-place using parallel agents. Historical/archival docs in `phases/` and `plans/` are never touched.

All updates are made in-place — docs are never rewritten from scratch.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=update-docs`.

## 0. Parse Input

If `$ARGUMENTS` is provided, use it as the specific file to update (skip staleness check for that file — just update it). Store as `$TARGET_FILE`.

If `$ARGUMENTS` is empty, update all stale docs (full scan mode).

## 0.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/_common/state-logging.md`. The intent is "update stale docs" (or "update $TARGET_FILE" if specific); the approach is "parallel staleness check, parallel doc update with opus agents, synthesis review".

## 1. Discover Docs

Find all markdown files in `docs/` that are living documentation (not historical records):

```bash
# Include these paths:
# docs/*.md
# docs/codebase/*.md
# docs/reference/*.md
# Also: CLAUDE.md at project root
```

**EXCLUDE** — these are historical/archival, not living docs:

- `docs/phases/**`
- `docs/plans/**`

If `$TARGET_FILE` was provided, verify it exists and is within the allowed paths. If not, tell the user and stop.

List all discovered docs to the user.

## 2. Staleness Check

For each doc, determine if it's stale:

```bash
# Get the doc's last modification time
stat -c "%Y" <doc_file>
# Get the most recent source code commit timestamp
git log -1 --format="%ct" -- "python/src/" "*.py"
```

A doc is potentially stale if source code has changed since the doc was last modified. But also check the doc's content — even if timestamps suggest freshness, the doc might reference things that no longer exist.

For efficiency, run a quick parallel check: spawn **one agent per doc file** (ALL IN A SINGLE MESSAGE) to do a fast staleness assessment. Each agent:

- **subagent_type**: `general-purpose`
- **model**: `haiku` (this is mechanical file-existence checking — see `.claude/skills/_common/model-selection.md`)
- **Role**: You are checking whether documentation claims still match the codebase.
- Gets a prompt to:
    1. Read the doc
    2. Spot-check 3-5 claims (file paths exist? function names exist? module descriptions match?)
    3. Report: **stale** (with list of specific issues) or **fresh**
- Each agent prompt must be self-contained

Wait for all staleness agents to complete.

Filter to only stale docs. If none are stale, tell the user "All docs are up to date" and stop.

Tell the user which docs are stale and what's wrong with each. Ask for confirmation before updating.

## 3. Parallel Update

Spawn **one agent per stale doc** (ALL IN A SINGLE MESSAGE) to update it. Each agent:

- **subagent_type**: `general-purpose`
- **model**: `opus`
- **Role**: You are an expert on the project's codebase, architecture, and documentation. Update docs with precision and deep understanding of the system.
- Gets a detailed, self-contained prompt including:
    - The doc file path
    - The staleness issues found in Step 2
    - Instructions to READ the doc, then READ the actual source code it documents
    - Specific guidance based on doc type (see below)
    - Instructions to update IN-PLACE — do NOT rewrite from scratch
    - Instructions to preserve the doc's existing structure, voice, and formatting
    - Instructions to add/remove entries as needed (new files, removed modules, etc.)

### Per-doc-type guidance

**For `docs/codebase/` docs:**

- `STACK.md` — verify dependencies match `pyproject.toml`
- `CONVENTIONS.md` — spot-check source files to see if conventions still hold
- `TESTING.md` — verify test file listing and fixture names match reality

**For `docs/reference/` docs:**

- `CODEBASE_REFERENCE.md` — verify module descriptions match current code
- `PIPELINE.md` — verify data flow matches actual function signatures
- `CONCEPT_INDEX.md` — verify file paths and function names still exist
- `FORMAT.md` — verify binary format spec matches serialization code
- `GLOSSARY.md` — check if new terms need adding
- `RECIPES.md` — verify step-by-step guides still work
- `YAML_SCHEMAS.md` — verify schemas match actual YAML files

**For root-level docs:**

- `CLAUDE.md` — verify build commands work, file counts match, architecture description is current
- `STATE.md` — update current progress markers

Wait for ALL update agents to complete.

## 4. Verify Updates

**Role**: Assume the role of a highly critical expert. Verify each update against the actual codebase with rigorous scrutiny — reject changes that introduce inaccuracies, miss important details, or degrade doc quality.

After all updates, do a quick sanity check:

- Read each updated doc
- Verify the changes make sense and didn't corrupt the file
- Check that formatting is consistent

## 4.5. Synthesis Review

Follow the procedure in `.claude/skills/_common/pragmatist-review.md`. Focus on cross-doc consistency, voice consistency, and missing cross-references across the `docs/` documentation set.

## 4.75. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N docs checked, N stale, N updated; list updated files).

## 5. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/_common/auto-finalize.md`. Stage all updated doc files. Commit: `docs: update N stale docs to reflect current codebase`. PR title should summarize updates.

## 6. Report

Tell the user:

- How many docs were checked
- How many were stale
- What was updated (brief summary per doc)
- List of files modified
- PR URL

</process>

<rules>
- ALL staleness-check agents MUST be launched in a SINGLE message (true parallelism)
- ALL update agents MUST be launched in a SINGLE message (true parallelism)
- NEVER rewrite docs from scratch — update what exists, preserving structure, formatting, and voice
- ALWAYS exclude `docs/phases/` and `docs/plans/` — these are historical records, never touched
- Each agent prompt must be detailed and self-contained — agents have no shared context
- Use model `opus` for update agents that require deep codebase understanding (CODEBASE_REFERENCE, PIPELINE, FORMAT, YAML_SCHEMAS, CLAUDE.md). Use model `sonnet` for update agents that do structured comparison or spot-checking (STACK, CONVENTIONS, TESTING, CONCEPT_INDEX, GLOSSARY, RECIPES, STATE).
- Do NOT update docs to reflect in-progress or uncommitted work — only update based on committed code state
- If `$TARGET_FILE` is provided, skip the full discovery and staleness check — just update that one file directly
- After all docs are updated and verified, auto-commit via the standard auto-commit procedure
</rules>

<success_criteria>

- [ ] Living docs discovered (excluding phases/ and plans/)
- [ ] Staleness checked via parallel agents (one per doc, single message)
- [ ] Only stale docs identified; fresh docs left untouched
- [ ] User informed of stale docs and confirmed before updating
- [ ] Update agents launched in parallel (one per stale doc, single message, opus model)
- [ ] Each doc updated in-place — not rewritten from scratch
- [ ] Updates verified for correctness and formatting consistency
- [ ] Synthesis review completed — cross-doc consistency and voice confirmed
- [ ] State logging pre/post completed
- [ ] Auto-committed via auto-commit procedure
- [ ] PR created via auto-pr procedure
- [ ] User sees a clear summary: docs checked, docs updated, what changed, PR URL
      </success_criteria>
      </process>
