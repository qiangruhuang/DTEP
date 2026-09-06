# Author-level Final Review v1.2

Status: **Scientific and editorial review complete; author/admin confirmation still required before external upload**

Target: **The Journal of Defense Modeling and Simulation (JDMS)**

Reviewed manuscript: `research/MANUSCRIPT_SUBMISSION_v1_1.md`

Revised candidate: `research/MANUSCRIPT_SUBMISSION_v1_2.md`

## 1. Title

### v1.1

> Unifying Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance

### v1.2

> **Unifying Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance across Model Evolution**

Rationale:

- preserves **heterogeneous model unification** as the first paper-level contribution;
- keeps **bounded evidence inheritance** as the second contribution;
- moves model evolution to a less awkward modifier position;
- retains searchable terms: heterogeneous simulation models, digital test and evaluation, capability abstraction, evidence inheritance.

Decision: **ACCEPT v1.2 title**.

## 2. Abstract

JDMS currently requires a structured abstract of 150–200 words. The revised abstract is approximately **187 words** and uses Purpose / Methods / Results / Conclusions.

Retained quantitative anchors:

- BP-01 16/16;
- MS-01 16/16 + 16/16 with no upper-trial edits;
- SP-01 5/5 mismatches rejected + real RF `UNKNOWN`;
- VU-01a 8/16 exact traces -> retained failure;
- VU-01b 16/16 normalized equivalence;
- LC-01 automatic inheritance rejected.

The abstract does not claim lower total code, engineer-time savings, equal fidelity, universal interchangeability, or accreditation.

Decision: **COMPLIANT / ACCEPT**.

## 3. English-language and argument review

Applied changes:

1. standardized `upper-trial logic` as the conceptual term;
2. replaced awkward result language such as “receives a bounded positive answer” with “within the tested scope, RQx was supported”;
3. changed “permissive rule” to `carry-forward rule` to avoid unintended normative meaning;
4. clarified that `UNKNOWN` denotes evidence insufficiency, not integration failure or demonstrated invalidity;
5. retained `QUALIFIED_WITHIN_EVIDENCE` as a bounded research state and explicitly separated it from accreditation;
6. preserved the two co-equal contributions throughout Introduction, Results, Discussion, and Conclusion;
7. removed phrasing that could imply that internal model architectures should converge;
8. retained negative results and scope limits rather than smoothing them into a uniformly positive narrative.

Decision: **AUTHOR-LEVEL LANGUAGE PASS**.

## 4. Figure-caption review

Figure captions were tightened to state only the claim each figure supports.

- **Figure 1:** heterogeneous-model unification boundary; does not claim model equivalence.
- **Figure 2:** evidence ladder + durable `UNKNOWN` + retained comparator failure.
- **Figure 3:** append-only evidence history versus configuration-dependent qualification; remains conceptual centerpiece.
- **Figure 4:** selective carry-forward versus stopping rule; LC discrimination metrics remain explicitly non-operational.

Current SVG masters remain the frozen visual masters. The upload package should export raster copies at journal-compliant resolution if required by Sage Track.

Decision: **CAPTIONS PASS; VISUAL CLAIM BOUNDARIES PASS**.

## 5. Main-table wording review

### Table 1

Retained `Current bounded state` rather than generic “validity” or “trust” labels.

### Table 2

Renamed `Frozen result` to **Experiment decision** to reduce the risk that a local experiment `PASS` is interpreted as global model qualification.

LC-01 now reads `PASS (stop-rule test)`.

### Table 3

Renamed `Default consequence` to **Default evidence consequence** to keep the table explicitly within evidence lifecycle scope.

Decision: **TABLE WORDING PASS**.

## 6. Reference-style review

JDMS currently specifies **Sage Vancouver** style.

Applied changes:

- numbered references remain in order of first appearance;
- in-text numeric square-bracket citations retained;
- references with more than three authors shortened to first three + `et al.` where appropriate;
- journal references normalized toward Sage Vancouver punctuation and volume/page form;
- DOI labels normalized to `DOI:`;
- policy/website references include access date where a live webpage is cited;
- MIL-STD-3022 is cited as the standard with original date and `as amended` rather than inventing a new edition claim.

