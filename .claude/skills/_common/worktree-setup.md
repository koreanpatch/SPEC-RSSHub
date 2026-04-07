# Worktree Setup

Standard procedure for initializing a git worktree with the Python environment.

## When to run

After creating a new worktree (via worktree-guard or manually), run this setup before any other work.

## Steps

```bash
cd "$WORKTREE_PATH"
uv pip install -r requirements.txt
```

This ensures the full Python environment is available in the worktree.

## Notes

- `uv pip install` is fast because uv reuses its global cache
- The `VIRTUAL_ENV` warning from the parent shell is harmless and can be ignored
- The venv lives in the worktree's directory under `.venv`
