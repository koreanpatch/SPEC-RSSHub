# Codebase Context Gathering

Standard procedure for building a `$CODEBASE_CONTEXT` block before spawning agents.

## Steps

### Read reference docs (primary sources — read these first)

1. **`CLAUDE.md`** at the project root — project overview, tech stack, architecture summary, conventions, build commands, testing rules.
2. **`.planning/codebase/`** — Read ALL files in this directory if it exists. These contain the authoritative project structure, stack details, conventions, and testing setup.
3. **`.planning/reference/`** — Scan filenames, then read the most relevant ones for the task at hand. Key files include: `CODEBASE_REFERENCE.md` (architecture), `PIPELINE.md` (data flow), `CONCEPT_INDEX.md` (concept-to-code mapping).

### Fallback sources (only if the above don't exist or are insufficient)

4. **`.planning/PROJECT.md`** — constraints, decisions, current goals.
5. **`requirements.txt`** — Python dependencies and stack.
6. **`Makefile`** — available commands and build targets.

### Distill into `$CODEBASE_CONTEXT`

Keep it concise (10-20 bullet points max) covering:

- What the project is and what it does
- Tech stack and key dependencies
- Architecture (high-level modules/packages — concept layer, entry layer, morpheme layer, parser layer)
- Build commands and testing commands
- Key conventions and rules that agents must follow (ID format, register metadata, compound glossing thresholds)

This context will be included in every agent's prompt so they can work correctly within the project.
