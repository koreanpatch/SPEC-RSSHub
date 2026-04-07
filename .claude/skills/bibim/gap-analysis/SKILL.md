---
name: bibim-gap-analysis
description: 'Run gap analysis scripts, then evaluate each finding as a Korean language expert — classifying gaps as ambiguous (legitimate multi-tag) or unambiguous (true gap/error). Usage: /gap-analysis [wave]'
argument-hint: '[wave number 1-5 to run a single wave, or omit for all]'
---

<objective>
Run the gap analysis pipeline in `python/scripts/gap_analysis/` in correct dependency order, then evaluate every finding through the lens of a **Korean language expert and expert software engineer**. The key question for each gap is: **is it ambiguous or unambiguous?**

The goal is **correctness and completeness** — enumerate all possible correct options. Korean morphology inherently allows many stems to carry multiple tags (e.g., a word functioning as both VV and VA, or a noun that also serves as an adverb). The evaluator must distinguish:

- **Unambiguous gaps** — clearly missing stems, wrong tags, or broken paths. These are real bugs or omissions. If it's correct, it belongs in the parser — even if archaic, literary, infrequent, or dialectal.
- **Ambiguous cases** — stems that legitimately belong to multiple categories, or where the "correct" tag depends on usage context. These need careful judgment, not automatic import.
- **Uncertain** — when the evaluator is not confident in the classification, this MUST be explicitly noted rather than guessed at. Write down what is unknown and why.

**Correctness is the bar, not frequency.** A word that appears once per million tokens but is linguistically valid belongs in bibim just as much as a common word. Archaic forms, literary vocabulary, technical terms, regional variants — if they are correct Korean, they are relevant.
</objective>

<context>
User input: $ARGUMENTS

Script location: `python/scripts/gap_analysis/`
Output parquets: `data/datasets/gap_analysis/`
Output reports: `docs/plans/gap_analysis/{extraction,comparison,classification,verification,action}/`

Wave structure:

- Wave 1 (`extraction/`): Raw data sources -> parquets
- Wave 2 (`comparison/`): Diff/compare extracted data
- Wave 3 (`classification/`): Classify gaps, generate reports
- Wave 4 (`verification/`): Verify coverage against grammar
- Wave 5 (`action/`): Generate import files

Reference docs for linguistic evaluation:

- `docs/reference/STEM_TAGS.md` — all stem-class tags, irregular types, suffix letter key
- `docs/reference/GLOSSARY.md` — domain terms (irregular conjugation, copula, vowel harmony, etc.)
- `docs/reference/CONCEPT_INDEX.md` — concept-to-code mapping
- `docs/reference/YAML_SCHEMAS.md` — grammar file schemas
- `grammar/config/irregulars.yaml` — irregular conjugation rules
- `grammar/config/pos_mapping.yaml` — POS mapping and special_sejong overrides
- `dictionary/stems/*.tsv` — current stem dictionaries by tag
  </context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=gap-analysis`.

## 0. Parse Arguments

- If `$ARGUMENTS` is a number 1-5, run only that wave.
- If `$ARGUMENTS` is empty, run all 5 waves sequentially.
- If `$ARGUMENTS` is something else, tell the user the usage and stop.

## 0.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is "run gap analysis pipeline and evaluate findings"; the approach is "5-wave script execution + linguistic evaluation + disposition TSV update".

## 1. Wave 1 — Extraction (all parallel)

Run ALL of these scripts in parallel (separate Bash tool calls in a SINGLE message), each with 5-minute timeout:

```
python/scripts/gap_analysis/extraction/extract_bibim_stems.py
python/scripts/gap_analysis/extraction/extract_suffix_inventories.py
python/scripts/gap_analysis/extraction/extract_pos_bigrams.py
python/scripts/gap_analysis/extraction/extract_morphotactic_rules.py
python/scripts/gap_analysis/extraction/extract_mecab_compounds.py
```

Wait for ALL to complete before proceeding. Report any failures.

## 2. Wave 2 — Comparison (all parallel)

Run ALL of these scripts in parallel (separate Bash tool calls in a SINGLE message):

```
python/scripts/gap_analysis/comparison/diff_suffix_inventories.py
python/scripts/gap_analysis/comparison/diff_stem_coverage.py
python/scripts/gap_analysis/comparison/compare_transitions.py
python/scripts/gap_analysis/comparison/compare_eojeol_coverage.py
```

Skip `compare_sentence.py` (interactive, requires sentence argument).

Wait for ALL to complete before proceeding.

## 3. Wave 3 — Classification (all parallel)

Run ALL of these scripts in parallel (separate Bash tool calls in a SINGLE message):

```
python/scripts/gap_analysis/classification/classify_gaps.py
python/scripts/gap_analysis/classification/classify_missing_stems.py
python/scripts/gap_analysis/classification/detect_pos_misclassifications.py
python/scripts/gap_analysis/classification/detect_compound_gaps.py
```

Wait for ALL to complete before proceeding.

## 4. Wave 4 — Verification (all parallel)

```
python/scripts/gap_analysis/verification/verify_composition_paths.py
python/scripts/gap_analysis/verification/verify_graph_grammar.py
```

Wait for ALL to complete before proceeding.

## 5. Wave 5 — Action

```
python/scripts/gap_analysis/action/generate_import_tsv.py
```

Skip `find_gap_sentence.py` (interactive, requires surface form argument).

## 6. Linguistic Evaluation

After all waves complete, **evaluate every gap finding** as a Korean language expert. This is the core of the skill — not just running scripts but judging results.

### 6.1 Load Reference Context

Follow `.claude/skills/bibim/_common/korean-linguistic-context.md` to build `$LINGUISTIC_CONTEXT` from the standard reference docs (SEJONG_REFERENCE.md, STEM_TAGS.md, GLOSSARY.md, pos_mapping.yaml, irregulars.yaml).

Additionally read:

- `docs/reference/CONCEPT_INDEX.md` — how concepts map to code
- `docs/plans/gap_analysis/disposition.tsv` — **disposition ledger** of previously resolved findings. Skip any row where `disposition` is `implemented` or `rejected`. Only re-evaluate `deferred` rows if their revisit condition has been met.

### 6.2 Read Wave 3-5 Output Reports

Read all classification, verification, and action reports from `docs/plans/gap_analysis/`. These contain the raw gap findings to evaluate.

### 6.3 Classify Each Gap as Ambiguous or Unambiguous

For each gap finding, apply Korean linguistic expertise:

**Unambiguous (true gap/error):**

- A stem is clearly missing from the dictionary — it has one well-known POS and no legitimate alternative tag
- A tag is objectively wrong — e.g., a verb tagged as NNG, or a ㅂ-irregular tagged as regular VV
- A morphotactic path is broken — the grammar graph doesn't connect tags that it should
- A suffix inventory is missing an ending that exists in the Sejong standard

**Ambiguous (legitimate multi-tag / context-dependent):**

- A stem that genuinely functions as multiple POS — e.g., 사랑 (NNG: love) vs 사랑하다 derivation base
- A word where VV vs VA classification depends on usage (some Korean words straddle verb/adjective)
- Counter nouns (NNBC/NNBCN/NNBCS) where the numeral type restriction is debatable
- Words that MeCab tags differently than Sejong convention — neither is necessarily wrong
- Stems where irregular vs regular classification varies by dialect or register
- Cases where the stem exists but under a different tag that is linguistically defensible
- **All valid tags should be enumerated** — if a stem can be both NNG and MAG, both belong in the parser

**Uncertain (not confident — write it down):**

- The evaluator cannot determine correctness from available references
- The stem or form is unfamiliar and cannot be verified from STEM_TAGS.md, GLOSSARY.md, or grammar configs
- The linguistic status is genuinely unclear (e.g., is this a neologism, a dialectal form, or a data error?)
- **Always state what is unknown and why** — never silently guess or skip

### 6.4 Append Findings to Disposition TSV

Append each new finding as a row to `docs/plans/gap_analysis/disposition.tsv`.

**TSV columns** (tab-separated, header row):

```
id	surface	tag	finding	confidence	category	disposition	reason	commit	date
```

Column definitions:

- `id`: Finding ID — `U{n}` (unambiguous), `A{n}` (ambiguous), `N{n}` (uncertain). Number sequentially continuing from the highest existing ID in the TSV.
- `surface`: The Korean surface form (e.g., 았었, 처럼, 것)
- `tag`: The POS/stem-class tag involved (e.g., EP, JKB, MAG)
- `finding`: One-line description (include freq if available, e.g., "Missing compound EP (freq=2530)")
- `confidence`: `unambiguous` / `ambiguous` / `uncertain`
- `category`: `missing_suffix` / `missing_stem` / `wrong_pos` / `tag_convention` / `transition_gap` / `compound_coverage` / `dialectal` / `unknown`
- `disposition`: Set to `open` for all new findings (the `/gap-disposition` skill resolves them later)
- `reason`: Brief linguistic rationale for the classification
- `commit`: Leave blank (filled by `/gap-disposition`)
- `date`: Today's date (YYYY-MM-DD)

**Rules for appending:**

- If the TSV doesn't exist, create it with the header row first
- Before appending, check existing rows — do NOT add a duplicate if a row with the same `surface` + `tag` already exists (regardless of disposition)
- Skip any finding that matches an existing `implemented` or `rejected` row
- If an existing `deferred` row matches and its revisit condition is met, update it to `open` with a new date instead of appending

Example rows:

```
U4	았었	EP	Missing compound EP (freq=2530)	unambiguous	missing_suffix	open	Standard double-past pre-final ending, both Kiwi+MeCab have it		2026-04-02
A1	처럼	JKB	JKB vs JX convention (freq=19385)	ambiguous	tag_convention	open	Bibim uses JX deliberately; Sejong convention is JKB		2026-04-02
N1	것	EP	MeCab lists 것 as EP (freq=87)	uncertain	unknown	open	No standard grammar describes 것 as EP; likely MeCab error		2026-04-02
```

## 6.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N findings: N unambiguous, N ambiguous, N uncertain; N skipped per disposition). Log incidents for script failures or surprising evaluation results that changed understanding.

## 7. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. Stage all changed files (reports, disposition TSV, parquets). Commit: "gap-analysis: N findings — N unambiguous, N ambiguous, N uncertain". PR title should summarize findings.

## 8. Report to User

After all waves and evaluation complete, summarize:

- How many scripts ran successfully vs failed
- Key metrics from each wave (coverage percentages, gap counts, etc.)
- **Evaluation results: N new findings appended (N unambiguous, N ambiguous, N uncertain)**
- **N existing findings skipped (already in disposition.tsv)**
- Top 5 unambiguous findings that should be fixed first
- Top 5 ambiguous cases that need human judgment
- Any uncertain findings that need further research
- Location of full reports: `docs/plans/gap_analysis/`
- Remind user: run `/gap-disposition` after implementing fixes

</process>

<rules>
- Always prefix commands with `rtk`
- Always use `uv run python`, never bare `python`
- All scripts within a wave MUST be launched in a SINGLE message (separate Bash tool calls, maximally parallel)
- Do NOT proceed to the next wave until ALL scripts in the current wave complete
- If a script fails, report the error but continue with remaining scripts in the wave
- If Wave 1 fails critically (no output parquets produced), do NOT run subsequent waves — they depend on Wave 1 output
- Set timeout to 300000ms (5 min) per script — some process large datasets
- Do not ask for confirmation — just execute
- After all work is done, auto-commit and create a PR via the standard procedures
- **Linguistic evaluation is mandatory** — never skip step 6, it is the core value of this skill
- **Correctness is the bar, not frequency** — archaic, literary, infrequent, dialectal, or technical terms belong in the parser if they are correct Korean. The goal is to enumerate all possible correct options.
- **When uncertain, say so explicitly** — mark findings as "uncertain" with a clear statement of what is unknown and why. Never silently guess or skip.
- **Reference STEM_TAGS.md for every tag judgment** — do not guess tag meanings from abbreviations
- **Korean stems can legitimately have multiple tags** — do not treat multi-tag as automatically wrong. Enumerate all valid tags.
- **MeCab disagreement ≠ bibim error** — MeCab uses different conventions; evaluate against Sejong standard and bibim's own tag system
- **Consult disposition.tsv before evaluating** — if a finding already exists in `docs/plans/gap_analysis/disposition.tsv` with `disposition=implemented` or `disposition=rejected`, skip it. Only re-evaluate `deferred` rows if their revisit condition has been met. Note skipped findings in the summary (e.g., "12 findings skipped per disposition.tsv")
- **Cite sources when available** — list which reference(s) informed the classification when applicable (STEM_TAGS.md, GLOSSARY.md, irregulars.yaml, specific dictionary TSV, Sejong tagset convention, or a stated linguistic principle). Sources strengthen confidence but are not always required — you can be certain based on linguistic knowledge alone. Omit the Sources field when no specific reference applies rather than forcing a citation.
</rules>

<success_criteria>

- [ ] All runnable scripts executed in correct dependency order
- [ ] Parallel execution within each wave (all scripts in one message)
- [ ] Failures reported clearly with error context
- [ ] Reference docs (STEM_TAGS.md, GLOSSARY.md, irregulars.yaml) loaded for evaluation
- [ ] Every gap finding classified as unambiguous, ambiguous, or uncertain — with linguistic rationale
- [ ] Uncertain cases explicitly documented with what is unknown and why
- [ ] New findings appended to `docs/plans/gap_analysis/disposition.tsv` with `disposition=open`
- [ ] No duplicate rows appended (checked by surface+tag match against existing rows)
- [ ] Auto-committed and PR created via auto-pr procedure
- [ ] User sees: script results, evaluation summary, top priorities for all three categories, PR URL
      </success_criteria>
      </output>