No reference metadata was inserted from memory; the scientific reference set remains that previously verified in `REFERENCE_VERIFICATION_v1.md`.

Decision: **REFERENCE FORMAT PASS, subject to final typesetting check in Word/LaTeX**.

## 7. JDMS metadata/compliance review

Current JDMS requirements checked:

- article ideally 10–20 pages: **format-stage check only**;
- preferred manuscript format Word; LaTeX accepted;
- structured abstract 150–200 words: **PASS**;
- minimum 5 keywords: **PASS (8 keywords)**;
- Statements and Declarations: **present**;
- ethical considerations: **Not applicable with explicit reason**;
- consent to participate: **Not applicable**;
- consent for publication: **Not applicable**;
- conflicting-interest statement: **AUTHOR CONFIRMATION REQUIRED**;
- funding statement: **AUTHOR CONFIRMATION REQUIRED**;
- data availability statement: **present**;
- Sage Vancouver references: **converted**;
- figures: 4 main figures; final upload should meet Sage file/resolution requirements;
- tables: 3 main tables;
- ORCID: **AUTHOR METADATA REQUIRED**;
- complete author/affiliation list: **AUTHOR METADATA REQUIRED**;
- corresponding-author details: **AUTHOR METADATA REQUIRED**;
- word/figure/table counts for Sage Track: **final formatted file required for exact word count**;
- single-anonymized peer review: author identity does not need to be removed from the submission cover page;
- supplemental guidance is internally inconsistent on the JDMS page; main-paper claims therefore do not depend on supplemental-file acceptance.

## 8. Generative-AI disclosure

Sage's current AI policy requires disclosure when generative AI materially contributes to research code, literature/source compilation, figures, references, methodology, analysis, results, or conclusions.

Because ChatGPT was used in research-software prototyping/checking, source organization, figure drafting, and manuscript development, v1.2 now includes a **Generative AI use disclosure**. The disclosure does not list AI as an author or evidence source.

Before submission, authors must personally confirm that the stated verification step has been completed.

Decision: **DISCLOSURE REQUIRED; DRAFT INSERTED**.

## 9. Preprint and supplemental-material caution

The current JDMS/Sage instruction page contains internal inconsistencies:

- the key-information block says preprints are accepted, while a later section says JDMS does not accept manuscripts posted on preprint servers;
- one supplemental-material section says online supplements can be hosted, while the file-upload section says JDMS does not currently accept supplemental files.

Conservative submission strategy:

1. do **not** post a new preprint before initial JDMS submission unless the editorial office confirms the current policy;
2. submit a self-contained main manuscript with Figures 1–4 and Tables 1–3;
3. retain the repository-hosted supporting evidence package for reproducibility;
4. upload supplemental files only if the live Sage Track interface explicitly accepts them.

## 10. Scientific stop conditions

No new experiment is required for the frozen claim set.

Do not reopen the mechanism chain to chase:

- more model classes;
- more transport protocols;
- larger scenario grids without a new research question;
- engineer-time estimates;
- RF equivalence unless a future paper specifically studies it.

## Final review decision

```text
SCIENTIFIC CLAIM SET:          PASS / FROZEN
ENGLISH EXPRESSION:            PASS
TITLE:                         PASS AFTER v1.2 REVISION
ABSTRACT:                      PASS (structured, ~187 words)
FIGURE CAPTIONS:               PASS
TABLE WORDING:                 PASS
REFERENCE STYLE:               PASS TO SAGE VANCOUVER
JDMS STRUCTURAL COMPLIANCE:    PASS WITH AUTHOR METADATA PENDING
AI DISCLOSURE:                 REQUIRED / INSERTED AS DRAFT
AUTHOR LIST / AFFILIATIONS:    PENDING
CONFLICTS / FUNDING:           PENDING
IMMUTABLE SUBMISSION TAG:      PENDING
```

**Recommendation:** v1.2 is the author-final scientific/text candidate. Freeze the exact external-submission version only after the pending author/admin fields are supplied and the final commit is tagged/archived.