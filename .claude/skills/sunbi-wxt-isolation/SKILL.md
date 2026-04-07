---
name: sunbi-wxt-isolation
description: 'Quick reference for WXT entrypoint isolation rules. Invoke when confused about what can import what, or when adding cross-entrypoint communication. Usage: /wxt-isolation'
argument-hint: ''
---

# WXT Entrypoint Isolation

## Prefer snapshots

Before deep-reading `background.ts` or sidepanel stores, read **`.planning/codebase/entrypoints.md`** (repo snapshot).

## The four entrypoints and their worlds

| Entrypoint      | Has window?         | Typical chrome.\*              | Can import from                               |
| --------------- | ------------------- | ------------------------------ | --------------------------------------------- |
| `background.ts` | No (service worker) | Broad (`manifest.permissions`) | `@/shared/*` only — **no** React/UI           |
| `content.ts`    | Yes (page)          | Limited                        | `@/shared/*`, `@/tools/*` — **not** sidepanel |
| `sidepanel/`    | Yes (panel)         | Full in extension page         | `@/shared/*` + `sidepanel/**`                 |
| `get-started/`  | Yes (tab UI)        | Extension page                 | `@/shared/*` + `get-started/**`               |

## Hard rules

- `sidepanel/` **cannot** import `background.ts` or `content.ts` as modules.
- `background.ts` **cannot** import React or sidepanel UI.
- `content.ts` **cannot** import from `sidepanel/` paths.
- `@/` → `src/` — prefer alias over deep `../../` (see `wxt.config.ts`).

## Cross-entrypoint communication

- **Sidepanel → background:** `browser.runtime.sendMessage` → `browser.runtime.onMessage` in `background.ts`.
- **Content → background:** same.
- **Background → sidepanel:** `browser.runtime.sendMessage` (extension pages) or `browser.tabs.sendMessage` to a tab when needed.
- **Sidepanel ↔ content:** usually **via background** relay or shared storage — not direct imports.

Define payloads in **`src/shared/types/messages.ts`** (`Message` union).  
See **`docs/dev/architecture/messaging.md`** for direction notes.

## WXT-specific gotchas

- Use WXT entry wrappers (`defineBackground`, content script definition) — follow existing `background.ts` / `content.ts` patterns.
- HMR: dev server targets sidepanel / get-started; **background and content typically need a full extension reload** after changes.
- **`wxt.config.ts`** owns `manifest.permissions` and Vite `alias` — check before assuming a `chrome.*` API exists.
- Vite env: `VITE_*` baked at build time — restart `pnpm dev` after `.env` changes.

## When to invoke

- “Can I import X from Y?” — check the table.
- “`chrome` is undefined” — wrong context (e.g. wrong entrypoint).
- “Message not received” — verify `Message` type, handler in background, and async `return true` if using `sendResponse`.
