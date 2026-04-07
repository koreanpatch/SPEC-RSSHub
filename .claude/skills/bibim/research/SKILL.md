---
name: bibim-research
description: "Deep-research an idea using parallel agents that write reports, verify each other's work, and produce a final summary. Usage: /research <idea or topic>"
argument-hint: '<idea or topic to research>'
---

<objective>
Take an idea or topic, decompose it into research angles, dispatch parallel agents to write detailed markdown reports, then dispatch parallel verification agents to fact-check and improve each report, and finally synthesize everything into a summary report.

All reports are written to an aptly named subdirectory under `docs/plans/` (e.g., `docs/plans/fst-optimization/`).
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=research`.

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what idea or topic they want researched. Store as `$TOPIC`.

## 0.5. Gather Codebase Context (with Freshness Check)

Before decomposing the topic, build an understanding of the current project so all research is grounded in reality. **Use pre-built reference docs first** — only fall back to scanning if they don't exist.

### Step 0.5a — Check if reference docs exist and are fresh

Run these checks:

1. **Do `docs/codebase/` and `docs/reference/` exist?**
    - If neither directory exists → skip to **Fallback sources** below, and warn the user: "No pre-built reference docs found. Research will be slower. Run `/gsd:map-codebase` to generate them for faster future research."

2. **Are the docs fresh?** Run this freshness heuristic:

    ```bash
    # Get the most recent commit date on source code (not docs/planning)
    git log -1 --format="%ci" -- "python/src/" "lib/" "app/" "pkg/" "*.py" "*.ts" "*.rs" "*.go" 2>/dev/null
    # Get the oldest modification date among reference docs
    stat -c "%Y %n" docs/codebase/*.md docs/reference/*.md 2>/dev/null | sort -n | head -1
    ```

    Compare: if **source code has commits newer than the oldest reference doc by more than 2 days**, the docs are potentially stale.

3. **If stale → warn and auto-repair:**
    - Tell the user: "Reference docs in `docs/codebase/` and `docs/reference/` appear outdated (source code has changed significantly since they were last updated). Spawning parallel agents to refresh them before proceeding with research."
    - Spawn **one agent per reference doc file** that needs updating, ALL IN A SINGLE MESSAGE. Each agent:
        - **subagent_type**: `general-purpose`
        - **model**: `opus`
        - Gets a prompt to:
            1. Read the existing doc file
            2. Read the actual source code it documents (using `Glob`, `Grep`, `Read`)
            3. Identify what's changed, missing, or wrong
            4. Update the doc in-place to reflect current reality
            5. Do NOT rewrite from scratch — update what exists
        - Focus areas per doc type:
            - `STACK.md` → verify dependencies match `pyproject.toml` / `package.json` / `Cargo.toml`
            - `CONVENTIONS.md` → spot-check a few source files to see if conventions still hold
            - `TESTING.md` → verify test file listing and fixture names match reality
            - `CODEBASE_REFERENCE.md` → verify module descriptions match current code
            - `PIPELINE.md` → verify data flow still matches actual function signatures
            - `CONCEPT_INDEX.md` → verify file paths and function names still exist
    - Wait for ALL refresh agents to complete before proceeding.
    - Tell the user: "Reference docs refreshed. Proceeding with research."

4. **If fresh → proceed normally.** Tell the user: "Reference docs are up to date."

### Step 0.5b — Read reference docs and build context

**Primary sources (read these first — they're pre-built codebase intelligence):**

1. **`docs/codebase/`** — Read ALL files in this directory. These contain the authoritative project structure, stack details, conventions, and testing setup. Typical files: `STACK.md`, `CONVENTIONS.md`, `TESTING.md`. This is the fastest path to full codebase understanding.
2. **`docs/reference/`** — Scan filenames, then read the most relevant ones for the research topic. Key files include: `CODEBASE_REFERENCE.md` (architecture), `PIPELINE.md` (data flow), `CONCEPT_INDEX.md` (concept-to-code mapping), `FORMAT.md` (binary format spec), `GLOSSARY.md` (domain terms). Don't read all of them — pick the ones relevant to `$TOPIC`.
3. **`CLAUDE.md`** at the project root — project overview, tech stack, architecture summary, conventions.

**Fallback sources (only if the above don't exist or are insufficient):**

4. **`docs/PROJECT.md`** — constraints, decisions, current goals.
5. **`docs/STATE.md`** — current progress and active work.
6. **`pyproject.toml` / `package.json` / `Cargo.toml`** — dependencies and build setup.
7. **`ls` on project root** — only if no structure docs exist.

Distill this into a `$CODEBASE_CONTEXT` block (keep it concise — 10-20 bullet points max) covering:

- What the project is and what it does
- Tech stack and key dependencies
- Architecture (high-level modules/packages)
- Current state of development (what's done, what's in progress)
- Any constraints or conventions that matter for the research topic

This context will be included in every agent's prompt so they can relate their findings back to the actual project.

## 0.75. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is "research $TOPIC"; the approach is "parallel research agents → verification agents → synthesis merge → summary".

## 1. Decompose the Topic

Use extended thinking to break `$TOPIC` into **4-6 distinct research angles**, informed by `$CODEBASE_CONTEXT`. Each angle should be:

- A meaningfully different facet of the topic
- Self-contained enough for one agent to research independently
- Specific enough to produce a focused report (not a vague overview)

For example, if the topic is "migrating from REST to GraphQL", angles might be:

1. Schema design patterns and type system
2. Performance implications (N+1 queries, batching, caching)
3. Migration strategies (incremental vs big-bang, tooling)
4. Client-side impact (code generation, state management)
5. Security considerations (query complexity, authorization)

Compute `$OUTDIR` = `docs/plans/{topic-slug}` (e.g., `docs/plans/rest-to-graphql`). Create the directory.

Write the angle breakdown to `$OUTDIR/PLAN.md`:

```markdown
# Research Plan: {$TOPIC}

**Created:** {date}
**Angles:** {N}

## Codebase Context

{$CODEBASE_CONTEXT — the distilled bullet points from Step 0.5}

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
- **Role**: You are an expert researcher in the domain of this research angle. Bring deep domain knowledge and analytical rigor to your investigation.
- Gets a detailed prompt including:
    - The full `$CODEBASE_CONTEXT` block so it understands the project
    - The overall topic for context
    - Its specific angle to research
    - Instruction: relate findings to the actual codebase — what applies, what doesn't, what would need to change. Be specific about which parts of the project are affected.
    - Pointer to pre-built reference docs: "For detailed codebase information, read files in `docs/codebase/` (structure, stack, conventions, testing) and `docs/reference/` (architecture, pipeline, concepts, formats, glossary). Use these instead of scanning the codebase from scratch."
    - Instructions to write a thorough markdown report (1000-3000 words)
    - Must use `WebSearch` and `WebFetch` to find current information
    - Must also use `Read`, `Glob`, `Grep` to examine relevant parts of the codebase when the angle touches existing code — but check `docs/codebase/` and `docs/reference/` first as they likely have the answer
    - Must cite sources where possible
    - Must write its report to `$OUTDIR/{nn}-{angle-slug}.md` where `nn` is zero-padded index
    - Report format:

        ```
        # {Angle Title}
        > Part of research into: {$TOPIC}

        ## Key Findings
        {bulleted summary of most important discoveries}

        ## Deep Dive
        {detailed analysis with sections as appropriate}

        ## Relevance to This Project
        {How these findings apply to the current codebase. Reference specific files, modules, or patterns. What would need to change? What already aligns? What are the gaps?}

        ## Sources
        {list of sources consulted}
        ```

Wait for ALL research agents to complete.

## 3. Phase 2 — Parallel Verification

Spawn **one verification Agent per report**, ALL IN A SINGLE MESSAGE (maximally parallel). Each verification agent:

- **subagent_type**: `general-purpose`
- **model**: `opus` (max effort)
- **Role**: You are a highly critical expert in this research domain. Your job is to rigorously fact-check, challenge assumptions, identify gaps, and hold the report to the highest standards of accuracy and depth.
- Gets a detailed prompt including:
    - The full `$CODEBASE_CONTEXT` block so it can verify codebase claims
    - The overall topic
    - The angle this report covers
    - Instruction to READ the report file written in Phase 1
    - Verification checklist:
        - **Accuracy**: Are claims correct? Cross-check key facts with web searches.
        - **Codebase claims**: Does the "Relevance to This Project" section accurately describe the codebase? First check `docs/codebase/` and `docs/reference/` docs for authoritative answers, then use `Read`, `Glob`, `Grep` to verify any file paths, module names, or architectural claims. Fix any that are wrong.
        - **Completeness**: Are there important aspects of this angle that were missed?
        - **Clarity**: Is the report well-structured and easy to follow?
        - **Depth**: Does it go beyond surface-level? Are there concrete examples, numbers, or comparisons?
        - **Sources**: Are sources real and relevant? Check at least 2-3 cited sources.
    - Must EDIT the report in-place to:
        - Correct any inaccuracies found (both factual and codebase-related)
        - Add missing important information
        - Improve clarity where needed
        - Add a `## Verification Notes` section at the bottom documenting what was checked and what was changed
    - Must NOT rewrite the report from scratch — improve what exists

Wait for ALL verification agents to complete.

## 3.5. Phase 2.5 — Synthesis Merge

Spawn **one synthesis Agent per report**, ALL IN A SINGLE MESSAGE (maximally parallel). Each synthesis agent:

- **subagent_type**: `general-purpose`
- **model**: `sonnet` (merge/edit work, not deep analysis — see `.claude/skills/bibim/_common/model-selection.md`)
- **Role**: You are a domain synthesizer who understands the whole codebase. Your job is to take the expert research (Phase 1) and the critical verification (Phase 2) for this angle, find the best synthesis of their perspectives, and ensure the report is coherent, complete, and actionable for the actual codebase.
- Gets a detailed prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - The overall topic and this angle's scope
    - Instruction to READ the report file (which now contains both the original research and verification notes)
    - Synthesis checklist:
        - **Expert vs critic tensions**: Where the original research and the verifier's corrections conflict, find the synthesis that is most correct and most useful — default to the more complete perspective, not the more conservative one.
        - **Actionability**: Ensure theoretical points connect to concrete actions for this project. Add practical next steps if missing.
        - **Codebase coherence**: Do the recommendations fit the existing architecture, patterns, and conventions? Prefer recommendations that leverage existing infrastructure.
        - **Cross-angle awareness**: Consider how this angle's conclusions might interact with other angles' findings. Note potential synergies or conflicts.
        - **Depth calibration**: Expand under-explored sections that matter for the codebase; depth should be proportional to importance for this project.
    - Must EDIT the report in-place to:
        - Resolve expert/critic tensions with the most complete and useful verdict
        - Add a `## Synthesis Notes` section documenting key trade-off decisions and what was adjusted
        - Ensure the "Relevance to This Project" section contains concrete, actionable guidance
    - Must NOT rewrite the report from scratch — refine what exists

Wait for ALL synthesis agents to complete.

## 4. Phase 3 — Summary Synthesis

Read ALL verified and pragmatist-reviewed reports from `$OUTDIR/`. Then write `$OUTDIR/SUMMARY.md`:

```markdown
# Research Summary: {$TOPIC}

**Date:** {date}
**Reports:** {N} angles researched and verified

## Executive Summary

{3-5 paragraph synthesis of the most important findings across all angles. This should tell a coherent story, not just list bullets from each report.}

## Key Findings by Angle

### {Angle 1 Title}

{2-4 bullet points of the most important findings}

### {Angle 2 Title}

{2-4 bullet points of the most important findings}

...

## Cross-Cutting Themes

{Patterns, tensions, or insights that emerged across multiple angles}

## Recommendations

{If applicable: actionable next steps based on the research}

## Impact on This Project

{Concrete summary of how the research applies to the current codebase. What files/modules would be affected? What's the suggested order of changes? What existing patterns align or conflict with the findings?}

## Reports Index

| #   | Angle   | File                     |
| --- | ------- | ------------------------ |
| 1   | {title} | [{filename}]({filename}) |
| 2   | {title} | [{filename}]({filename}) |

...
```

## 4.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N angles researched, N reports verified, key findings summary). Log incidents for any research angles that produced surprising or contradictory results.

## 5. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. Stage all files in `$OUTDIR`. Commit: `research: deep dive into $TOPIC — N reports + summary`. PR title should summarize the research.

## 6. Report to User

Tell the user:

- Research complete
- Number of reports written and verified
- Location: `$OUTDIR/`
- Print the Executive Summary from SUMMARY.md directly in the response
- List the files created
- PR URL

</process>

<rules>
- ALL research agents in Phase 1 MUST be launched in a SINGLE message (true parallelism)
- ALL verification agents in Phase 2 MUST be launched in a SINGLE message (true parallelism)
- ALL pragmatist agents in Phase 2.5 MUST be launched in a SINGLE message (true parallelism)
- Use `model: "opus"` for Phase 1 (research) and Phase 2 (verification) agents. Use `model: "sonnet"` for Phase 2.5 (pragmatist) agents.
- Never launch Phase 2 until ALL Phase 1 agents have returned
- Never launch Phase 2.5 until ALL Phase 2 agents have returned
- Verification agents must READ the actual report file, not receive the content in their prompt
- Reports go in `$OUTDIR` (`docs/plans/{topic-slug}/`). Each run gets its own aptly named subdirectory
- Each agent prompt must be detailed and self-contained — agents have no shared context
- After SUMMARY.md is written, auto-commit via the standard auto-commit procedure
</rules>

<success_criteria>

- [ ] Reference docs freshness checked; if stale, refreshed via parallel agents before proceeding
- [ ] Output directory created (`docs/plans/{slug}/`)
- [ ] Topic decomposed into 4-6 meaningful angles
- [ ] PLAN.md written before agents launch
- [ ] All research agents launched in parallel (single message)
- [ ] All reports written as individual markdown files
- [ ] All verification agents launched in parallel (single message)
- [ ] Each report verified and improved in-place
- [ ] All synthesis agents launched in parallel (single message)
- [ ] Each report synthesis-reviewed — tensions resolved with best verdict, actionability confirmed, codebase coherence ensured
- [ ] SUMMARY.md synthesizes all findings coherently
- [ ] State logging pre/post completed
- [ ] Auto-committed via auto-commit procedure
- [ ] PR created via auto-pr procedure
- [ ] User sees the executive summary, file listing, and PR URL
      </success_criteria>
