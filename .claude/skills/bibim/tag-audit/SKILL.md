---
name: bibim-tag-audit
description: 'Audit dictionary/grammar entries for missing POS tags — split files into batches of unique words, analyze each batch with Korean language expertise using Sejong reference docs, and produce a patch TSV. Usage: /tag-audit <folder> [--batch-size N] [--max-batches N]'
argument-hint: '<folder path, e.g. dictionary/stems/>'
---

<objective>
Audit TSV/YAML files in a given folder for **missing POS tags** — words that currently have a single tag but could legitimately carry additional tags. This addresses TODO #3: "Audit non-overlapping words in dictionary and grammar for missing tags."

The pipeline:

1. A Python script filters each file to words unique to that file (not appearing in any other file in the folder), then splits into batches.
2. Parallel agents analyze each batch using `docs/reference/SEJONG_REFERENCE.md` and `docs/reference/STEM_TAGS.md` as linguistic reference, determining which words could carry additional POS tags.
3. Findings are consolidated into a patch TSV that can be applied later with the same script's `apply` command.
   </objective>

<context>
User input: $ARGUMENTS

Script: `python/scripts/dictionary/audit_missing_tags.py`
Batches output: `docs/plans/tag_audit/batches/`
Findings output: `docs/plans/tag_audit/findings/`
Consolidated patch: `docs/plans/tag_audit/patch.tsv`

Reference docs for linguistic analysis:

- `docs/reference/SEJONG_REFERENCE.md` — full Sejong POS tagset, tag boundaries, polysemy patterns
- `docs/reference/STEM_TAGS.md` — all stem-class tags, irregular types, suffix letter key, VX subtypes
- `docs/reference/GLOSSARY.md` — domain terms (irregular conjugation, copula, vowel harmony, etc.)
- `grammar/config/pos_mapping.yaml` — POS mapping and special_sejong overrides
  </context>

<process>

## Worktree Guard

Follow the procedure in `.claude/skills/bibim/_common/worktree-guard.md` with `$SKILL_NAME=tag-audit`.

## 0. Parse Arguments

- `$ARGUMENTS` must contain a folder path (e.g., `dictionary/stems/`). If missing, show usage and stop.
- Optional flags (pass through to the script):
    - `--batch-size N` — words per batch (default: 200)
    - `--max-batches N` — max batches per source file (samples evenly if exceeded)
- Store the parsed folder as `$TARGET_FOLDER`.

## 0.5. State Logging — Pre-Execution

Follow the **Pre-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. The intent is "audit $TARGET_FOLDER for missing POS tags"; the approach is "prepare unique-word batches, parallel agent analysis with Sejong refs, consolidated patch".

## 1. Prepare Batches

Run the preparation script:

```bash
rtk uv run python python/scripts/dictionary/audit_missing_tags.py prepare $TARGET_FOLDER [--batch-size N] [--max-batches N] --output-dir docs/plans/tag_audit/batches
```

Read the manifest at `docs/plans/tag_audit/batches/manifest.json` to determine:

- How many batch files were created
- Which source files they came from
- The list of all files in the folder (needed for agent prompts)

If zero batches were produced (all words appear in multiple files), report this and stop.

## 2. Build Codebase Context

Follow `.claude/skills/bibim/_common/codebase-context.md` to build `$CODEBASE_CONTEXT`.

Follow `.claude/skills/bibim/_common/korean-linguistic-context.md` to build `$LINGUISTIC_CONTEXT` from the standard reference docs (SEJONG_REFERENCE.md, STEM_TAGS.md, GLOSSARY.md, pos_mapping.yaml, irregulars.yaml).

## 2.5. Classify Batch Complexity

Follow the **Classifier Pattern** in `.claude/skills/bibim/_common/model-selection.md`. Spawn a single **haiku** agent with the manifest (source files, POS categories per batch). It returns a model assignment per batch:

- Straightforward categories (NNG, NNP, MAG — clear-cut POS boundaries) → **sonnet**
- Ambiguous categories (VV/VA overlap, NNB/NNBC distinctions, auxiliary verbs) → **opus**

Store the result as `$BATCH_MODELS`.

## 3. Spawn Analysis Agents

Assign batches to agents:

- If ≤ 10 batches: one agent per batch
- If > 10 batches: distribute evenly across 10 agents (each gets multiple batch files)

ALL agents MUST be launched in a SINGLE message (true parallelism). Follow `.claude/skills/bibim/_common/agent-rules.md`.

Each agent receives this prompt template:

---

**Task**: Analyze Korean dictionary/grammar entries for missing POS tags.

You are a **Korean language expert** reviewing words that currently have a single POS tag. For each word, determine whether it could legitimately carry **additional** POS tags in a different file.

**Your batch file(s)**: {list of batch file paths}
**All POS files in folder**: {list from manifest.all_files}

**Linguistic reference** (distilled):
{$LINGUISTIC_CONTEXT}

**Instructions**:

