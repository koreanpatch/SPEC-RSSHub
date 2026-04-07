---
name: bibim-phase
description: 'End-to-end phase execution: research, implement, fix tests, clean up, update docs — all in an isolated worktree with commits at every step. Usage: /phase <phase description or plan folder>'
argument-hint: '<phase description or plan folder>'
---

<objective>
Orchestrate a complete phase lifecycle in an isolated git worktree: research the problem deeply, implement all tasks (including deferred ones) in a loop, fix all tests (including pre-existing failures) in a loop, clean up research artifacts, and update stale docs. Every meaningful step gets its own commit.

This skill composes: /research, /do, /fix-tests, and /update-docs — but runs them inline (no worktree creation within sub-skills since this skill creates the worktree once at the top).
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## 0. Parse Input

Resolve `$ARGUMENTS`:

1. **`$ARGUMENTS` is a directory path** that exists and contains markdown files (e.g., `docs/plans/some-folder/`) — this is **pre-existing research**. Store the directory as `$OUTDIR` and set `$SKIP_RESEARCH` = true. Derive `$PHASE` from the folder name (de-slugify: replace hyphens with spaces).
2. **`$ARGUMENTS` is a `.md` file path** — treat the parent directory as `$OUTDIR` if it contains multiple markdown files (pre-existing research), otherwise treat `$ARGUMENTS` as a phase description. Set `$SKIP_RESEARCH` accordingly.
3. **`$ARGUMENTS` is a bare name** that matches a folder in `docs/plans/` — resolve to that folder and apply rule 1.
4. **`$ARGUMENTS` is a text description** (not a path) — this is a new phase. Store as `$PHASE`, set `$SKIP_RESEARCH` = false.
5. **`$ARGUMENTS` is empty** — use `AskUserQuestion` to ask the user what phase they want to execute. Store as `$PHASE`.

## 0.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/_common/state-logging.md`. The intent is `$PHASE`; the approach is the phase lifecycle (research → implement → test → docs).

## 1. Worktree Guard

Detect the current branch and worktree status:

```bash
CURRENT_BRANCH=$(git branch --show-current)
MAIN_WORKTREE=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
CURRENT_DIR=$(git rev-parse --show-toplevel)
```

**If `$CURRENT_BRANCH` is not `master` AND `$CURRENT_DIR` ≠ `$MAIN_WORKTREE`** (already in a non-master worktree): Proceed in the current directory. Tell the user: "Already on branch `$CURRENT_BRANCH` in a worktree — proceeding here." Store the current directory as `$WORKDIR`.

**Otherwise** (on master, or in the main tree): Create a fresh worktree from latest master:

```bash
SLUG=$(echo "$PHASE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-40)
BRANCH="phase/${SLUG}"
git fetch origin master
git worktree add "/home/bibimb/projects/bibim_parser/.claude/worktrees/phase/${SLUG}" -b "$BRANCH" origin/master
cd "/home/bibimb/projects/bibim_parser/.claude/worktrees/phase/${SLUG}"
```

Then follow the setup procedure in `.claude/skills/_common/worktree-setup.md`.
All subsequent work happens in the new worktree. Tell the user the worktree location and branch name.

Store the worktree directory as `$WORKDIR`.

## 2. Research Phase (invoke /research inline — conditional)

**If `$SKIP_RESEARCH` is true**: Skip this entire step. Tell the user: "Pre-existing research found at `$OUTDIR` — skipping /research." Proceed directly to Step 3.

**If `$SKIP_RESEARCH` is false**: Execute the `/research` skill logic **inline** for `$PHASE`. Key adaptations:

- **Skip the Worktree Guard** — we're already in a worktree.
- **Use `model: "opus"` for all research agents** (high effort).
- Follow the full /research process: gather codebase context, decompose into 4-6 angles, Phase 1 parallel research, Phase 2 parallel verification, Phase 2.5 pragmatist merge, Phase 3 summary synthesis.
- Research output goes to `$OUTDIR` = `docs/plans/{phase-slug}/`.

**Commit**: After research is complete, commit all research output:

```
research: deep dive into {$PHASE} — N reports + summary
```

## 3. Implementation Loop (invoke /do inline, repeating)

