# Korean Linguistic Context

Standard procedure for building linguistic reference context for Korean morphology evaluation. Used by skills that need Korean language expertise (gap-analysis, tag-audit).

## Reference Docs

Read these docs and distill the key rules into `$LINGUISTIC_CONTEXT` (20-40 bullet points):

1. **`docs/reference/SEJONG_REFERENCE.md`** — Full Sejong POS tagset (45 tags), tag boundaries, polysemy patterns
2. **`docs/reference/STEM_TAGS.md`** — All 35 stem-class tags, irregular types, suffix letter key, VX subtypes
3. **`docs/reference/GLOSSARY.md`** — Domain terms (irregular conjugation, copula, vowel harmony, hada-compounds)
4. **`grammar/config/pos_mapping.yaml`** — POS mapping and special_sejong overrides
5. **`grammar/config/irregulars.yaml`** — Irregular conjugation rules (ㅂ, ㄷ, ㅅ, ㅎ, 르, ㅡ, 러)

## Key Rules to Include

The `$LINGUISTIC_CONTEXT` should cover:

- POS tag definitions and boundaries (when is a word VV vs VA? NNG vs NNB? MAG vs MAJ?)
- Irregular conjugation types and their stem-class tags (VVB for ㅂ-irregular, VAH for ㅎ-irregular, etc.)
- Derivation vs polysemy (NNG + 하다 → VV is derivation handled by the derivation engine, not the stem dictionary; true VV/VA polysemy is rare but real)
- Counter classification (NNBC general vs NNBCN native-numeral-only vs NNBCS sino-numeral-only)
- Adverb types (MAG general vs MAJ conjunctive)
- Copula behavior (VCP/VCN — special Sejong override)
- Existential verbs (VVX → maps to VA via special_sejong override)
- Auxiliary classification (VX regular vs VXA adjective-type vs VXX existential)
- Stem-class tag derivation algorithm (check special_sejong first, then longest prefix match at lengths 4, 3, 2)

## Evaluation Rules

When evaluating Korean morphological findings:

- **Correctness is the bar, not frequency** — archaic, literary, dialectal, and infrequent forms belong in the parser if they are correct Korean
- **Derivation ≠ duplication** — NNG + 하다 → VV is handled by the derivation engine; a separate VV entry is not needed for 하다-verbs
- **Irregular type matters** — VV and VVB are different conjugation patterns, not duplicates. A word incorrectly tagged as VV that is actually ㅂ-irregular should be VVB.
- **Korean stems can legitimately have multiple tags** — do not treat multi-tag as automatically wrong. Enumerate all valid tags.
- **When uncertain, say so explicitly** — mark findings as "uncertain" with a clear statement of what is unknown and why. Never silently guess or skip.
- **Reference STEM_TAGS.md for every tag judgment** — do not guess tag meanings from abbreviations
- **MeCab disagreement ≠ bibim error** — MeCab uses different conventions; evaluate against Sejong standard and bibim's own tag system
- **Cite sources when available** — list which reference(s) informed the classification. Omit the Sources field when no specific reference applies.
