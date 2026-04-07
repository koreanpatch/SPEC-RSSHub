# Parallel Agent Rules

Standard rules for spawning and managing parallel agents in skills.

## Launch Rules

- ALL agents within a wave MUST be launched in a SINGLE message (true parallelism).
- Never launch Wave N+1 until ALL Wave N agents have returned.
- Each agent prompt must be detailed and self-contained — agents have no shared context.
- Include the full `$CODEBASE_CONTEXT` block in every agent prompt.
- Point agents to `.planning/codebase/` and `.planning/reference/` for project context instead of scanning from scratch.

## Agent Prompt Template

Each agent should receive:

- Its specific task description and any file context
- The full `$CODEBASE_CONTEXT` block
- Clear instruction on what "done" looks like
- Instructions to follow project conventions (from CLAUDE.md)
- Instructions to report back: what files were created/modified, what was done, any issues

## Testing Rules

- Agents must NOT run the full test suite — only the orchestrator runs verification after all work is done.
- The default test command is `uv run pytest`. Run specific test files or directories when verifying targeted changes.
- Always activate the virtualenv before running Python: `source venv/bin/activate` (or use `uv run`).

## Threshold

- If there are fewer than 3 tasks, execute them directly instead of spawning agents (overhead not worth it).
- If there is only 1 root cause / concern / task, skip the agent and work directly.