1. Read each batch file. Each row has: word, pos, tags, frequency.
2. For each word, consider: could this word legitimately function as a **different** POS than its current tag? Common patterns to check:
    - **VV ↔ VA**: Some Korean stems function as both verb and adjective (e.g., 밝다 "bright" VA vs "reveal" VV)
    - **NNG ↔ MAG**: Some nouns also function as adverbs (e.g., 정말, 사실)
    - **NNG ↔ NNB**: Some common nouns also function as bound nouns
    - **NNG ↔ MM**: Some nouns also function as determiners
    - **MAG ↔ MAJ**: Adverb type classification
    - **NNG ↔ NP**: Nouns that also serve as pronouns
    - **VA ↔ VV with irregular subtypes**: A word in VA.tsv that should also have an entry in VVB.tsv (different irregular class)
3. Only flag words where you have **medium or high confidence** that the additional tag is linguistically valid. Skip uncertain cases.
4. Do NOT flag derivation patterns (e.g., NNG + 하다 → VV is handled by the derivation engine, not the stem dictionary).
5. Do NOT flag words that already have a file for their additional tag in the folder — the script already excluded cross-file words.

**Output format**: Write a TSV file to `{findings_path}` with this schema:

```
target_file	lemma	pos	tags	frequency	rationale	confidence
```

- `target_file`: The file the new entry should be added to (e.g., `VA.tsv`)
- `lemma`: The word's lemma form (as it would appear in the target file)
- `pos`: The suggested POS tag
- `tags`: Suggested semantic tags (pipe-separated), or empty
- `frequency`: `0` (unknown frequency for the new tag)
- `rationale`: One-line explanation of why this word can carry the additional tag
- `confidence`: `high` or `medium`

If a batch has no findings, write only the header row.

**Codebase context**:
{$CODEBASE_CONTEXT}

---

## 4. Consolidate Findings

After all agents return:

1. Read all findings files from `docs/plans/tag_audit/findings/`
2. Deduplicate by (target_file, lemma) — keep the higher-confidence entry if duplicated
3. Write consolidated patch to `docs/plans/tag_audit/patch.tsv` with the same TSV schema
4. Add a summary header comment:

```
# Tag Audit Patch — generated by /tag-audit
# Source folder: $TARGET_FOLDER
# Date: YYYY-MM-DD
# Findings: N entries across M target files
# Apply with: uv run python python/scripts/dictionary/audit_missing_tags.py apply docs/plans/tag_audit/patch.tsv --target-dir <dir>
# Dry-run first (default), then add --execute to apply
```

## 5. Verify Patch

Do a quick sanity check on the consolidated patch:

- No duplicate (target_file, lemma) pairs
- All target_files exist in the source folder
- All POS tags are valid StemClass values (check against STEM_TAGS.md tag table)
- No entries where lemma already exists in the target_file (would be caught by apply, but flag early)

Report any issues found.

## 5.5. State Logging — Post-Execution

Follow the **Post-Execution** procedure in `.claude/skills/bibim/_common/state-logging.md`. Complete the DECISIONS entry with the outcome (N findings: N high-confidence, N medium-confidence; across M target files).

## 6. Auto-Commit and Auto PR

Follow the procedure in `.claude/skills/bibim/_common/auto-finalize.md`. Stage batch files, findings, and the consolidated patch. Commit: `audit: tag audit of $TARGET_FOLDER — N findings across M files`.

## 7. Report to User

Summarize:

- Source folder, files processed, total entries, unique entries
- Number of findings by confidence level (high / medium)
- Top 10 findings (highest confidence first)
- How to apply: `uv run python python/scripts/dictionary/audit_missing_tags.py apply docs/plans/tag_audit/patch.tsv --target-dir $TARGET_FOLDER` (dry-run), then `--execute`
- PR URL

</process>

<rules>
- Always prefix commands with `rtk`
- Always use `uv run python`, never bare `python`
- All agents within step 3 MUST be launched in a SINGLE message (true parallelism)
- If a batch is empty or an agent finds no candidates, that is a valid result — do not retry
- **Correctness over coverage**: Only flag words where the additional tag is linguistically defensible. A false positive (wrong tag suggestion) is worse than a false negative (missed candidate)
- **Derivation is not duplication**: NNG stems that become verbs via 하다 derivation do NOT need a VV entry — the derivation engine handles this. Only flag genuine polysemy
- **Irregular type matters**: A word in VV.tsv and VVB.tsv is NOT a duplicate — they represent different conjugation patterns. But a word incorrectly in VV.tsv that is actually ㅂ-irregular should be flagged
- **Reference STEM_TAGS.md for every tag judgment** — do not guess tag meanings
- **Korean stems can legitimately have multiple tags** — do not treat multi-tag as wrong
- Set script timeout to 300000ms (5 min) — large folders take time
- Do not ask for confirmation — just execute
- After all work is done, auto-commit and create a PR
</rules>

<success_criteria>

- [ ] Preparation script ran successfully and produced batches
- [ ] All batch files contain only unique-per-file words
- [ ] Reference docs (SEJONG_REFERENCE.md, STEM_TAGS.md) loaded for agent analysis
- [ ] Parallel agents spawned in a single message
- [ ] Each finding has a valid target_file, POS tag, and linguistic rationale
- [ ] No duplicate (target_file, lemma) pairs in consolidated patch
- [ ] Patch file includes apply instructions in header comment
- [ ] Auto-committed and PR created
- [ ] User sees: summary stats, top findings, apply command, PR URL
      </success_criteria>
