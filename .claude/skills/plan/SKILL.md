---
name: plan
description: 'Create an elaborate implementation plan for a specific issue based on deep codebase analysis. Usage: /plan <issue or feature description>'
argument-hint: '<issue or feature description>'
---

<objective>
Take an issue or feature description, perform deep parallel codebase analysis, and produce a comprehensive implementation plan grounded in the actual code. The plan is written to `.planning/plans/` and contains specific files, functions, line ranges, and an **execution checklist** (`- [ ]` tasks) — ready for the **`/do`** skill to execute.

**Worktree + git:** Use **Worktree Guard** first; **§2.7** commits and opens the PR after the plan is final.

This skill only plans. It never starts implementing.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=plan`.

**`/plan` default:** When asked, **recommend Yes** to create a worktree (`plan/<slug>`).

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what issue or feature they want planned. Store as `$ISSUE`.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block. Also read `.planning/STATE.md` for current progress. Focus on conventions and architecture relevant to the issue.

## 1. Deep Codebase Analysis

Spawn **3-4 parallel agents** (general-purpose), ALL IN A SINGLE MESSAGE, to investigate different aspects of the codebase relevant to `$ISSUE`. Each agent gets the full `$CODEBASE_CONTEXT` and a pointer to pre-built reference docs.

### Architecture Agent

- **Role**: You are an expert software architect with deep knowledge of the project's domain and codebase.
- **Purpose**: Trace the code paths relevant to `$ISSUE`, understand module boundaries and data flow.
- **Instructions**:
    - Start by reading files in `.planning/codebase/` and `.planning/reference/` — especially `CODEBASE_REFERENCE.md`, `PIPELINE.md`, `CONCEPT_INDEX.md`.
    - Then use `Read`, `Glob`, `Grep` to trace the specific code paths that `$ISSUE` touches.
    - Map out: which modules are involved, how data flows between them, what the entry points are, what the key functions/classes are.
    - Note function signatures, class hierarchies, and data structures that will need to change.
    - Report: module map, data flow diagram (text), key functions with file paths and line numbers.

### Patterns Agent

- **Role**: You are an expert in codebase patterns, conventions, and best practices within this project's domain.
- **Purpose**: Find similar implementations in the codebase to establish patterns to follow.
- **Instructions**:
    - Search the codebase for analogous features or similar implementations that were done before.
    - Identify naming conventions, file organization patterns, import patterns, error handling patterns.
    - Look at how similar features were tested — what test files exist, what fixtures are used, what patterns the tests follow.
    - Check `.planning/codebase/CONVENTIONS.md` and `.planning/codebase/TESTING.md` for documented patterns.
    - Report: list of analogous implementations with file paths, patterns to follow, anti-patterns to avoid.

### Dependencies Agent

- **Role**: You are an expert in dependency analysis and impact assessment for this codebase.
- **Purpose**: Map the blast radius of the proposed changes.
- **Instructions**:
    - Identify all code that depends on the modules/functions/classes that will change.
    - Use `Grep` to find all imports, function calls, and references to the affected code.
    - Find all tests that cover the affected area — list test files, test functions, fixtures.
    - Identify any configuration files, SQL migrations, or data files that may need updating.
    - Check for circular dependencies or tight coupling that could complicate the implementation.
    - Report: dependency graph (text), list of affected files with why they're affected, test coverage map.

### Prior Art Agent (optional — only spawn if `$ISSUE` involves external libraries, APIs, or techniques)

- **Role**: You are an expert researcher in the relevant technology domain.
- **Purpose**: Research best practices and reference implementations.
- **Instructions**:
    - Use `WebSearch` and `WebFetch` to find best practices, common pitfalls, and reference implementations.
    - Look for relevant library documentation, blog posts, or GitHub examples.
    - Report: key findings, recommended approaches, pitfalls to avoid, links to sources.

Each agent writes its findings as structured text (not to files — they return their findings directly).

Wait for ALL analysis agents to complete before proceeding.

## 2. Synthesize Plan

**Role**: Assume the role of a highly critical expert. Scrutinize all agent findings for accuracy, completeness, and feasibility before incorporating them into the plan. Challenge weak assumptions and flag gaps.

Using all agent findings, write a comprehensive implementation plan to `.planning/plans/plan-{slug}.md` where `{slug}` is a kebab-cased short name derived from `$ISSUE`.

### Checklist rules (`/do` compatibility)

The **`/do`** skill discovers tasks by scanning for `- [ ]` lines. To avoid pulling narrative prose into the task list:

- Put **every implementation task** as a **single line** starting with `- [ ]` under **`## Execution checklist`** only.
- In **Goal**, **Current State**, **Approach**, and **Testing Strategy**, use normal bullets (`-` or `*`) **without** `[ ]` so they are not mistaken for `/do` tasks.
- Each checklist line must be **self-contained**: include target path(s), function or region (with line numbers when known), and the action — enough for an implementer to execute without opening other sections.
- Order checklist items by dependency. Optionally group with `### Wave 1 — parallel` / `### Wave 2` when some tasks can run in parallel; keep one `- [ ]` per line inside those groups.
- Do **not** add `- [ ]` checklist items for “run the full test suite” or generic verification unless you intend `/do` to treat them as separate agent tasks; **`/do`** runs project verification after implementation. Prefer describing verification commands in **Testing Strategy** as plain bullets.

