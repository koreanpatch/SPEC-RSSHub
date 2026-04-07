---
name: bibim-refactor
description: 'Execute a multi-file refactoring with mandatory planning, parallel agents, incremental commits, and test verification. Usage: /refactor <what to refactor>'
argument-hint: '<what to refactor>'
---

<objective>
Take a refactoring goal, produce a written migration plan, execute it via parallel agents with incremental commits, and verify with tests. The plan is always written and approved before any code changes.

This skill enforces: plan first, parallel agents for independent work, test after each wave, commit incrementally.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=refactor`.

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what to refactor. Store as `$REFACTOR_GOAL`.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/bibim/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block. Focus on conventions and rules that matter for the refactoring.

## 1. Scope Analysis

Spawn **3 parallel agents** (ALL IN A SINGLE MESSAGE) to investigate the refactoring scope:

### Files Agent

- **subagent_type**: `general-purpose`
- **model**: `sonnet` (scope analysis is grep + read — see `.claude/skills/bibim/_common/model-selection.md`)
- **Role**: You are an expert on this codebase's file organization and module boundaries.
- Gets the full `$CODEBASE_CONTEXT` and `$REFACTOR_GOAL`.
- Instructions:
    1. Identify ALL files that will need changes (source, tests, configs, YAML, generated files)
    2. For each file: what changes are needed and why
    3. Check `docs/reference/CODEBASE_REFERENCE.md` first for file layout
    4. Report: file list with action (modify/create/delete) and brief rationale

### Imports & References Agent

- **subagent_type**: `general-purpose`
- **Role**: You are an expert in dependency analysis and import graphs.
- Gets the full `$CODEBASE_CONTEXT` and `$REFACTOR_GOAL`.
- Instructions:
    1. Use `Grep` to find ALL imports, references, and usages of the code being refactored
    2. Find ALL test patch paths (`@patch`, `mock.patch`) that reference affected modules
    3. Find ALL config/YAML references to affected code
    4. Check for circular import risks in the proposed restructuring
    5. Report: complete reference map with file paths and line numbers

### Patterns Agent

- **subagent_type**: `general-purpose`
- **Role**: You are an expert in this codebase's patterns and conventions.
- Gets the full `$CODEBASE_CONTEXT` and `$REFACTOR_GOAL`.
- Instructions:
    1. Find analogous refactorings that were done before in this codebase (check git log)
    2. Identify naming conventions, import patterns, and module organization patterns to follow
    3. Check `docs/codebase/CONVENTIONS.md` for documented patterns
    4. Report: patterns to follow, anti-patterns to avoid, precedent examples

Wait for ALL agents to complete.

## 2. Write Migration Plan

**Role**: Assume the role of a highly critical expert. Scrutinize agent findings for accuracy and completeness before incorporating.

Using all agent findings, write a migration plan to `docs/plans/refactor-{slug}.md`:

```markdown
# Refactor: {descriptive title}

**Goal:** {$REFACTOR_GOAL}
**Created:** {date}
**Status:** Draft

## Scope

