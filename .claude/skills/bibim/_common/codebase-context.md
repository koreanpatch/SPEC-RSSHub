# Codebase Context Gathering

Standard procedure for building a `$CODEBASE_CONTEXT` block before spawning agents.

## Steps

### Read reference docs (primary sources — read these first)

1. **`CLAUDE.md`** at the project root — project overview, tech stack, architecture summary, conventions, build commands, testing rules.
2. **`docs/codebase/`** — Read ALL files in this directory if it exists. These contain the authoritative project structure, stack details, conventions, and testing setup.
3. **`docs/reference/`** — Scan filenames, then read the most relevant ones for the task at hand. Key files include: `CODEBASE_REFERENCE.md` (architecture), `PIPELINE.md` (data flow), `CONCEPT_INDEX.md` (concept-to-code mapping).

### Fallback sources (only if the above don't exist or are insufficient)

4. **`docs/PROJECT.md`** — constraints, decisions, current goals.
5. **`pyproject.toml` / `package.json` / `Cargo.toml`** — dependencies and build setup.

### Distill into `$CODEBASE_CONTEXT`

Keep it concise (10-20 bullet points max) covering:

- What the project is and what it does
- Tech stack and key dependencies
- Architecture (high-level modules/packages)
- Build commands and testing commands
- Key conventions and rules that agents must follow

This context will be included in every agent's prompt so they can work correctly within the project.
