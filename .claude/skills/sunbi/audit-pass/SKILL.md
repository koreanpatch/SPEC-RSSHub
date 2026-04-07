---
name: sunbi-audit-pass
description: 'Deep documentation audit for a component folder. Reads source, extracts structure, fills spec files, flags architectural issues. Usage: /audit-pass <folder path>'
argument-hint: '<src folder path, e.g. src/entrypoints/sidepanel/views/settings>'
---

<objective>
Read a folder of source files, extract their full structure, write/update their
spec files in docs/dev/components/, flag any architectural issues, and update
the component registry.
</objective>

<context>
Target folder: $ARGUMENTS
</context>

<process>

## 0. Resolve target

Map the source folder to its docs folder:
`src/entrypoints/sidepanel/views/settings/` → `docs/dev/components/settings/`
`src/entrypoints/sidepanel/components/layout/` → `docs/dev/components/layout/`
etc.

Read `docs/dev/README.md` and `docs/dev/components/_index.md` for context.

## 1. Inventory

List all `.tsx` and `.ts` files in the target folder (non-recursive first, then subdirs).
For each, note: filename, size, export type (default/named).

## 2. Per-component extraction

For each source file, extract:

- All exported component names
- All props (name, type, required, default)
- All Zustand `useStore` selectors — including `useDictionaryStore` (Sunbi’s dictionary **UI** store; not the backend repo) and any other `use*Store` hooks — which fields and actions
- All child components imported and rendered
- All hooks (custom and React)
- All `useEffect` calls — dep arrays + intent
- All `useRef` / `useState`
- All `chrome.*` or browser API calls
- All direct service/API calls
- Any `TODO`, `FIXME`, `@deprecated` comments
- Used-by: run `rg "<ComponentName>" src/ --type tsx -l`

## 3. Write/update specs

For each component, write or update `docs/dev/components/[folder]/[Name].md`
using the standard template from `docs/dev/README.md`.

- [WRITE] files: fill all sections with real extracted content
- Existing files: update stale sections; preserve <!-- manual --> blocks
- New files: create from template

## 4. Flag issues

Append to `docs/dev/sunbi_frontend_audit.md` under:
`## Audit findings — [FolderName] — YYYY-MM-DD`

Flag:

- Props passed but never used
- `useStore(s => s.largeObject)` instead of field-level subscription
- `useEffect` with missing deps
- Hardcoded Korean or English strings (should use `t()`)
- `chrome.*` calls in wrong entrypoint context
- Patterns that contradict `AGENTS.md` / `docs/dev/architecture/` rules

## 5. Update registry

Update `docs/dev/components/_index.md`:

- Correct file path
- Used-by count
- Store deps
- Status: stable | in-progress | needs-refactor
- Last audited: today

If `docs/dev/COMPONENT_INDEX.json` exists, update affected entries.

## 6. Commit

`docs: audit pass — [folder] — YYYY-MM-DD`

## 7. Report

- N components audited
- N specs created, N updated
- N issues flagged in audit log
- Any components that need immediate attention

</process>

<rules>
- Never modify source .tsx files — docs only
- Preserve any <!-- manual --> commented sections in existing specs
- One audit pass = one folder (don't span multiple unrelated folders)
- Flag but do not fix architectural issues — fixing is a separate /feature task
</rules>

<success_criteria>

- [ ] All .tsx files in folder have a corresponding spec
- [ ] All specs have real content (no <!-- TODO --> placeholders)
- [ ] \_index.md rows updated for all audited components
- [ ] Issues appended to sunbi_frontend_audit.md
- [ ] Commit made
      </success_criteria>