{What's changing and why. 2-3 sentences.}

## Waves

Organize steps into waves based on dependencies. Independent steps go in the same wave (parallel). Dependent steps go in later waves (sequential).

### Wave 1: {title}

{Steps that can execute in parallel — no dependencies on each other}

- **Step 1a**: {what to do} — Files: `path/to/file.py`
- **Step 1b**: {what to do} — Files: `path/to/other.py`

### Wave 2: {title}

{Steps that depend on Wave 1 output}

- **Step 2a**: {what to do} — Files: `path/to/file.py`

## Import & Reference Updates

{Complete list of imports, patches, and references that need updating — from the Imports agent}

## Test Strategy

- Which existing tests verify correctness
- Which test patch paths need updating
- Test command to run after each wave

## Files Affected

| File                        | Action | Wave | Purpose         |
| --------------------------- | ------ | ---- | --------------- |
| `python/src/module/file.py` | Modify | 1    | Move function X |
```

Print the plan inline and ask the user for approval. **Do NOT proceed without explicit user confirmation.**

## 2.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is `$REFACTOR_GOAL`; the approach is the migration plan from Step 2 (key waves and strategy).

## 3. Execute Waves

For each wave:

### 3a. Classify & Spawn agents

If the wave has multiple independent steps, first classify their complexity per `.claude/skills/bibim/_common/model-selection.md`:

- Import/reference updates only → **sonnet**
- File moves/renames with straightforward logic → **sonnet**
- Logic changes, new abstractions, or complex rewrites → **opus**

Spawn **one agent per step** (ALL IN A SINGLE MESSAGE). Each agent:

- **subagent_type**: `general-purpose`
- **model**: Use the classified tier for this step
- **Role**: You are an expert on this codebase. Execute the refactoring step with precision.
- Gets a self-contained prompt including:
    - The full `$CODEBASE_CONTEXT`
    - Its specific step from the plan (what to change, which files)
    - The complete import/reference update list relevant to its files
    - Instructions to update ALL imports, patch paths, and references in its scope
    - Instructions to NOT run tests — testing happens after the wave
    - Instructions to report: what files were modified, what was done, any issues

If the wave has only 1 step, execute directly instead of spawning an agent.

Wait for ALL agents in the wave to complete.

### 3b. Coherence check

**Role**: You are a domain synthesizer who understands the whole codebase. Find the best synthesis of the wave's changes — not the most conservative.

Review all changes from this wave together:

- **Cross-step consistency**: Do changes from different agents work together? Naming conflicts? Duplicated logic?
- **Import completeness**: Are ALL import paths updated? ALL test patch paths? ALL config references?
- **Missed references**: Use `Grep` to verify no stale references remain to moved/renamed code
- Fix any issues found with targeted edits.

### 3c. Test

Run the project's test command (e.g., `make test`). If tests fail:

1. Read ALL failure output
2. Trace each failure to root cause (usually missed import/patch updates)
3. Batch-fix all issues
4. Re-run tests once

If tests still fail after one fix cycle, stop and report to the user.

### 3d. Commit

After tests pass:

1. Run `make format`
2. Stage the changed files
3. Commit with a descriptive message (e.g., "refactor: move X from module A to module B")
4. If pre-commit hooks modify files, re-stage and retry once

Proceed to the next wave.

## 4. Final Verification

After all waves are complete:

1. Run the full test command one more time to confirm everything is green
2. Run lint (`make lint`) to catch any remaining issues
3. Fix any issues found

## 4.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome. Log any incidents (test failures per wave, coherence issues, conflicting agent changes).

## 5. Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. The PR title should summarize the refactoring (e.g., "refactor: move X from module A to module B"). Include a summary of what was changed across all waves.

## 6. Report

Tell the user:

- How many waves were executed
- Summary of what changed per wave
- Commits created (hashes and messages)
- Final test/lint status
- Any issues encountered and how they were resolved
- Plan file location
- PR URL

</process>

<rules>
- ALWAYS write the plan and get user approval BEFORE any code changes
- ALL agents within a wave MUST be launched in a SINGLE message (true parallelism)
- NEVER start Wave N+1 until Wave N is tested and committed
- ALWAYS update ALL imports, patch paths, and references when moving/renaming code — use Grep to verify none are missed
- ALWAYS run tests after each wave, not just at the end
- ALWAYS commit after each successful wave — incremental commits, not one big commit
- Each agent prompt must be self-contained with the full `$CODEBASE_CONTEXT`
- Follow the project's testing rules from CLAUDE.md (e.g., `make test` not `make test-all`)
- Use `make format` before staging to prevent pre-commit hook retry cycles
- If a wave has only 1 step, execute directly — don't spawn a single agent
- Plan file goes in `docs/plans/` (per project convention)
- NEVER make changes beyond the approved plan scope — if you discover additional work needed, report it to the user
- If tests fail after one fix cycle within a wave, STOP and report — do not loop
</rules>

<success_criteria>

- [ ] Codebase context gathered from reference docs
- [ ] 3 analysis agents launched in parallel (single message) to map scope
- [ ] Migration plan written to `docs/plans/refactor-{slug}.md`
- [ ] Plan printed inline and user approval obtained before execution
- [ ] Steps organized into dependency-ordered waves
- [ ] Each wave: agents spawned in parallel, coherence checked, tested, committed
- [ ] ALL imports, patch paths, and references updated (verified via Grep)
- [ ] Incremental commits after each wave (not one big commit)
- [ ] Final test + lint pass after all waves complete
- [ ] PR created via auto-pr procedure
- [ ] User sees: waves executed, commits created, final status, PR URL
      </success_criteria>
      </output>