The plan file must follow this structure:

```markdown
# Plan: {descriptive title}

**Issue:** {$ISSUE}
**Created:** {date}
**Status:** Draft

## Goal

{What we're trying to achieve and why. 2-3 sentences. Use plain bullets, not `- [ ]`.}

## Current State

{What exists today based on agent findings. Reference specific files, functions, and data structures. Keep it factual — this grounds the plan in reality.}

## Approach

{High-level strategy in 2-4 sentences. Why this approach over alternatives.}

## Execution checklist

{All discrete implementation work as `- [ ]` lines, dependency order. Example:}

- [ ] Add `lib/routes/sunbi-example/namespace.ts` and `route.ts` following `lib/routes/sunbi-youtube/`; export from `namespace.ts` per RSSHub conventions.
- [ ] Run `pnpm build:routes` so `lib/registry` picks up the new route.
- [ ] Add `lib/routes/sunbi-example/route.test.ts` with msw mocks; follow patterns in `lib/setup.test.ts`.

## Testing Strategy

{Plain bullets — not `- [ ]`:}

- Which existing tests to run to catch regressions
- What new tests to write, following which patterns (reference specific test files as templates)
- Run with: `pnpm vitest run <path>` or `pnpm test` as appropriate
- Any edge cases to test specifically

## Risks & Mitigations

| Risk   | Likelihood | Impact  | Mitigation   |
| ------ | ---------- | ------- | ------------ |
| {risk} | {H/M/L}    | {H/M/L} | {mitigation} |

## Files Affected

| File                                     | Action | Purpose          |
| ---------------------------------------- | ------ | ---------------- |
| `lib/routes/sunbi-example/route.ts`      | Create | Route handler    |
| `lib/routes/sunbi-example/namespace.ts`  | Create | Namespace export |
| `lib/routes/sunbi-example/route.test.ts` | Create | Tests            |
```

## 2.5. Pragmatist Review

**Role**: You are a pragmatist who understands the whole codebase. Your job is to take the expert analysis (Step 1) and the critically synthesized plan (Step 2), and ensure the plan is practical, coherent, and will actually work in the real codebase — not just on paper.

Review the plan holistically before presenting it:

- **Feasibility**: Are the steps actually doable in the current codebase? Are there hidden dependencies, tight couplings, or technical constraints that the analysis agents missed?
- **Ordering**: Is the step order practical? Could a later step invalidate an earlier one? Are there opportunities to parallelize or simplify the sequence?
- **Blast radius honesty**: Does the "Files Affected" table capture everything? Check for indirect impacts — SQL migrations, test fixtures, data files that would need regenerating.
- **Over-engineering check**: Does the plan propose more abstraction, more files, or more indirection than the problem demands? Simplify where possible.
- **Risk calibration**: Are the risks realistic? Downgrade inflated risks, upgrade dismissed ones. Add any risks the agents missed.
- **Testing gap**: Does the testing strategy actually cover the critical paths, or just the happy path?

