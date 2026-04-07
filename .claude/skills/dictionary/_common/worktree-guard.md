# Worktree Guard

Standard procedure for isolating skill work in a git worktree.

## Steps

1. Check if already in a worktree:

    ```bash
    MAIN_TREE=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
    CURRENT_DIR=$(git rev-parse --show-toplevel)
    REPO_ROOT=$(git rev-parse --show-toplevel)
    ```

2. **If `$CURRENT_DIR` != `$MAIN_TREE`** → already in a worktree. Skip to the next step.

3. **If `$CURRENT_DIR` == `$MAIN_TREE`** → on the main working tree. Use `AskUserQuestion`:
    > "You're on the main working tree (`$(git branch --show-current)`). Create a worktree to isolate this /$SKILL_NAME work? Changes can be merged back later. (yes/no)"
    - **Yes**: Derive a short descriptive slug from the task (e.g., `add-register-metadata`, `fix-compound-glossing`). Then:
        ```bash
        SLUG="<descriptive-slug>"
        BRANCH="$SKILL_NAME/${SLUG}"
        CURRENT_BRANCH=$(git branch --show-current)
        git worktree add "$REPO_ROOT/.claude/worktrees/$SKILL_NAME/${SLUG}" -b "$BRANCH" "$CURRENT_BRANCH"
        cd "$REPO_ROOT/.claude/worktrees/$SKILL_NAME/${SLUG}"
        ```
        Then follow the setup procedure in `worktree-setup.md`.
        All subsequent work happens in the new worktree.
    - **No**: Proceed in the current directory.

## Parameters

- `$SKILL_NAME` — the slash command name (e.g., `audit`, `do`, `fix-tests`, `plan`, `refactor`)
