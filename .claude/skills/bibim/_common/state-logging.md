# State Logging

Standard procedure for recording decisions and incidents before and after skill execution. Referenced by skills that modify code or make decisions.

## Pre-Execution (after planning, before main work begins)

After the skill has parsed input, gathered context, and finalized its approach — but BEFORE starting execution:

1. Read `docs/state/DECISIONS.md`
2. Append an entry with today's date, skill name, and a short title derived from the task:

```markdown
## [YYYY-MM-DD] /skill-name — short title

**Intent**: {what we're trying to achieve — 1 sentence}
**Approach**: {how we're achieving it — strategy and key choices, 1-2 sentences}
```

Leave `**Outcome**` for post-execution. Only add `**Alternatives rejected**` if a non-obvious choice was made during planning.

**Keep it tight.** The intent should be one sentence. The approach should name the strategy, not describe every step.

## Post-Execution (after work is done, before reporting to user)

After all work is complete but BEFORE the final report to the user:

### 1. Complete the DECISIONS entry

Edit the entry created in pre-execution to append:

```markdown
**Outcome**: {what was actually done — 1-2 sentences}
**Key choice**: {the most important decision made during execution and why — optional, only if noteworthy}
```

### 2. Log incidents (only if errors occurred)

If any of the following happened during execution, append an entry to `docs/state/INCIDENTS.md`:

- Tests failed and needed fixing
- An approach had to be abandoned mid-execution
- A bug was discovered (in the codebase or in the skill's work)
- An assumption turned out to be wrong
- A pre-commit hook failed for a non-trivial reason
- Parallel agents produced conflicting work that needed reconciliation

**Do NOT log:**

- Normal retry cycles (e.g., pre-commit hook reformatted files and commit succeeded on retry)
- Expected behavior (e.g., "no stale docs found, skipped update")
- Minor issues that were resolved instantly with no learning value

The incident entry format:

```markdown
## [YYYY-MM-DD] /skill-name — short title

**Symptom**: {what went wrong — 1 sentence}
**Root cause**: {why it happened — 1 sentence}
**Fix**: {what was done — 1 sentence}
**Prevention rule**: {how to avoid this next time — 1 actionable sentence}
```

## Model Guidance

- DECISIONS entries are templated — any model can write them efficiently.
- INCIDENTS entries require root-cause judgment — if the skill delegates this to a sub-agent, prefer Sonnet.

## Hook Failure Policy

If state logging fails (file write error, etc.), **do not block the skill**. Log a warning and proceed. State logging is observability, not critical path.
