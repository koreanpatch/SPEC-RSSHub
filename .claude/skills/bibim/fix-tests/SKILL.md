---
name: bibim-fix-tests
description: 'Run tests, identify failures, fix them, and re-run to confirm everything passes. Usage: /fix-tests or /fix-tests <specific test file or pattern>'
argument-hint: '<optional: specific test file or pattern>'
---

<objective>
Run the project's test suite (or a specific test target), analyze any failures, diagnose root causes via parallel agents, batch-apply all fixes, and re-run to confirm everything passes.

Maximum 2 retry cycles to avoid infinite loops. All diagnostic work happens in parallel; all fixes are applied as a batch before re-running tests.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=fix-tests`.

## 0. Parse Input

If `$ARGUMENTS` is provided, use it as the test target (specific file, function, or pattern — e.g., `python/tests/integration/test_pipeline.py::test_basic_parse`). Store as `$TEST_TARGET`.

If `$ARGUMENTS` is empty, use the project's default test command (determined in Step 0.5). Store `$TEST_TARGET` as empty.

## 0.5. Gather Codebase Context

Read `CLAUDE.md` at the project root for test commands and testing rules. Read `docs/codebase/TESTING.md` if it exists.

Distill into a `$CODEBASE_CONTEXT` block (keep it concise — 10-15 bullet points max) focusing on:

- **Test commands**: What commands run tests (e.g., `make test`, `make test-all`), which is the default for development
- **Testing rules and constraints**: Any hard rules (e.g., single bundle build, session-scoped fixtures, no programmatic test data)
- **Test file organization**: Where tests live, how they're structured, key fixtures
- **What NOT to do**: Explicit prohibitions (e.g., don't build bundle in tests, don't use `make test-all` unless asked)
- **Verbose flag**: Whether to use `-v` for better output
- **Expensive setup**: Any costly setup steps that should be minimized (e.g., FST compilation, bundle building)

Determine the test command:

- If `$TEST_TARGET` is set, construct the command to run that specific target (e.g., `pytest $TEST_TARGET -v`)
- If `$TEST_TARGET` is empty, use the project's default dev test command from CLAUDE.md (typically `make test`)
- Always add verbose flags for better failure output

Store as `$TEST_COMMAND`.

## 0.75. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is "fix test failures" (with `$TEST_TARGET` if specific); the approach is "diagnose in parallel, batch-fix, verify".

## 1. Run Tests

Run `$TEST_COMMAND`. Capture full output including failures, errors, and tracebacks.

If all tests pass, tell the user: "All tests pass. Nothing to fix." and stop.

Store the number of retry cycles completed as `$CYCLE` (starts at 0).

## 2. Analyze Failures

Parse the test output. For each failure, extract:

- Test name and file path
- Error type and message
- Full traceback
- The assertion or line that failed

Group failures by likely root cause — multiple test failures often share a single underlying cause. Common groupings:

- Same exception type from the same source location
- Same missing import or attribute error
- Same fixture or setup failure cascading to multiple tests

Store as a list of `$ROOT_CAUSES`, each with its associated test failures.

## 3. Diagnose Root Causes

For each unique root cause, spawn a parallel agent (ALL IN A SINGLE MESSAGE). Each agent:

- **subagent_type**: `general-purpose`
- **model**: `sonnet` (traceback analysis is structured — see `.claude/skills/bibim/_common/model-selection.md`)
- **Role**: You are an expert on the codebase and the domain being tested. Diagnose with deep understanding of the system's internals.
- Gets a detailed, self-contained prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - The failure details: test name(s), error type, message, full traceback
    - Instructions to:
        1. Read the failing test file(s) to understand what is being tested
        2. Read the source code under test (trace from the traceback)
        3. Follow the execution path to identify the root cause
        4. Check if other code paths have the same issue
        5. Propose a specific fix with exact details: file path, the old code, the new code
        6. Explain WHY the fix is correct
    - Pointer to `docs/codebase/` and `docs/reference/` docs for project context
    - Explicit instruction: **Do NOT make any changes — only diagnose and propose fixes**
    - Explicit instruction: **Check if other tests might be affected by the same root cause**

If there is only 1 root cause, skip the agent and diagnose directly instead of spawning a single agent (overhead not worth it).

Wait for ALL diagnostic agents to complete.

## 4. Apply Fixes (Batch)

**Role**: Assume the role of a highly critical expert. Scrutinize every proposed fix for correctness, side effects, and completeness before applying. Challenge assumptions and reject fixes that don't hold up under rigorous analysis.

Review all proposed fixes together before applying any:

- Check for conflicts: Do any fixes touch the same file and lines?
- Check for overlapping changes: Could one fix invalidate another?
- Check for completeness: Do the fixes address all reported failures?
- If fixes conflict, resolve the conflict using your own judgment

Apply ALL fixes at once. Do not interleave fixing and testing — this is critical for projects with expensive test setup.

## 4.5. Synthesis Review

Follow the procedure in `.claude/skills/bibim/_common/pragmatist-review.md`. Focus on cross-fix coherence, better alternatives, and side effects. Adjust fixes before re-running tests if issues are found.

## 5. Re-run Tests

Run the same `$TEST_COMMAND` as Step 1.

If all tests pass, proceed to Step 6 (report success).

If failures remain:

- Increment `$CYCLE`
- If `$CYCLE` < 2, go back to Step 2 with the new failures
- If `$CYCLE` >= 2, proceed to Step 6 (report remaining failures)

## 5.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N failures fixed, N remaining). Log every root cause as an incident — fix-tests is the primary source of INCIDENTS entries.

## 6. Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. The PR title should summarize the fixes (e.g., "fix: resolve 3 test failures from missing jamo boundary handling").

## 7. Report

Tell the user:

- How many tests were initially failing
- How many unique root causes were identified
- What was fixed (brief summary per fix — file, what changed, why)
- Final test status: all pass / N still failing
- Number of retry cycles used
- If any failures remain: describe each, explain what was tried, and suggest next steps for manual investigation
- PR URL

</process>

<rules>
- ALL diagnostic agents MUST be launched in a SINGLE message (true parallelism)
- Each agent prompt must be self-contained with the full `$CODEBASE_CONTEXT` — agents have no shared context
- NEVER do fix-then-test-then-fix-then-test cycles — batch ALL fixes, test once per cycle
- Follow the project's testing rules from CLAUDE.md strictly (e.g., single .bibim bundle rule, `make test` not `make test-all`)
- Maximum 2 retry cycles to avoid infinite loops
- Diagnostic agents must NOT make changes — only the orchestrator applies fixes
- Use verbose flags (`-v`) by default for better failure output
- If the project has expensive setup (FST compilation, bundle building), be especially careful about minimizing test runs
- If there are fewer than 2 root causes, diagnose directly instead of spawning agents
- After all fixes are applied and tests pass, auto-commit with a descriptive message summarizing the fixes (e.g., "fix: resolve 3 test failures from missing jamo boundary handling"). Use `make format` before staging, then `git add` the changed files and `git commit`. If pre-commit hooks modify files, re-stage and retry once.
- Do NOT run `make test-all` unless the user explicitly passes it as the test target
</rules>

<success_criteria>

- [ ] Codebase context gathered (test commands, rules, constraints)
- [ ] Test command determined (from arguments or CLAUDE.md defaults)
- [ ] Tests run with verbose output
- [ ] Failures parsed and grouped by root cause
- [ ] All root causes diagnosed in parallel (single message)
- [ ] All fixes applied as a batch (no fix-test-fix-test cycles)
- [ ] Synthesis review completed — cross-fix consistency confirmed, better alternatives considered
- [ ] Tests re-run to confirm fixes
- [ ] PR created via auto-pr procedure
- [ ] User sees a clear report: initial failures, fixes applied, final status, PR URL
      </success_criteria>
