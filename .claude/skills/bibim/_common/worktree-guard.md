# Worktree Guard

Standard procedure for isolating skill work in a git worktree. **Automatically creates a fresh worktree from latest master unless already working in a non-master worktree branch.**

## Steps

1. Detect the current branch and whether we're in a worktree:

    ```bash
    CURRENT_BRANCH=$(git branch --show-current)
    MAIN_WORKTREE=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
    CURRENT_DIR=$(git rev-parse --show-toplevel)
    ```

2. **If `$CURRENT_BRANCH` is not `master` AND `$CURRENT_DIR` ≠ `$MAIN_WORKTREE`** (already in a non-master worktree): Proceed in the current directory. Tell the user: "Already on branch `$CURRENT_BRANCH` in a worktree — proceeding here."

3. **Otherwise** (on master, or in the main tree): Create a fresh worktree from latest master. Derive a short descriptive slug from the task (e.g., `add-validation-checks`, `fix-jamo-boundary`). Then:
    ```bash
    SLUG="<descriptive-slug>"
    BRANCH="$SKILL_NAME/${SLUG}"
    git fetch origin master
    git worktree add "/home/bibimb/projects/bibim_parser/.claude/worktrees/$SKILL_NAME/${SLUG}" -b "$BRANCH" origin/master
    cd "/home/bibimb/projects/bibim_parser/.claude/worktrees/$SKILL_NAME/${SLUG}"
    ```
    Then follow the setup procedure in `worktree-setup.md`.
    All subsequent work happens in the new worktree.

## Parameters

- `$SKILL_NAME` — the slash command name (e.g., `audit`, `do`, `fix-tests`, `plan`, `refactor`)
