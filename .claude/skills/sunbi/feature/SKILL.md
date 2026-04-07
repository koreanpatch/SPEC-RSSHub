---
name: sunbi-feature
description: 'Research, spec, gate, build, and document a new Sunbi feature or fix. Usage: /feature <plain English description>'
argument-hint: '<what you want to add or fix>'
---

<objective>
Take a plain-English feature request, research the codebase, write a spec,
get approval, build it, verify it, and update all documentation. This is the
primary workflow for adding anything to Sunbi.
</objective>

<context>
User request: $ARGUMENTS
</context>

<process>

## 0. Orient

Read in order — do not skip:

1. `AGENTS.md` and `docs/dev/architecture/overview.md` (architecture rules and constraints)
2. `docs/dev/README.md` (navigation index)
3. `docs/dev/components/_index.md` (find relevant components)
4. Spec files for any components the request mentions
5. The source files those specs point to

## 1. Research

Identify:

- Which files will need to change
- Which store fields/actions are involved (new or existing)
- Whether routing changes are needed (new ViewId, NAV_ITEMS, renderView)
- Whether i18n strings are needed
- Whether new storage keys are needed
- Any architectural constraints from `AGENTS.md` / `docs/dev/architecture/` that apply

Run `rg "<ComponentName>" src/ --type tsx -l` to find all usages of relevant components.

## 2. Write the spec

Output a spec block in chat (not a file yet):

```
SPEC: <feature name>
─────────────────────────────────────────
What: <one sentence outcome>
Why: <user problem solved>

Files to create:
  - <path> — <what it is>

Files to modify:
  - <path> — <what changes>

Files to delete:
  - none | <path> — <why>

Store changes:
  - <store>: add field <name>: <type> = <default>
  - <store>: add action <name>(<params>): <what it does>

i18n strings:
  - <key>: EN="<text>" KO="<text>"

Routing changes:
  - VALID_VIEW_IDS: add "<viewId>"
  - ViewId: add "<viewId>"
  - NAV_ITEMS: add { ... }
  - renderView: add case "<viewId>"

Storage keys:
  - <key> in src/shared/storage — type: <type>, default: <value>

Risks / open questions:
  - <anything that could go wrong or needs decision>

Doc files to update after build:
  - <path>
─────────────────────────────────────────
Proceed? (confirm or request changes)
```

## 3. Approval gate

STOP. Do not write any code until the user explicitly confirms the spec.
If they request changes, revise and re-present. Repeat until confirmed.

## 4. Build

Execute the approved spec exactly. No scope creep.
If you discover something unexpected during build, pause and report it before continuing.

Use the relevant `docs/dev/features/adding-a-*.md` guides for step-by-step checklists on common operations.

## 5. Verify

```bash
pnpm exec tsc --noEmit   # zero new type errors
pnpm vitest run          # all tests pass
```

If tests fail: fix the failures, then re-run once. Do not iterate more than twice — if still broken, report to user.

## 6. Update docs

For every file touched:

- Update or create its `docs/dev/components/*/[Name].md` spec
- Update its row in `docs/dev/components/_index.md` (status, lastAudited)
- Check off any resolved Open issues in the spec
- Add a Change history row: `| YYYY-MM-DD | <commit> | <what changed> |`
- If a new component: create its full spec file from template
- If a component was removed: mark `status: removed` in `_index.md`

Update `docs/dev/COMPONENT_INDEX.json` if it exists.

## 7. Commit

```
type(scope): description

Types: feat | fix | refactor | style | chore
Scope: component name or area
```

## 8. Report

Tell the user:

- What was built
- Files created/modified
- Any open issues that remain
- Verification result

</process>

<rules>
- Never write code before the spec is approved
- Never skip the doc update phase
- Subscribe to minimal store slices — field-level not object-level
- No hardcoded strings — all user-facing text through t()
- No cross-entrypoint imports — message passing only
- Follow WXT entrypoint isolation rules (see `docs/dev/architecture/messaging.md` and `AGENTS.md`)
</rules>

<success_criteria>

- [ ] Spec written and approved before any code
- [ ] Build matches approved spec exactly
- [ ] tsc --noEmit passes with zero new errors
- [ ] vitest run passes
- [ ] All touched component specs updated
- [ ] \_index.md rows updated
- [ ] Commit message follows format
      </success_criteria>
