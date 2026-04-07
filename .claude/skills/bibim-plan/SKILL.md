---
name: bibim-plan
description: 'Create an elaborate implementation plan for a specific issue based on deep codebase analysis. Usage: /plan <issue or feature description>'
argument-hint: '<issue or feature description>'
---

<objective>
Take an issue or feature description, perform deep parallel codebase analysis, and produce a comprehensive implementation plan grounded in the actual code. The plan is written to `docs/plans/` and contains specific files, functions, line ranges, and ordered steps — ready for execution.

This skill only plans. It never starts implementing.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=plan`.

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what issue or feature they want planned. Store as `$ISSUE`.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block. Also read `docs/STATE.md` for current progress. Focus on conventions and architecture relevant to the issue.

## 1. Deep Codebase Analysis

Spawn **3-4 parallel agents** (general-purpose), ALL IN A SINGLE MESSAGE, to investigate different aspects of the codebase relevant to `$ISSUE`. Each agent gets the full `$CODEBASE_CONTEXT` and a pointer to pre-built reference docs.

### Architecture Agent

- **Role**: You are an expert software architect with deep knowledge of the project's domain and codebase.
- **Purpose**: Trace the code paths relevant to `$ISSUE`, understand module boundaries and data flow.
- **Instructions**:
    - Start by reading files in `docs/codebase/` and `docs/reference/` — especially `CODEBASE_REFERENCE.md`, `PIPELINE.md`, `CONCEPT_INDEX.md`.
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
    - Check `docs/codebase/CONVENTIONS.md` and `docs/codebase/TESTING.md` for documented patterns.
    - Report: list of analogous implementations with file paths, patterns to follow, anti-patterns to avoid.

### Dependencies Agent

- **Role**: You are an expert in dependency analysis and impact assessment for this codebase.
- **Purpose**: Map the blast radius of the proposed changes.
- **Instructions**:
    - Identify all code that depends on the modules/functions/classes that will change.
    - Use `Grep` to find all imports, function calls, and references to the affected code.
    - Find all tests that cover the affected area — list test files, test functions, fixtures.
    - Identify any configuration files, YAML definitions, or data files that may need updating.
    - Check for circular dependencies or tight coupling that could complicate the implementation.
    - Report: dependency graph (text), list of affected files with why they're affected, test coverage map.

### Prior Art Agent (optional — only spawn if `$ISSUE` involves external libraries, APIs, or techniques)

- **model**: `sonnet` (web search + summarize — see `.claude/skills/_common/model-selection.md`)
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

Using all agent findings, write a comprehensive implementation plan to `docs/plans/plan-{slug}.md` where `{slug}` is a kebab-cased short name derived from `$ISSUE`.

The plan file must follow this structure:

```markdown
# Plan: {descriptive title}

**Issue:** {$ISSUE}
**Created:** {date}
**Status:** Draft

## Goal

