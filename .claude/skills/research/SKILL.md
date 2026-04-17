---
name: research
description: "Deep-research an idea using parallel agents that write reports, verify each other's work, and produce a final summary. Usage: /research <idea or topic>"
argument-hint: '<idea or topic to research>'
---

<objective>
Take an idea or topic, decompose it into research angles, dispatch parallel agents to write detailed markdown reports, then dispatch parallel verification agents to fact-check and improve each report, and finally synthesize everything into a summary report.

All reports are written to an aptly named subdirectory under `.planning/plans/` (e.g., `.planning/plans/register-variation/`).
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=research`.

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what idea or topic they want researched. Store as `$TOPIC`.

## 0.5. Gather Codebase Context (with Freshness Check)

Before decomposing the topic, build an understanding of the current project so all research is grounded in reality. **Use pre-built reference docs first** — only fall back to scanning if they don't exist.

### Step 0.5a — Check if reference docs exist and are fresh

Run these checks:

1. **Do `.planning/codebase/` and `.planning/reference/` exist?**
    - If neither directory exists → skip to **Fallback sources** below, and warn the user: "No pre-built reference docs found. Research will be slower. Consider creating them for faster future research."

2. **Are the docs fresh?** Run this freshness heuristic:

    ```bash
    # Get the most recent commit date on source code (not docs/planning)
    git log -1 --format="%ci" -- "app/" "scripts/" "logic/" "schema/" "*.py" "*.ts" 2>/dev/null
    # Get the oldest modification date among reference docs
    stat -c "%Y %n" .planning/codebase/*.md .planning/reference/*.md 2>/dev/null | sort -n | head -1
    ```

    Compare: if **source code has commits newer than the oldest reference doc by more than 2 days**, the docs are potentially stale.

3. **If stale → warn and auto-repair:**
    - Tell the user: "Reference docs in `.planning/codebase/` and `.planning/reference/` appear outdated. Spawning parallel agents to refresh them before proceeding with research."
    - Spawn **one agent per reference doc file** that needs updating, ALL IN A SINGLE MESSAGE. Each agent reads the existing doc, reads the actual source code it documents, identifies what's changed, and updates the doc in-place.
    - Wait for ALL refresh agents to complete before proceeding.
    - Tell the user: "Reference docs refreshed. Proceeding with research."

4. **If fresh → proceed normally.**

### Step 0.5b — Read reference docs and build context

**Primary sources (read these first):**

1. **`.planning/codebase/`** — Read ALL files in this directory.
2. **`.planning/reference/`** — Read the most relevant ones for `$TOPIC`.
3. **`CLAUDE.md`** at the project root.

**Fallback sources:**

4. **`.planning/PROJECT.md`** — constraints, decisions, current goals.
5. **`.planning/STATE.md`** — current progress and active work.
6. **`requirements.txt`** / **`Makefile`** — dependencies and build setup.

Distill into a `$CODEBASE_CONTEXT` block (10-20 bullet points max).

## 1. Decompose the Topic

Use extended thinking to break `$TOPIC` into **4-6 distinct research angles**, informed by `$CODEBASE_CONTEXT`. Each angle should be:

- A meaningfully different facet of the topic
- Self-contained enough for one agent to research independently
- Specific enough to produce a focused report (not a vague overview)

Compute `$OUTDIR` = `.planning/plans/{topic-slug}`. Create the directory.

Write the angle breakdown to `$OUTDIR/PLAN.md`:

```markdown
# Research Plan: {$TOPIC}

**Created:** {date}
**Angles:** {N}

## Codebase Context

{$CODEBASE_CONTEXT}

## Angles

1. **{angle title}** — {one-line scope description}
2. **{angle title}** — {one-line scope description}
   ...
```

Tell the user the plan and the number of agents that will be spawned (N research + N verification = 2N total).

## 2. Phase 1 — Parallel Research

Spawn **one Agent per angle**, ALL IN A SINGLE MESSAGE (maximally parallel). Each agent:

- **subagent_type**: `general-purpose`
- **model**: `opus` (max effort)
- **Role**: You are an expert researcher in the domain of this research angle.
- Gets a detailed prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - The overall topic for context
    - Its specific angle to research
    - Instruction: relate findings to the actual codebase — what applies, what doesn't, what would need to change
    - Pointer to `.planning/codebase/` and `.planning/reference/` for codebase detail
    - Instructions to write a thorough markdown report (1000-3000 words)
    - Must use `WebSearch` and `WebFetch` to find current information
    - Must also use `Read`, `Glob`, `Grep` to examine relevant parts of the codebase
    - Must write its report to `$OUTDIR/{nn}-{angle-slug}.md`
    - Report format:

        ```
        # {Angle Title}
        > Part of research into: {$TOPIC}

        ## Key Findings
        {bulleted summary of most important discoveries}

        ## Deep Dive
        {detailed analysis with sections as appropriate}

        ## Relevance to This Project
        {How these findings apply to the current codebase. Reference specific files, modules, or patterns.}

        ## Sources
        {list of sources consulted}
        ```

Wait for ALL research agents to complete.

## 3. Phase 2 — Parallel Verification

Spawn **one verification Agent per report**, ALL IN A SINGLE MESSAGE (maximally parallel). Each verification agent:

- **subagent_type**: `general-purpose`
- **model**: `opus`
- **Role**: You are a highly critical expert. Fact-check, challenge assumptions, identify gaps.
- Verification checklist:
    - **Accuracy**: Are claims correct? Cross-check key facts with web searches.
    - **Codebase claims**: Does the "Relevance to This Project" section accurately describe the codebase?
    - **Completeness**: Are there important aspects of this angle that were missed?
    - **Depth**: Does it go beyond surface-level?
- Must EDIT the report in-place to correct inaccuracies, add missing information, improve clarity.
- Must add a `## Verification Notes` section at the bottom.

Wait for ALL verification agents to complete.

## 3.5. Phase 2.5 — Pragmatist Merge

Spawn **one pragmatist Agent per report**, ALL IN A SINGLE MESSAGE (maximally parallel). Each pragmatist agent:

- **subagent_type**: `general-purpose`
- **model**: `opus`
- **Role**: You are a pragmatist who understands the whole codebase.
- Pragmatist checklist:
    - **Expert vs critic tensions**: Resolve conflicts between original research and verifier's corrections.
    - **Actionability**: Strip theoretical points that don't translate to concrete actions.
    - **Codebase coherence**: Do recommendations fit the existing architecture?
    - **Right-sizing**: Trim over-analyzed tangents; expand under-explored sections that matter.
- Must EDIT the report in-place.
- Must add a `## Pragmatist Notes` section.

Wait for ALL pragmatist agents to complete.

## 4. Phase 3 — Summary Synthesis

Read ALL verified and pragmatist-reviewed reports from `$OUTDIR/`. Then write `$OUTDIR/SUMMARY.md`:

```markdown
# Research Summary: {$TOPIC}

**Date:** {date}
**Reports:** {N} angles researched and verified

## Executive Summary

{3-5 paragraph synthesis of the most important findings across all angles.}

## Key Findings by Angle

### {Angle 1 Title}

{2-4 bullet points}

...

## Cross-Cutting Themes

{Patterns, tensions, or insights that emerged across multiple angles}

## Recommendations

{Actionable next steps based on the research}

## Impact on This Project

{Concrete summary of how the research applies to the current codebase.}

## Reports Index

| #   | Angle   | File                     |
| --- | ------- | ------------------------ |
| 1   | {title} | [{filename}]({filename}) |

...
```

## 5. Report to User

Tell the user:

- Research complete
- Number of reports written and verified
- Location: `$OUTDIR/`
- Print the Executive Summary from SUMMARY.md directly in the response
- List the files created

</process>

<rules>
- ALL research agents in Phase 1 MUST be launched in a SINGLE message (true parallelism)
- ALL verification agents in Phase 2 MUST be launched in a SINGLE message (true parallelism)
- ALL pragmatist agents in Phase 2.5 MUST be launched in a SINGLE message (true parallelism)
- Always use `model: "opus"` for all agents — this is a max-effort research skill
- Never launch Phase 2 until ALL Phase 1 agents have returned
- Never launch Phase 2.5 until ALL Phase 2 agents have returned
- Verification agents must READ the actual report file, not receive the content in their prompt
- Reports go in `$OUTDIR` (`.planning/plans/{topic-slug}/`). Each run gets its own aptly named subdirectory
- Each agent prompt must be detailed and self-contained — agents have no shared context
- After SUMMARY.md is written, auto-commit all research output following `.claude/skills/_common/auto-commit.md`. If pre-commit hooks modify files, re-stage and retry once.
</rules>

<success_criteria>

- [ ] Reference docs freshness checked; if stale, refreshed via parallel agents before proceeding
- [ ] Output directory created (`.planning/plans/{slug}/`)
- [ ] Topic decomposed into 4-6 meaningful angles
- [ ] PLAN.md written before agents launch
- [ ] All research agents launched in parallel (single message)
- [ ] All reports written as individual markdown files
- [ ] All verification agents launched in parallel (single message)
- [ ] Each report verified and improved in-place
- [ ] All pragmatist agents launched in parallel (single message)
- [ ] Each report pragmatist-reviewed — tensions resolved, actionability confirmed, codebase coherence ensured
- [ ] SUMMARY.md synthesizes all findings coherently
- [ ] User sees the executive summary and file listing
      </success_criteria>
