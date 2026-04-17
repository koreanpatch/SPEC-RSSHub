---
name: profile
description: 'Profile and optimize Python code — speed up execution, reduce memory usage, reduce build time, shrink payload size, or benchmark performance. Usage: /profile <what to optimize>'
argument-hint: '<what to optimize>'
---

<objective>
Take an optimization target (a command, module, build step, or metric), establish a measurable baseline, profile to identify bottlenecks, apply targeted optimizations, and verify improvement with before/after measurements.

All profiling data and reports are printed inline. Optimizations are applied directly to the codebase following project conventions.
</objective>

<context>
User input: $ARGUMENTS
</context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/_common/worktree-guard.md` with `$SKILL_NAME=profile`.

## 0. Parse Input

If `$ARGUMENTS` is empty, use `AskUserQuestion` to ask the user what to optimize. Store as `$TARGET`.

Identify the optimization goal type from the target description:

- **speed** — wall-clock time reduction (startup, request latency, script runtime)
- **memory** — peak RSS or allocation reduction
- **size** — payload, parser table, or artifact size reduction
- **general** — user wants "faster" or "better" without specifying; default to speed

Store as `$GOAL_TYPE`.

## 0.5. Gather Codebase Context

Follow the procedure in `.claude/skills/_common/codebase-context.md` to build a `$CODEBASE_CONTEXT` block. Include the specific module/command/pipeline relevant to `$TARGET`.

## 1. Establish Baseline

Before optimizing anything, measure the current state. The measurement approach depends on `$GOAL_TYPE`:

### Speed

```bash
# Run the target operation 3 times, take the median
time <command>
```

Or for Python scripts:

```python
import time
start = time.perf_counter()
# ... run target ...
print(f"Elapsed: {time.perf_counter() - start:.3f}s")
```

### Memory

```bash
# Peak RSS via /usr/bin/time
/usr/bin/time -v <command> 2>&1 | grep "Maximum resident"
```

### Size

```bash
du -sh <target file or directory>
wc -c <target file>
```

Record the baseline clearly:

```
BASELINE:
  metric: <what was measured>
  value: <number with unit>
  command: <how it was measured>
  date: <timestamp>
```

## 2. Profile

Based on `$GOAL_TYPE`, run appropriate profiling to identify bottlenecks:

### Speed profiling

```bash
uv run python -m cProfile -s cumulative <script> 2>&1 | head -40
```

Parse the output to identify the **top 10 functions by cumulative time**. Group them by module to find which sub-packages dominate.

### Memory profiling

```bash
uv run python -c "
import tracemalloc
tracemalloc.start()
# ... import and run target ...
snapshot = tracemalloc.take_snapshot()
for stat in snapshot.statistics('lineno')[:20]:
    print(stat)
"
```

### Size profiling

Analyze what contributes to the artifact size:

- For parser tables: break down section sizes and row counts
- For packages/responses: list fields by contribution, identify heavy dependencies
- For builds: trace what gets compiled or bundled

From the profiling output, identify the **top 3-5 bottlenecks**. Store as `$BOTTLENECKS`.

## 3. Analyze & Plan

Spawn **2-3 parallel agents** to investigate the top bottlenecks, ALL IN A SINGLE MESSAGE. Each agent:

- **subagent_type**: `general-purpose`
- **Role**: You are an expert in performance optimization for the relevant domain (Python runtime, API latency, serialization, database queries, etc.).
- Gets a detailed, self-contained prompt including:
    - The full `$CODEBASE_CONTEXT` block
    - The optimization target and goal type
    - The baseline measurement
    - The profiling output (relevant excerpt)
    - Its specific bottleneck area to analyze
    - Pointer to `.planning/codebase/` and `.planning/reference/` docs
    - Instructions to:
        1. Read the relevant source code for its bottleneck
        2. Identify WHY it's slow/large/memory-hungry
        3. Propose 1-3 specific optimizations with code-level detail
        4. Estimate the expected improvement for each optimization
        5. Flag any risks (correctness, compatibility, maintainability)
        6. Report findings back (do NOT make changes)

Wait for ALL analysis agents to complete.

Synthesize their findings into a ranked optimization plan:

1. **High impact, low risk** — do these first
2. **High impact, high risk** — do these if needed, with extra caution
3. **Low impact** — skip unless target metric not yet met

Present the plan to the user. If any optimization is risky or architectural, ask for confirmation before proceeding.

## 4. Optimize

Apply optimizations one at a time (or in independent batches that touch different files). After each optimization:

1. **Re-measure** the specific metric using the same command as the baseline
2. **Record the delta**: `optimization X: before=Y, after=Z, delta=W (N%)`
3. **If the optimization made things worse or negligible (<2% improvement)**, revert it using `git checkout` on the affected files
4. **Run tests** after each batch to verify correctness: `uv run pytest`

Stop optimizing when:

- The user's target metric is met
- Diminishing returns are clear (last optimization gave <5% improvement)
- All planned optimizations are exhausted

## 5. Final Measurement

**Role**: Assume the role of a highly critical expert. Verify that each optimization is sound, that measurements are reliable, and that no correctness has been sacrificed.

Re-run the exact same baseline measurement command from Step 1. Compare before/after:

```
RESULTS:
  baseline: <original value>
  final: <new value>
  improvement: <absolute delta> (<percentage>%)

  Breakdown:
  - optimization 1: <delta> (<percentage>%)
  - optimization 2: <delta> (<percentage>%)
  ...

  Reverted (no improvement):
  - optimization N: <reason>
```

## 5.5. Pragmatist Review

Follow the procedure in `.claude/skills/_common/pragmatist-review.md`. Focus on maintainability trade-offs and regression risk. If any optimization fails the pragmatist check, revert it and note it in the report.

## 6. Report

Print a summary to the user:

1. **Before/after table** with the key metric
2. **What was changed** — list each optimization with a one-line description and the files modified
3. **What was reverted** — list any attempted optimizations that didn't help
4. **Test results** — confirm tests still pass
5. **Next steps** — if the target wasn't fully met, suggest what else could be tried

</process>

<rules>
- ALWAYS measure before optimizing — no blind changes. The baseline is sacred.
- Analysis agents MUST be launched in a SINGLE message (true parallelism)
- Each agent prompt must be detailed and self-contained — agents have no shared context
- Revert optimizations that don't improve the metric — do not accumulate neutral changes
- Don't over-optimize — stop when the target is met or diminishing returns are clear
- Follow project conventions from CLAUDE.md (imports, naming, style)
- Never sacrifice correctness for performance — run `uv run pytest` after optimizations
- After all optimizations are complete and tests pass, auto-commit following `.claude/skills/_common/auto-commit.md`
- If an optimization requires architectural changes, present the plan and get user confirmation first
- Prefer stdlib solutions over adding new dependencies for profiling
- Always `source venv/bin/activate` or use `uv run` before running Python
</rules>

<success_criteria>

- [ ] Optimization target and goal type identified
- [ ] Codebase context gathered from reference docs
- [ ] Baseline measurement recorded with exact command and value
- [ ] Profiling run and top bottlenecks identified
- [ ] Analysis agents launched in parallel (single message) to investigate bottlenecks
- [ ] Ranked optimization plan created and presented
- [ ] Optimizations applied incrementally with per-step measurement
- [ ] Non-improving optimizations reverted
- [ ] Tests pass after all optimizations
- [ ] Pragmatist review completed
- [ ] Final before/after comparison reported with percentage improvement
      </success_criteria>
