---
name: do
description: 'Work on tasks from a markdown file or folder using parallel agents that execute, verify, and update the file. Usage: /do [markdown file or folder]'
argument-hint: '[markdown file or folder path]'
---

<objective>
Take a markdown file containing tasks (checkboxes, TODOs, action items), dispatch parallel agents to execute independent tasks, verify the work, and update the file to reflect completed items.

All work is performed in the current project following its conventions (CLAUDE.md, .planning/ docs).
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=do`.

## 0. Parse Input

Resolve `$ARGUMENTS` to a markdown file (`$FILE`) using these rules, in order:

1. **`$ARGUMENTS` is a `.md` file path** — use it directly as `$FILE`.
2. **`$ARGUMENTS` is a directory path** — look for actionable markdown files in that directory (files containing `- [ ]` checkboxes or `TODO` items). If exactly one is found, use it. If multiple are found, list them and use `AskUserQuestion` to ask the user which one to work from. If none are found, tell the user and stop.
3. **`$ARGUMENTS` is a bare name** (no path separators, no `.md` extension) — treat it as a folder name under `.planning/plans/` (i.e., resolve to `.planning/plans/{$ARGUMENTS}/`) and apply rule 2.
4. **`$ARGUMENTS` is empty** — apply rule 2 to `.planning/plans/` (the default location). If `.planning/plans/` doesn't exist or has no actionable markdown, use `AskUserQuestion` to ask the user which file to work from.

Verify `$FILE` exists using `Read`. If it doesn't exist, tell the user and stop.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block.

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

## 3. Execute Waves

For each wave, spawn **one Agent per task**, ALL IN A SINGLE MESSAGE (maximally parallel). Each agent:

- **subagent_type**: `general-purpose`
- **Role**: You are an expert on the topic of this task. Approach the work with deep domain knowledge and professional rigor.
- Gets a detailed, self-contained prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - Its specific task description and any file context
    - Pointer to pre-built reference docs: "For detailed codebase information, read files in `.planning/codebase/` and `.planning/reference/`. Use these instead of scanning the codebase from scratch."
    - Clear instruction on what "done" looks like for this task
    - Instructions to follow project conventions (from CLAUDE.md)
    - Instructions to NOT run the full test suite — just make the changes. Testing happens in the verification phase.
    - Instructions to use `uv run python` or `source venv/bin/activate` before any Python execution
    - Instructions to report back: what files were created/modified, what was done, any issues encountered

Wait for ALL agents in the wave to complete before starting the next wave.

After each wave, briefly summarize to the user what was accomplished.

## 4. Pragmatist Coherence Review

Follow the procedure in `.claude/skills/_common/pragmatist-review.md`. Focus on cross-task coherence and codebase fit.

## 5. Verify Work

After ALL tasks are implemented and coherence review is complete, run `uv run pytest` to verify nothing is broken. Do NOT run tests earlier — not after individual waves, not mid-implementation. Tests run exactly once, here.

**Role**: Assume the role of a highly critical expert. Scrutinize every change, challenge assumptions, and flag anything that doesn't meet the highest standards of correctness.

**Verification steps:**

1. **Test check**: Run `uv run pytest` (or a targeted subset if changes are localized). If tests fail:
    - Read the failure output
    - Trace failures to the changes made by agents
    - Fix the issues (batch-fix, not fix-test-fix-test cycles)
    - Re-run tests once to confirm

If verification reveals problems that can't be easily fixed, report them to the user rather than making speculative fixes.

## 6. Update the Markdown File

Edit `$FILE` to reflect the completed work:

- Check off completed checkboxes: `- [ ]` → `- [x]`
- Mark completed TODOs (strikethrough or remove, matching the file's existing style)
- Add brief notes next to items if the implementation deviated from the description
- If any tasks failed or were partially completed, add a note explaining what happened
- Do NOT rewrite the file — make minimal, targeted edits

## 7. Report to User

Tell the user:

- How many tasks were completed out of total pending
- Summary of what was done (1-2 lines per task)
- Any tasks that failed or need follow-up
- Verification results (test pass/fail)
- Any files that were created or significantly modified

</process>

<rules>
- ALL agents within a wave MUST be launched in a SINGLE message (true parallelism)
- Never launch Wave N+1 until ALL Wave N agents have returned
- Each agent prompt must be detailed and self-contained — agents have no shared context
- Agents must NOT run the full test suite — only the orchestrator runs verification after all work is done
- After all tasks are complete and verification passes, auto-commit following `.claude/skills/_common/auto-commit.md` with a descriptive message summarizing the work. Stage only the changed files with `git add`. If pre-commit hooks modify files, re-stage and retry once.
- If the markdown file has fewer than 3 pending tasks, execute them directly instead of spawning agents (overhead not worth it)
- If a task is ambiguous, prefer asking the user over guessing — use `AskUserQuestion`
- Respect the project's conventions for file placement, naming, imports, and style
- Always `source venv/bin/activate` or use `uv run` before running Python
</rules>

<success_criteria>

- [ ] Markdown file parsed and pending tasks identified
- [ ] Codebase context gathered from reference docs
- [ ] Execution plan presented to user and confirmed
- [ ] All independent tasks launched in parallel per wave
- [ ] All tasks executed following project conventions
- [ ] Verification (`uv run pytest`) passes
- [ ] Pragmatist coherence review completed — cross-task consistency and codebase fit confirmed
- [ ] Markdown file updated to reflect completed items
- [ ] User sees a clear summary of what was done
      </success_criteria>
