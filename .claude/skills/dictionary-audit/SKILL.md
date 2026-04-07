---
name: dictionary-audit
description: 'Run a parallel codebase health audit across multiple concerns and produce a consolidated report. Usage: /audit [specific concerns or omit for full audit]'
argument-hint: '[specific concerns to audit, or omit for full audit]'
---

<objective>
Spawn parallel agents to audit the codebase across multiple health concerns simultaneously, then consolidate findings into a single prioritized report.

Each concern is investigated by a dedicated agent. Results are written to `.planning/audit/` and merged into a summary.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=audit`.

## 0. Parse Input

If `$ARGUMENTS` is provided, parse it into specific audit concerns. Store as `$CONCERNS`.

If `$ARGUMENTS` is empty, use the default concern set:

1. **type-suppressions** — find all `# type: ignore`, `noqa`, `cast()` and evaluate if each is still justified
2. **long-functions** — functions over 40 lines that are candidates for splitting
3. **long-modules** — Python modules over 400 lines that are candidates for splitting
4. **dead-code** — functions, classes, imports never referenced elsewhere
5. **doc-drift** — docstrings that don't match actual function signatures or behavior
6. **test-coverage-gaps** — code paths with no test coverage (modules, functions, branches)

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block.

## 1. Setup

Create the output directory:

```bash
mkdir -p .planning/audit
```

Tell the user:

- Which concerns will be audited
- How many agents will be spawned
- Ask for confirmation before proceeding

## 2. Parallel Audit

Spawn **one agent per concern** (ALL IN A SINGLE MESSAGE). Each agent:

- **subagent_type**: `general-purpose`
- **model**: `opus`
- **Role**: You are an expert code auditor specializing in {concern area}. Be thorough but practical — flag real issues, not style nitpicks.
- Gets a self-contained prompt including:
    - The full `$CODEBASE_CONTEXT`
    - Its specific concern to audit
    - Pointer to `.planning/codebase/` and `.planning/reference/` for project context
    - Instructions to write findings to `.planning/audit/{concern-slug}.md`
    - Report format:

```markdown
# Audit: {Concern Title}

**Date:** {date}
**Files scanned:** {count}

## Summary

{2-3 sentence overview of findings}

## Findings

### {severity: high/medium/low} — {finding title}

**File:** `path/to/file.py:{line}`
**Issue:** {what's wrong}
**Suggestion:** {what to do about it}

### ...

## Statistics

- Files scanned: N
- Issues found: N (high: N, medium: N, low: N)
```

Per-concern agent instructions:

### type-suppressions

- `Grep` for `# type: ignore`, `noqa`, `typing.cast` across all source files
- For each suppression: read the surrounding code, determine if it's still necessary
- Flag: unjustified suppressions, suppressions that could be replaced with proper typing

### long-functions

- Use `Grep` and `Read` to find functions over 40 lines
- For each: assess whether it has multiple responsibilities that could be split
- Skip functions that are inherently linear (e.g., serialization with sequential writes)
- Flag: functions with nested conditionals, multiple loops, or mixed concerns

### long-modules

- Check file sizes via line counts
- For modules over 400 lines: assess whether it contains distinct responsibilities
- Flag: modules with multiple unrelated classes/functions, modules that could be split along clear boundaries

### dead-code

- For each function/class in source files: `Grep` for references outside its own file
- Check `__init__.py` re-exports, API route registrations, and test imports
- Be careful: some code is referenced dynamically (route decorators, dependency injection)
- Flag: truly unreferenced code only — not false positives from dynamic dispatch

### doc-drift

- For functions with docstrings: compare parameter names in docstring vs actual signature
- Check return type descriptions against actual return types
- Flag: wrong parameter names, missing parameters, wrong descriptions

### test-coverage-gaps

- Cross-reference source modules against test files
- For each source module: check if there's a corresponding test file or test functions covering it
- Check key functions: are they tested directly or only indirectly?
- Flag: untested modules, untested public functions, untested error paths

Wait for ALL audit agents to complete.

## 3. Consolidate

Read all audit reports from `.planning/audit/`. Write `.planning/audit/SUMMARY.md`:

```markdown
# Codebase Audit Summary

**Date:** {date}
**Concerns audited:** {N}

## Overview

| Concern   | High  | Medium | Low   | Total |
| --------- | ----- | ------ | ----- | ----- |
| {concern} | N     | N      | N     | N     |
| **Total** | **N** | **N**  | **N** | **N** |

## Priority Actions

{Top 5-10 findings across all concerns, ranked by impact. Each with file path, issue, and suggested fix.}

## Reports

| Concern   | File                   | Issues |
| --------- | ---------------------- | ------ |
| {concern} | [{slug}.md]({slug}.md) | N      |
```

## 4. Pragmatist Review

Follow the procedure in `.claude/skills/_common/pragmatist-review.md`. Focus on removing false positives, downgrading inflated severity, deduplicating cross-concern overlap, and ensuring each finding is actionable. Edit `SUMMARY.md` and individual reports to reflect the review.

## 5. Report

Tell the user:

- Total issues found (high/medium/low)
- Top 5 priority actions (inline, not just pointing to the file)
- Location of full reports: `.planning/audit/`
- Suggest using `/do .planning/audit/SUMMARY.md` to work through the priority actions

</process>

<rules>
- ALL audit agents MUST be launched in a SINGLE message (true parallelism)
- Always use `model: "opus"` for audit agents — thoroughness matters
- Each agent prompt must be self-contained with the full `$CODEBASE_CONTEXT`
- Agents write findings to `.planning/audit/{concern-slug}.md` — one file per concern
- NEVER flag style preferences as issues — only flag things that affect correctness, maintainability, or reliability
- Be careful with dead-code detection — check for dynamic references (route decorators, dependency injection, `__init__` re-exports) before flagging
- After SUMMARY.md is written, auto-commit all audit output following `.claude/skills/_common/auto-commit.md`. If pre-commit hooks modify files, re-stage and retry once.
- If `$CONCERNS` specifies fewer than 2 concerns, execute directly instead of spawning agents
- Reports must include specific file paths and line numbers — not vague descriptions
- Follow project conventions from CLAUDE.md when suggesting fixes
</rules>

<success_criteria>

- [ ] Audit concerns identified (from arguments or defaults)
- [ ] Codebase context gathered from reference docs
- [ ] User confirmed before launching agents
- [ ] All audit agents launched in parallel (single message, opus model)
- [ ] Each agent wrote findings to `.planning/audit/{slug}.md` with severity ratings
- [ ] SUMMARY.md consolidates all findings with priority ranking
- [ ] Pragmatist review completed — false positives removed, priorities calibrated
- [ ] User sees: total issues, top 5 priorities, report locations
      </success_criteria>
