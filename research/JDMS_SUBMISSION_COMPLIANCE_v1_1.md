# JDMS Submission Compliance Audit v1.1

**Target journal:** The Journal of Defense Modeling and Simulation (JDMS)
**Checked:** 2026-09-06 against current SAGE/JDMS author instructions.

## Submission-format requirements relevant to this manuscript

| Requirement | Current JDMS guidance | v1.1 action |
|---|---|---|
| Scope | rigorous technical lessons from military/defense M&S practice | paper framed around digital T&E and real public M&S implementations |
| Length | no hard limit; ideally 10–20 pages | manuscript compressed; detailed hashes/protocol tables remain in repository package |
| Abstract | **structured, 150–200 words** | v1.1 uses Purpose / Methods / Results / Conclusions |
| Keywords | at least 5 | v1.1 retains 8 specific keywords |
| Figures | consecutively numbered; figure/image guidance includes 300 dpi for raster images | main figures retained as scalable SVG masters; export to journal-accepted vector/PDF or ≥300 dpi raster during final file preparation |
| References | SAGE Vancouver style | numbered in order; final Word conversion will use Vancouver punctuation/style pass |
| Statements and Declarations | required with specified subheadings | added to v1.1; author-specific COI/funding placeholders explicitly marked for completion |
| Data availability | encouraged and should link to repository where possible | v1.1 includes public DTEP repository/evidence-manifest statement |
| Peer review | single-anonymized | author/title-page metadata can remain in submission file; no double-blind redaction required |
| Supplemental files | guidance is internally inconsistent; one file-upload statement says JDMS does not currently accept supplemental files | no main-paper claim depends on a supplement; repository supporting package is optional/reproducibility-only |

## High-priority changes from v1.0 to v1.1

1. Abstract reduced and restructured to 150–200 words.
2. Introduction compressed to foreground the two linked problems: heterogeneous-model unification and qualification-evidence inheritance.
3. Related Work reduced to positioning rather than a broad review.
4. Methods condensed by RQ; detailed dependency logic moved to repository-hosted supporting package.
5. Results keep only decision-relevant quantitative anchors.
6. Discussion merged around four claims: unification, layered qualification, cumulative evidence, bounded inheritance.
7. EB-01 wording standardized to `change locality` / `reassessment radius`, not generic efficiency.
8. VU-01a failure chronology preserved explicitly.
9. LC maneuver results retained as discrimination controls only.
10. `Statements and Declarations` and data/code availability added.
11. Figure 1–4 masters standardized for typography, spacing, accessible labeling and grayscale-independent interpretation.

## Submission blockers remaining after v1.1 scientific freeze

These are **author/editorial metadata**, not scientific-analysis blockers:

- final author list and affiliations;
- corresponding-author details;
- final conflict-of-interest declaration approved by all authors;
- final funding statement/grant numbers;
- optional acknowledgments/author contributions;
- final Word or LaTeX conversion and figure export in the exact accepted production format.

## Scientific evidence status

No additional mechanism experiment is required for the v1.1 claim set. The paper remains bounded to one primary TWS capability class, two heterogeneous public codebases and one within-repository algorithm change. The main inference boundaries remain unchanged.