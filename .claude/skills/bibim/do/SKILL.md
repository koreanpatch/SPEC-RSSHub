---
name: bibim-do
description: 'Work on tasks from a markdown file or folder using parallel agents that execute, verify, and update the file. Usage: /do [markdown file or folder]'
argument-hint: '[markdown file or folder path]'
---

<objective>
Take a markdown file containing tasks (checkboxes, TODOs, action items), dispatch parallel agents to execute independent tasks, verify the work, and update the file to reflect completed items.

All work is performed in the current project following its conventions (CLAUDE.md, docs/ docs).
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=do`.

## 0. Parse Input

Resolve `$ARGUMENTS` to a markdown file (`$FILE`) using these rules, in order:

1. **`$ARGUMENTS` is a `.md` file path** — use it directly as `$FILE`.
2. **`$ARGUMENTS` is a directory path** — look for actionable markdown files in that directory (files containing `- [ ]` checkboxes or `TODO` items). If exactly one is found, use it. If multiple are found, list them and use `AskUserQuestion` to ask the user which one to work from. If none are found, tell the user and stop.
3. **`$ARGUMENTS` is a bare name** (no path separators, no `.md` extension) — treat it as a folder name under `docs/plans/` (i.e., resolve to `docs/plans/{$ARGUMENTS}/`) and apply rule 2.
4. **`$ARGUMENTS` is empty** — apply rule 2 to `docs/plans/` (the default location). If `docs/plans/` doesn't exist or has no actionable markdown, use `AskUserQuestion` to ask the user which file to work from.

Verify `$FILE` exists using `Read`. If it doesn't exist, tell the user and stop.

## 0.25. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is derived from `$FILE` and its pending tasks; the approach is wave-based parallel execution.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/bibim/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block.

## 1. Parse Tasks

Read `$FILE` and extract all actionable items. Recognize these patterns:

- `- [ ] task description` — unchecked checkbox (pending)
- `- [x] task description` — checked checkbox (done, skip)
- `TODO: description` or `TODO description` — inline TODOs
- Numbered action items (`1. Do X`, `2. Do Y`) without checkboxes
- Section headers with pending items beneath them

Build a task list. For each task, capture:

- **ID**: sequential number
- **Description**: the task text
- **File context**: any file paths, function names, or module references mentioned
- **Dependencies**: does this task depend on another task's output?
- **Status**: pending or done (skip done items)

Filter to only **pending** tasks.

If there are no pending tasks, tell the user and stop.

## 2. Plan Execution

Analyze the pending tasks and group them into **waves** based on dependencies:

- **Wave 1**: Tasks with no dependencies on other tasks (can all run in parallel)
- **Wave 2**: Tasks that depend on Wave 1 outputs
- **Wave N**: Tasks that depend on Wave N-1 outputs

Most task files will have a single wave (all independent). Only create multiple waves when there are genuine data dependencies.

Tell the user:

- Total pending tasks found
- How many waves
- Which tasks are in each wave
- How many agents will be spawned per wave

Ask for confirmation before proceeding. If the user wants to skip certain tasks or reorder, adjust accordingly.

## 2.5. Classify Task Complexity

Follow the **Classifier Pattern** in `.claude/skills/bibim/_common/model-selection.md`. Spawn a single **haiku** agent with all pending task descriptions. It returns a model assignment per task:

- Simple edits (add TSV row, update config value, rename) → **haiku**
- Multi-file changes with clear patterns (add test, update imports) → **sonnet**
- Architectural or novel implementation (new module, complex logic) → **opus**

Store the result as `$TASK_MODELS`.

## 3. Execute Waves

For each wave, spawn **one Agent per task**, ALL IN A SINGLE MESSAGE (maximally parallel). Each agent:

- **subagent_type**: `general-purpose`
- **model**: Use `$TASK_MODELS[task_id]` from step 2.5
- **Role**: You are an expert on the topic of this task. Approach the work with deep domain knowledge and professional rigor.
- Gets a detailed, self-contained prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - Its specific task description and any file context
    - Pointer to pre-built reference docs: "For detailed codebase information, read files in `docs/codebase/` and `docs/reference/`. Use these instead of scanning the codebase from scratch."
    - Clear instruction on what "done" looks like for this task
    - Instructions to follow project conventions (from CLAUDE.md)
    - Instructions to NOT run the full test suite — just make the changes. Testing happens in the verification phase.
    - Instructions to report back: what files were created/modified, what was done, any issues encountered

Wait for ALL agents in the wave to complete before starting the next wave.

After each wave, briefly summarize to the user what was accomplished.

## 4. Synthesis Review

Follow the procedure in `.claude/skills/bibim/_common/pragmatist-review.md`. Focus on cross-task coherence, codebase fit, and whether a better synthesis of the task outputs exists.

## 5. Verify Work

After ALL tasks are implemented and coherence review is complete, verify nothing is broken. Do NOT run tests earlier — not after individual waves, not mid-implementation. Tests run exactly once, here.

Run `rtk make verify -v` (format → lint → test). If tests fail, read output, batch-fix, and re-run once.

If verification reveals problems that can't be easily fixed, report them to the user rather than making speculative fixes.

## 6. Update the Markdown File

Edit `$FILE` to reflect the completed work:

- Check off completed checkboxes: `- [ ]` → `- [x]`
- Mark completed TODOs (strikethrough or remove, matching the file's existing style)
- Add brief notes next to items if the implementation deviated from the description
- If any tasks failed or were partially completed, add a note explaining what happened
- Do NOT rewrite the file — make minimal, targeted edits

## 6.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome. Log any incidents (verification failures, agent conflicts, tasks that couldn't be completed).

## 7. Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. The PR title should summarize the work (e.g., "feat: implement 4 tasks from plan-xyz").

## 8. Report to User

Tell the user:

- How many tasks were completed out of total pending
- Summary of what was done (1-2 lines per task)
- Any tasks that failed or need follow-up
- Verification results (lint/test pass/fail)
- Any files that were created or significantly modified
- PR URL

</process>

<rules>
- ALL agents within a wave MUST be launched in a SINGLE message (true parallelism)
- Never launch Wave N+1 until ALL Wave N agents have returned
- Each agent prompt must be detailed and self-contained — agents have no shared context
- Agents must NOT run the full test suite — only the orchestrator runs verification after all work is done
- Follow the project's testing rules from CLAUDE.md (e.g., single .bibim bundle rule, make test not make test-all)
- After all tasks are complete and verification passes, auto-commit with a descriptive message summarizing the work (e.g., "feat: implement 4 tasks from plan-xyz — add stem classes, update morphotactics, add tests"). Use `make format` before staging, then `git add` the changed files and `git commit`. If pre-commit hooks modify files, re-stage and retry once.
- If the markdown file has fewer than 3 pending tasks, execute them directly instead of spawning agents (overhead not worth it)
- If a task is ambiguous, prefer asking the user over guessing — use `AskUserQuestion`
- Respect the project's conventions for file placement, naming, imports, and style
</rules>

<success_criteria>

- [ ] Markdown file parsed and pending tasks identified
- [ ] Codebase context gathered from reference docs
- [ ] Execution plan presented to user and confirmed
- [ ] All independent tasks launched in parallel per wave
- [ ] All tasks executed following project conventions
- [ ] Verification (lint + tests) passes
- [ ] Synthesis review completed — cross-task consistency, codebase fit, and best synthesis confirmed
- [ ] Markdown file updated to reflect completed items
- [ ] PR created via auto-pr procedure
- [ ] User sees a clear summary of what was done and PR URL
      </success_criteria>
