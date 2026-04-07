---
name: bibim-audit
description: 'Run a parallel codebase health audit across multiple concerns and produce a consolidated report. Usage: /audit [specific concerns or omit for full audit]'
argument-hint: '[specific concerns to audit, or omit for full audit]'
---

<objective>
Spawn parallel agents to audit the codebase across multiple health concerns simultaneously, then consolidate findings into a single prioritized report.

Each concern is investigated by a dedicated agent. Results are written to `docs/audit/` and merged into a summary.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=audit`.

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

Follow the procedure in `.claude/skills/bibim/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block.

## 0.75. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is "audit codebase for $CONCERNS"; the approach is "parallel agents per concern, consolidated report, synthesis review".

## 1. Setup

Create the output directory:

```bash
mkdir -p docs/audit
```

Tell the user:

- Which concerns will be audited
- How many agents will be spawned
- Ask for confirmation before proceeding

## 1.5. Classify Concern Complexity

Follow the **Classifier Pattern** in `.claude/skills/bibim/_common/model-selection.md`. Spawn a single **haiku** agent with all `$CONCERNS` descriptions. It returns a model assignment per concern:

- Pattern-matching concerns (long-functions, long-modules, dead-code, doc-drift) → typically **haiku**
- Judgment-heavy concerns (type-suppressions, test-coverage-gaps) → typically **opus**
- Custom user concerns → classifier decides based on description

Store the result as `$CONCERN_MODELS`.

## 2. Parallel Audit

Spawn **one agent per concern** (ALL IN A SINGLE MESSAGE). Each agent:

- **subagent_type**: `general-purpose`
- **model**: Use `$CONCERN_MODELS[concern]` from step 1.5
- **Role**: You are an expert code auditor specializing in {concern area}. Be thorough but practical — flag real issues, not style nitpicks.
- Gets a self-contained prompt including:
    - The full `$CODEBASE_CONTEXT`
    - Its specific concern to audit
    - Pointer to `docs/codebase/` and `docs/reference/` for project context
    - Instructions to write findings to `docs/audit/{concern-slug}.md`
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
- Check `docs/reference/TECH_DEBT.md` if it exists for known justified suppressions
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
- Check `__init__.py` re-exports, CLI entry points, and test imports
- Be careful: some code is referenced dynamically (YAML-driven, Click commands)
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

Read all audit reports from `docs/audit/`. Write `docs/audit/SUMMARY.md`:

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

## 4. Synthesis Review

Follow the procedure in `.claude/skills/bibim/_common/pragmatist-review.md`. Focus on removing false positives, calibrating severity accurately, deduplicating cross-concern overlap, and ensuring each finding is actionable. Edit `SUMMARY.md` and individual reports to reflect the review.

## 4.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N findings: N high, N medium, N low; across N concerns). Log incidents for any surprising findings that changed understanding of the codebase.

## 5. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. Stage all files in `docs/audit/`. Commit: `audit: codebase health check — N findings across N concerns`. PR title should summarize the audit.

## 6. Report

Tell the user:

- Total issues found (high/medium/low)
- Top 5 priority actions (inline, not just pointing to the file)
- Location of full reports: `docs/audit/`
- Suggest using `/do docs/audit/SUMMARY.md` to work through the priority actions
- PR URL

</process>

<rules>
- ALL audit agents MUST be launched in a SINGLE message (true parallelism)
- Use the model tier assigned by the classifier (step 1.5) — not all concerns need opus
- Each agent prompt must be self-contained with the full `$CODEBASE_CONTEXT`
- Agents write findings to `docs/audit/{concern-slug}.md` — one file per concern
- NEVER flag style preferences as issues — only flag things that affect correctness, maintainability, or reliability
- Be careful with dead-code detection — check for dynamic references (YAML-driven, Click commands, __init__ re-exports) before flagging
- If `$CONCERNS` specifies fewer than 2 concerns, execute directly instead of spawning agents
- Reports must include specific file paths and line numbers — not vague descriptions
- Follow project conventions from CLAUDE.md when suggesting fixes
</rules>

<success_criteria>

- [ ] Audit concerns identified (from arguments or defaults)
- [ ] Codebase context gathered from reference docs
- [ ] User confirmed before launching agents
- [ ] All audit agents launched in parallel (single message, opus model)
- [ ] Each agent wrote findings to `docs/audit/{slug}.md` with severity ratings
- [ ] SUMMARY.md consolidates all findings with priority ranking
- [ ] Synthesis review completed — false positives removed, priorities accurately calibrated
- [ ] State logging pre/post completed
- [ ] Auto-committed via auto-commit procedure
- [ ] PR created via auto-pr procedure
- [ ] User sees: total issues, top 5 priorities, report locations, PR URL
      </success_criteria>
      </output>
