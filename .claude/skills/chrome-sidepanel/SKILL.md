---
name: chrome-sidepanel
description: 'Chrome Manifest V3 + sidepanel constraints, storage patterns, permission model, and common bugs. Invoke when working on chrome APIs, storage, or extension lifecycle. Usage: /chrome-sidepanel'
argument-hint: ''
---

# Chrome MV3 + Sidepanel Constraints

## Sidepanel lifecycle (critical)

- Sidepanel is **persistent** while open — it does not reload on normal tab navigation like a popup.
- React + Zustand state lives in memory while the panel stays open.
- **Closing** the panel clears in-memory UI state unless you **persist** it (see below).

## Storage pattern (prefer typed helpers)

Use **`@/shared/storage`** and existing storage item helpers so defaults and migrations stay consistent.

Direct `chrome.storage.local.set` bypasses typed defaults and is easy to get wrong — reserve for low-level code paths that already use the same key schema.

Persisted **global** panel settings (theme, width, `currentView`, etc.) flow through **`useStore`** + `storageItems.*` in `store.ts`.  
Dictionary **route** state uses **`localStorage`** inside `dictionaryStore.ts` for specific keys (see `.planning/codebase/store-shape.md`).

## Permissions — check before using any chrome API

Authoritative list: **`wxt.config.ts`** → `manifest.permissions` and `host_permissions`.

**Never add a new permission** without a product reason — permissions affect Chrome Web Store review.

Common traps:

- `chrome.tabs.query` needs **`tabs`** (or sufficient host permissions) — partial APIs fail silently or return empty.
- Features like `history` are **separate** permissions — not implied by `activeTab`.

## MV3 service worker (`background.ts`)

- Treat the SW as **ephemeral** — it can stop at any time; **no long-lived in-memory truth** for data that must survive.
- Prefer **`chrome.storage`** (or alarms) for durable state.
- Long delays: prefer **`chrome.alarms`** over relying on `setInterval` across SW restarts.

## Dictionary HTTP API (this codebase)

**Not** “background-only”: the client in **`src/shared/services/dictionary.ts`** performs fetches using **`VITE_DICTIONARY_API_URL`** (and API key env) from the extension bundle. Sidepanel and stores call into this module.  
The **background** also uses the same dictionary service for some flows.  
For **contract** and field names, see **`docs/dev/architecture/dictionary-api-contract.md`** and **`/dict-contract`**.

## Common bugs

1. **Stale module state in SW** after restart — don’t rely on globals for authoritative state.
2. **“Extension context invalidated”** — extension reloaded; user must reload the sidepanel page.
3. **Async `onMessage`** — use `return true` and `sendResponse` correctly for async handlers.
4. **Storage listeners** — sidepanel may need `watch` / listeners to sync Zustand with `chrome.storage` updates.