Execute the `/do` skill logic **inline** using `$OUTDIR` (either from Step 2's research output or from the pre-existing folder the user provided). Key adaptations:

- **Skip the Worktree Guard** — we're already in a worktree.
- **Input**: Point `/do` at `$OUTDIR` to find actionable items. Read all markdown files in the folder to find tasks — check for checkboxes (`- [ ]`), numbered steps, recommendations sections, or action items.
- If the folder doesn't have checkbox-style tasks, synthesize a task list from whatever structure the markdown uses (e.g., "Recommendations", "Steps", "Action Items", "Impact on This Project" sections, numbered lists, etc.).

### The Loop

Repeat until all tasks are done (including deferred items):

1. Parse pending tasks from the plan/summary.
2. Execute all pending tasks (following /do's wave-based parallel execution).
3. After each wave, update the task file to mark completed items.
4. **Commit**: After each wave of tasks completes:
    ```
    feat: implement {brief description of what this wave did}
    ```
5. Re-read the task file. If there are items marked as "deferred", "TODO", "follow-up", or "later" — **un-defer them and add them back as pending tasks**. We don't care about backwards compatibility — implement everything.
6. If there are still pending tasks (including newly un-deferred ones), loop back to step 1.
7. If all tasks are done, exit the loop.

**Important**: No task is allowed to stay deferred. Every deferred item gets implemented in subsequent loop iterations. The loop only exits when there are zero pending tasks remaining.

## 4. Test Fix Loop (invoke /fix-tests inline, repeating)

Run `make test` and fix ALL failures — including pre-existing ones that weren't caused by this phase's changes. Key adaptations:

- **Skip the Worktree Guard** — we're already in a worktree.

### The Loop

Repeat until all tests pass:

1. Run `make test -v`. Capture full output.
2. If all tests pass, exit the loop.
3. If tests fail:
    - Follow /fix-tests logic: parse failures, group by root cause, spawn parallel diagnostic agents, batch-apply fixes.
    - **Commit**: After each batch of fixes:
        ```
        fix: resolve N test failures — {brief root cause summary}
        ```
    - Loop back to step 1.

**Important**: Unlike /fix-tests which caps at 2 retries, this loop has **no retry cap**. Keep going until all tests pass. However, if the same failure persists after 3 consecutive attempts with no progress, stop and report the stuck failure to the user.

## 5. Clean Up Research Artifacts

**Only if `$SKIP_RESEARCH` is false** (i.e., we generated the research in Step 2). If the user provided pre-existing research, do NOT delete their files — skip this step entirely.

Delete the research files created in Step 2:

```bash
rm -rf $OUTDIR
```

**Commit**:

```
chore: remove research artifacts for {$PHASE}
```

## 6. Update Docs (invoke /update-docs inline, conditionally)

Check if `docs/` docs are stale by comparing their modification times against recent source code commits:

```bash
# Most recent source code commit
git log -1 --format="%ct" -- "python/src/" "*.py"
# Oldest doc modification time
stat -c "%Y" docs/codebase/*.md docs/reference/*.md 2>/dev/null | sort -n | head -1
```

If source code has commits newer than the oldest doc by more than 2 days, the docs are stale. In that case:

- Execute the `/update-docs` skill logic **inline**.
- **Skip the Worktree Guard** — we're already in a worktree.
- Follow the full /update-docs process: discover docs, staleness check, parallel update, verify, pragmatist coherence review.
- **Commit**: After docs are updated:
    ```
    docs: update stale docs/ docs to reflect current codebase
    ```

If docs are fresh, skip this step and tell the user: "Docs are up to date — skipping /update-docs."

## 6.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/_common/state-logging.md`. Complete the DECISIONS entry with the outcome. Log any incidents (test failures that needed fixing, abandoned approaches, discovered bugs).

## 7. Auto PR

Follow the procedure in `.claude/skills/_common/auto-finalize.md`. The PR title should summarize the phase (e.g., "feat: implement {$PHASE}"). Include a summary of research, implementation, and test fixes in the PR body.

## 8. Report

Tell the user:

- Phase complete
- Worktree location and branch name
- Number of commits made
- Summary of what was researched, implemented, and fixed
- Whether docs were updated
- PR URL
- Suggest: "Run `/cleanup` to merge the PR and clean up the worktree."

</process>

<rules>
- The worktree is created ONCE at the top (Step 1). All sub-skill invocations skip their own Worktree Guards.
- /research, /do, /fix-tests, and /update-docs are executed INLINE — their logic is followed directly, not by invoking the Skill tool recursively.
- Every meaningful step gets a commit. Use `make format` before staging. If pre-commit hooks modify files, re-stage and retry once.
- All commits are automatic — no asking the user before each commit.
- The implementation loop (Step 3) has NO limit — it runs until all tasks including deferred ones are done.
- The test fix loop (Step 4) has NO retry cap but detects stuck failures (same failure 3 times with no progress) and reports them.
- Pre-existing test failures are fair game — fix them all, not just the ones this phase introduced.
- We don't care about backwards compatibility — implement everything, defer nothing.
- Research artifacts are deleted after implementation and tests pass (Step 5) — but ONLY if we generated them. Never delete user-provided research.
- Doc update (Step 6) is conditional on staleness — don't update fresh docs.
- ALL parallel agent launches within sub-skills must be in SINGLE messages (true parallelism).
- Follow all project conventions from CLAUDE.md (single .bibim bundle rule, make test not make test-all, etc.).
- If the user provides a folder or extensive markdown doc as input, `$SKIP_RESEARCH` = true — jump straight to implementation. Never re-research what the user already provided.
- Use `model: "opus"` for research agents. Use default model for implementation and test-fix agents unless the task demands deep reasoning.
</rules>

<success_criteria>

- [ ] Worktree created and isolated from main tree (or reused existing non-master worktree)
- [ ] Research completed (or skipped if pre-existing research folder/doc was provided)
- [ ] All tasks implemented via /do loop — zero deferred items remaining
- [ ] Each implementation wave committed separately
- [ ] All tests passing (including pre-existing failures) via /fix-tests loop
- [ ] Each test fix batch committed separately
- [ ] Research artifacts deleted and committed
- [ ] Stale docs updated (or confirmed fresh) and committed
- [ ] PR created via auto-pr procedure
- [ ] User sees final report with branch name, commit count, summary, and PR URL
      </success_criteria>
