# Auto-Commit

Standard procedure for committing work after all tasks are complete and verification passes.

## Steps

1. Stage the changed files with `git add` (specific files, not `-A`).
2. Commit with a descriptive message summarizing the work. Use the conventional commit format:
    - `feat:` for new features
    - `fix:` for bug fixes
    - `refactor:` for refactoring
    - `docs:` for documentation updates
    - `perf:` for performance improvements
    - `audit:` for audit results
    - `research:` for research output
3. If pre-commit hooks modify files during the commit attempt, re-stage the modified files and retry the commit once.
4. Do NOT use `--no-verify` to bypass hooks.

## Commit message

Use a concise message that describes the "what" and "why":

```
<type>: <summary of what changed>
```

Examples:

- `feat: implement 4 tasks from plan-xyz — add concept nodes, update register metadata`
- `fix: resolve 3 test failures from missing honorific field handling`
- `docs: update STRUCTURE.md and PIPELINE.md to reflect current module layout`
- `audit: codebase health check — 18 findings across 6 concerns`
- `research: deep dive into compound glossing strategies — 5 reports + summary`
- `perf: speed up ID generation by 35% via batch allocation`