{What we're trying to achieve and why. 2-3 sentences.}

## Current State

{What exists today based on agent findings. Reference specific files, functions, and data structures. Keep it factual — this grounds the plan in reality.}

## Approach

{High-level strategy in 2-4 sentences. Why this approach over alternatives.}

## Detailed Steps

{Numbered, ordered steps. Each step includes:}

### Step 1: {title}

**Files:** `path/to/file.py` (modify), `path/to/new_file.py` (create)

{What to do and why. Be specific:}

- Add function `foo()` to `module.py` following the pattern in `similar_module.py`
- Modify class `Bar` to accept new parameter `baz`
- Update YAML schema in `data/config.yaml` to include new field

**Why this order:** {dependency explanation if relevant}

### Step 2: {title}

...

## Testing Strategy

{How to verify the implementation:}

- Which existing tests to run to catch regressions
- What new tests to write, following which patterns (reference specific test files as templates)
- Which `make` target to use for validation
- Any edge cases to test specifically

## Risks & Mitigations

| Risk   | Likelihood | Impact  | Mitigation   |
| ------ | ---------- | ------- | ------------ |
| {risk} | {H/M/L}    | {H/M/L} | {mitigation} |

## Files Affected

| File                                 | Action | Purpose              |
| ------------------------------------ | ------ | -------------------- |
| `python/src/module/file.py`          | Modify | Add new function     |
| `python/src/module/new.py`           | Create | New module for X     |
| `python/tests/integration/test_x.py` | Create | Test new feature     |
| `data/config.yaml`                   | Modify | Add new schema field |
```

## 2.25. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/_common/state-logging.md`. The intent is `$ISSUE`; the approach is the plan's high-level strategy from Step 2.

## 2.5. Synthesis Review

**Role**: You are a domain synthesizer who understands the whole codebase. Your job is to take the expert analysis (Step 1) and the critically synthesized plan (Step 2), and ensure the plan is coherent, complete, and will actually work in the real codebase — finding the best implementation approach, not just the safest one.

Review the plan holistically before presenting it:

- **Feasibility**: Are the steps actually doable in the current codebase? Are there hidden dependencies, tight couplings, or technical constraints that the analysis agents missed?
- **Ordering**: Is the step order practical? Could a later step invalidate an earlier one? Are there opportunities to parallelize the sequence?
- **Blast radius honesty**: Does the "Files Affected" table capture everything? Check for indirect impacts — config files, test fixtures, YAML schemas, generated files that would need regenerating.
- **Better approach**: Is there a more elegant way to implement the plan using patterns and infrastructure already present in the codebase? Look for synergies with existing code.
- **Risk calibration**: Are the risks realistic? Downgrade inflated risks, upgrade dismissed ones. Add any risks the agents missed.
- **Testing gap**: Does the testing strategy actually cover the critical paths, or just the happy path?

Edit the plan file in-place to address any issues found. Add a brief `## Synthesis Notes` section at the bottom documenting what was adjusted and why.

## 2.75. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (plan location, number of steps, key architectural choices). Plan skill rarely generates incidents — only log if analysis agents returned conflicting findings that required judgment to resolve.

## 3. Auto PR

Follow the procedure in `.claude/skills/_common/auto-finalize.md`. The PR title should describe the plan (e.g., "docs: implementation plan for X"). Include the plan summary in the PR body.

## 4. Report to User

Print the full plan inline in the response (so the user can read it without opening the file).

Tell the user:

- The plan file location (`docs/plans/plan-{slug}.md`)
- Number of steps
- Number of files affected
- PR URL
- Ask if they want adjustments before execution

</process>

<rules>
- ALL analysis agents MUST be launched in a SINGLE message (true parallelism)
- Use `model: "opus"` for Architecture agent (deep module understanding). Use `model: "sonnet"` for Patterns agent (grep + enumeration) and Dependencies agent (import graph mapping). Prior Art agent is already sonnet.
- Each agent prompt must be detailed and self-contained with the full `$CODEBASE_CONTEXT` — agents have no shared context
- Plan file goes in `docs/plans/` (per project convention from CLAUDE.md)
- Plans MUST reference specific files, functions, and line ranges — not vague descriptions like "update the relevant module"
- Never start implementing — this skill ONLY plans
- If `$ISSUE` is ambiguous, prefer asking the user over guessing — use `AskUserQuestion`
- The Prior Art agent is optional — only spawn it when the issue involves external libraries, APIs, or unfamiliar techniques. For purely internal refactors or features, 3 agents suffice.
- If a plan file with the same slug already exists, ask the user if they want to overwrite or use a different name
- Follow the project's conventions from CLAUDE.md when recommending file placement, naming, and patterns
</rules>

<success_criteria>

- [ ] Issue parsed and understood (or clarified via user question)
- [ ] Codebase context gathered from reference docs (10-20 bullet points)
- [ ] 3-4 analysis agents launched in parallel (single message)
- [ ] Architecture, patterns, and dependencies thoroughly investigated
- [ ] Plan written to `docs/plans/plan-{slug}.md`
- [ ] Plan contains specific file paths, function names, and line ranges
- [ ] Steps are ordered with dependency reasoning
- [ ] Testing strategy references existing test patterns
- [ ] Risks identified with mitigations
- [ ] Synthesis review completed — plan is coherent, complete, and uses the best available approach for this codebase
- [ ] Files affected summary table is complete
- [ ] Plan printed inline for user review
- [ ] PR created via auto-pr procedure
- [ ] User asked for adjustments before execution
      </success_criteria>
      </output>
