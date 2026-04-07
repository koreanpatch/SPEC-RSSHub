# Worktree Setup

Standard procedure for initializing a git worktree with Python environment and pre-commit hooks.

## When to run

After creating a new worktree (via worktree-guard or manually), run this setup before any other work.

## Steps

```bash
cd "$WORKTREE_PATH"
uv sync --extra dev
uv run pre-commit install
```

This ensures:

- Full Python environment with dev dependencies (ruff, pyright, pytest, etc.)
- Pre-commit hooks active for the worktree

## Notes

- `uv sync` is fast (~2-3s) because uv reuses its global cache
- Each worktree gets its own `.venv` — no symlinks or sharing needed
- The `VIRTUAL_ENV` warning from the parent shell is harmless and can be ignored
