# Auto-Finalize

Standard procedure for committing work, pushing, and creating a GitHub pull request.

## When to Run

After all changes are applied and verification passes.

## Steps

### 1. Commit

1. Run `make format` to pre-apply formatting fixes.
2. Stage changed files with `git add` (specific files, not `-A`).
3. Commit with conventional format (`feat:`, `fix:`, `refactor:`, `docs:`, `perf:`, `audit:`, `research:`).
4. If pre-commit hooks modify files, re-stage and retry once. Never use `--no-verify`.

### 2. Push & Create PR

1. Push the branch:

    ```bash
    BRANCH=$(git branch --show-current)
    rtk git push -u origin "$BRANCH"
    ```

2. Create a pull request:

    ```bash
    rtk gh pr create --title "<type>: <short summary>" --body "$(cat <<'EOF'
    ## Summary
    <1-3 bullet points summarizing what this PR does>

    ## Decisions
    <Each decision made during this PR, with WHY>
    - **<decision>** — <reason / trade-off / constraint that drove it>
    - ...

    ## Test plan
    - [ ] `make test` passes
    - [ ] `make lint` passes

    🤖 Generated with [Claude Code](https://claude.com/claude-code)
    EOF
    )"
    ```

    - PR title: conventional commit style, under 70 characters
    - `## Decisions` is **mandatory** (enforced by `pre-pr-gate.sh`). Document every non-trivial choice and why.
    - Summary: 1-3 bullet points

3. Store the PR URL as `$PR_URL` and report it to the user.

## Updating an Existing PR

Do NOT use `gh pr edit` — broken by GitHub Projects Classic deprecation. Use REST API:

```bash
rtk gh api repos/{owner}/{repo}/pulls/{number} -X PATCH -f body="..." -f title="..."
```

## Notes

- Always use `--merge` strategy (not squash)
- PR targets the default base branch (master)
- If push or PR creation fails, report error and stop