Edit the plan file in-place to address any issues found. Add a brief `## Pragmatist Notes` section at the bottom documenting what was adjusted and why. Confirm **Execution checklist** items are ordered correctly, unambiguous, and use `- [ ]` only in that section (plus any optional **Verification checklist** you explicitly want `/do` to execute as tasks).

## 2.7 Commit & publish (git checkpoints)

After §2.5 (plan final), follow `.claude/skills/_common/auto-finalize.md`. Stage **only** `.planning/plans/plan-{slug}.md` (unless `docs/TODO.md` also changed). Use commit subject `docs: plan: <short title> — <N> execution items`. In the PR body, set **Summary** to the plan goal + link to the plan file; **Decisions** from Pragmatist Notes (use `N/A — doc-only plan` if `pre-pr-gate.sh` requires non-empty and there are none); **Test plan:** note doc-only or `N/A`.

## 3. Report to User

Print the full plan inline in the response (so the user can read it without opening the file).

Tell the user:

- Branch / worktree path if applicable
- The plan file location (`.planning/plans/plan-{slug}.md`)
- Count of **Execution checklist** items (`- [ ]` lines)
- Number of files affected (from the table)
- Short **commit SHA** and **PR URL** from §2.7
- To run implementation with **`/do .planning/plans/plan-{slug}.md`** (or `/do` with the folder containing this file) on the **same branch**
- Ask if they want adjustments before execution

</process>

<rules>
- ALL analysis agents MUST be launched in a SINGLE message (true parallelism)
- Always use `model: "opus"` for all agents — this is a max-effort planning skill
- Each agent prompt must be detailed and self-contained with the full `$CODEBASE_CONTEXT` — agents have no shared context
- Plan file goes in `.planning/plans/` (per project convention from CLAUDE.md)
- Plans MUST reference specific files, functions, and line ranges — not vague descriptions like "update the relevant module"
- Never start implementing — this skill ONLY plans
- If `$ISSUE` is ambiguous, prefer asking the user over guessing — use `AskUserQuestion`
- The Prior Art agent is optional — only spawn it when the issue involves external libraries, APIs, or unfamiliar techniques. For purely internal refactors or features, 3 agents suffice.
- If a plan file with the same slug already exists, ask the user if they want to overwrite or use a different name
- Follow the project's conventions from CLAUDE.md when recommending file placement, naming, and patterns
- Every plan must include **`## Execution checklist`** with at least one `- [ ]` line; narrative sections must not use `- [ ]` task lines (use plain bullets) so **`/do`** parses a clean task list
- Worktree when on primary checkout; §2.7 uses `auto-finalize.md` after the plan is final
</rules>

<success_criteria>

- [ ] Issue parsed and understood (or clarified via user question)
- [ ] Codebase context gathered from reference docs (10-20 bullet points)
- [ ] 3-4 analysis agents launched in parallel (single message)
- [ ] Architecture, patterns, and dependencies thoroughly investigated
- [ ] Plan written to `.planning/plans/plan-{slug}.md`
- [ ] Plan contains specific file paths, function names, and line ranges
- [ ] **Execution checklist** present with `- [ ]` tasks only under that section (narrative sections use plain bullets)
- [ ] Checklist items ordered with dependency reasoning
- [ ] Testing strategy references `pnpm vitest` / `pnpm test` and existing test patterns
- [ ] Risks identified with mitigations
- [ ] Pragmatist review completed — plan is practical, coherent, and right-sized for the codebase
- [ ] Files affected summary table is complete
- [ ] Plan printed inline for user review
- [ ] §2.7: `auto-finalize.md` completed; PR URL reported
- [ ] User asked for adjustments before execution
      </success_criteria>
