---
name: cleanup
description: 'Merge a GitHub PR, delete the associated git worktree, and pull latest master. Usage: /cleanup [PR number or branch name]'
argument-hint: '<optional: PR number or branch name>'
---

<objective>
Merge a GitHub PR, clean up its git worktree, and pull the latest master branch. This is the standard teardown after a skill flow completes and a PR has been created.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## 1. Identify the PR

Determine the PR to merge:

1. **`$ARGUMENTS` is a PR number** (e.g., `42`, `#42`) — use it directly as `$PR`.
2. **`$ARGUMENTS` is a branch name** (e.g., `do/add-stem-classes`) — find the PR for that branch:
    ```bash
    rtk gh pr list --head "$ARGUMENTS" --json number,title,state --jq '.[0]'
    ```
3. **`$ARGUMENTS` is empty** — detect from current context:
    - If currently in a worktree, get the branch name and find its PR:
        ```bash
        BRANCH=$(git branch --show-current)
        rtk gh pr list --head "$BRANCH" --json number,title,state --jq '.[0]'
        ```
    - If on the main tree, list open PRs and ask the user which one:
        ```bash
        rtk gh pr list --json number,title,headRefName
        ```
        Use `AskUserQuestion` to ask which PR to clean up.

If no PR is found, tell the user and stop.

Store the PR number as `$PR` and the branch name as `$BRANCH`.

## 2. Update PR Description

**This is the first real action** — before merging, ensure the PR description is complete with decisions.

1. Fetch the current PR metadata and diff:

    ```bash
    rtk gh pr view $PR --json number,title,body,headRefName,commits
    rtk gh pr diff $PR
    ```

2. **Spawn a sonnet agent** to analyze the PR and generate an updated description. The agent receives the PR diff, commit messages, and current body, and returns a complete updated body with:
    - `## Summary` — 1-3 bullet points of what the PR does
    - `## Decisions` — every non-trivial decision made, each with **why** (trade-offs, alternatives considered, constraints). This is the most important section.
    - `## Test plan` — checklist of verification steps
    - The `🤖 Generated with Claude Code` footer

    If the existing body already has a good `## Decisions` section, the agent should preserve and refine it — not replace it.

3. Update the PR via REST API (do NOT use `gh pr edit`):

    ```bash
    rtk gh api repos/{owner}/{repo}/pulls/$PR -X PATCH -f body="$UPDATED_BODY"
    ```

4. Report the updated description to the user before proceeding.

## 3. Check PR Status

```bash
rtk gh pr view $PR --json state,mergeable,mergeStateStatus,statusCheckRollup,title,headRefName
```

- If the PR is already merged, skip to Step 5 (worktree cleanup).
- If the PR is closed (not merged), ask the user if they still want to clean up the worktree.
- If the PR has failing checks, warn the user and ask whether to proceed with the merge anyway.
- If the PR is not mergeable (conflicts), tell the user and stop.

## 4. Merge the PR

```bash
rtk gh pr merge $PR --merge --delete-branch
```

- Use `--merge` to preserve commit history.
- Use `--delete-branch` to remove the remote branch after merge.
- If the merge fails, show the error and stop.

Confirm the merge succeeded:

```bash
rtk gh pr view $PR --json state --jq '.state'
```

## 5. Clean Up Worktree

Find the worktree path for `$BRANCH`:

```bash
git worktree list --porcelain
```

Parse the output to find the worktree whose branch matches `$BRANCH`. Store as `$WORKTREE_PATH`.

If currently inside the worktree, change to the main tree first:

```bash
MAIN_TREE=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
cd "$MAIN_TREE"
```

Remove the worktree:

```bash
git worktree remove "$WORKTREE_PATH"
```

If the worktree removal fails (e.g., uncommitted changes), use `--force`:

- Ask the user first: "Worktree has uncommitted changes. Force remove? (yes/no)"
- Only use `git worktree remove --force "$WORKTREE_PATH"` if confirmed.

Delete the local branch (remote was already deleted by `--delete-branch`):

```bash
git branch -d "$BRANCH"
```

If `-d` fails (branch not fully merged — can happen with squash merges), use `-D`:

```bash
git branch -D "$BRANCH"
```

## 6. Update Master

```bash
git checkout master
git pull origin master
```

## 7. Report

Tell the user:

- PR #$PR merged successfully
- Worktree `$WORKTREE_PATH` removed
- Local branch `$BRANCH` deleted
- Master is up to date

</process>

<rules>
- Always use `--merge` (regular merge commit) — do not squash
- Always use `--delete-branch` to clean up remote branches
- Never force-remove a worktree without asking the user first
- If anything fails (merge, worktree removal, pull), stop and report the error clearly
- Use `git branch -d` first for local branch deletion; fall back to `-D` only if needed
- All commands must be prefixed with `rtk` per project conventions
- Do NOT create a worktree for this skill — it operates on the main tree by design
</rules>

<success_criteria>

- [ ] PR identified (from arguments or auto-detected)
- [ ] PR description updated with ## Decisions section (via sonnet agent + REST API)
- [ ] PR merged via merge commit
- [ ] Remote branch deleted
- [ ] Git worktree removed
- [ ] Local branch deleted
- [ ] Master checked out and pulled to latest
- [ ] User sees a clear summary of what was cleaned up
      </success_criteria>
