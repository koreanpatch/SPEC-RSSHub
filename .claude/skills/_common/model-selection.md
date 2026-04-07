# Model Selection

Standard procedure for selecting the right model tier for each agent based on task complexity. Use this when a skill spawns multiple agents and the optimal model varies by task.

## Tiers

| Tier       | Model    | Use When                                                                                                                                           |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **haiku**  | `haiku`  | Mechanical, pattern-matching tasks — file existence checks, simple grep, TSV edits, yes/no classification, config changes                          |
| **sonnet** | `sonnet` | Structured analysis — traceback diagnosis, import graph mapping, reference scanning, pattern-matching against known rules, summarization           |
| **opus**   | `opus`   | Deep reasoning — architectural analysis, novel code implementation, ambiguous linguistic judgment, cross-module refactoring, critical code changes |

## Direct Assignment

When all agents in a phase clearly fall into one tier, assign the model directly — no classifier needed. Examples:

- Staleness checks (does this file exist?) → always **haiku**
- Traceback diagnosis → always **sonnet**
- Deep codebase research → always **opus**

## Classifier Pattern

When task complexity varies within a single phase (e.g., `/do` tasks range from "add a TSV row" to "implement a new module"), use a classifier:

1. **Spawn a single haiku agent** as the classifier. Its prompt:
    - Receives all task/unit-of-work descriptions
    - Evaluates each against the tier criteria below
    - Returns a JSON mapping: `{"task_1": "haiku", "task_2": "sonnet", "task_3": "opus"}`
    - Must err toward the more capable model when uncertain

2. **Parse the classifier output** and use the returned model assignments when spawning the actual work agents.

## Classification Criteria

| Signal                                                               | Tier   |
| -------------------------------------------------------------------- | ------ |
| Task is a yes/no check (exists? stale? matching?)                    | haiku  |
| Task is grep + report (find references, count occurrences)           | haiku  |
| Task adds/edits a single file following a clear existing pattern     | haiku  |
| Task requires reading and understanding 2+ files                     | sonnet |
| Task requires tracing execution flow or debugging                    | sonnet |
| Task is structured analysis with clear inputs/outputs                | sonnet |
| Task requires judgment calls on ambiguous cases                      | opus   |
| Task requires novel code design or architectural decisions           | opus   |
| Task requires deep domain expertise (Korean linguistics, FST theory) | opus   |
| Task modifies code that many other files depend on                   | opus   |

## Notes

- The classifier itself is always **haiku** — it's just categorization
- Skip the classifier when direct assignment is obvious (saves one agent round-trip)
- When the classifier is uncertain, it should pick the more capable model — a haiku-classified task running on sonnet wastes a little money; an opus-classified task running on haiku wastes a lot of time
