# Response to Simulated JDMS Review — v1.1 Submission Candidate

Status: **all manuscript-level reviewer actions addressed; no new mechanism experiment added**

Basis: `research/JDMS_SIMULATED_REVIEW_v1_1.md` reviewed manuscript v1.0 and recommended major revision before external submission. This response records how v1.1 addresses those comments.

## Major comments

| Reviewer comment | v1.1 action | Location | Status |
|---|---|---|---|
| 1. Balance heterogeneous-model unification and evidence lifecycle as co-equal contributions | Reframed title, Introduction, RQs, Results and Conclusion around two linked contributions | `MANUSCRIPT_SUBMISSION_v1_1.md` | ADDRESSED |
| 2. Compress and structure abstract | Replaced long narrative abstract with structured Purpose/Methods/Results/Conclusions abstract and retained only core quantitative anchors | Abstract | ADDRESSED |
| 3. Separate interoperability from semantic/use qualification | Added explicit layered interpretation; retained RF `UNKNOWN`; prohibited global semantic-equivalence wording | Methods 3.3; Results RQ2; Discussion | ADDRESSED |
| 4. Make VU-01a→VU-01b chronology transparent | VU-01a remains explicit FAIL; VU-01b described as corrected representation comparator, not fidelity tolerance; sensitivity perturbation retained | Methods RQ4; Results RQ4 | ADDRESSED |
| 5. Keep LC-01 focused on inheritance stop rule, not tracker performance | Main text reports only discrimination metrics required to demonstrate algorithm distinction; no CA-superiority claim | Results RQ4; Figure 4; Figure S2 | ADDRESSED |
| 6. Clarify evidence dependency mechanism | Main text retains governing intersection rule; repository supporting methods include lifecycle pseudocode and status semantics | Methods 3.1; `SUPPORTING_EVIDENCE_PACKAGE_v1_1.md`; `supplementary/SUPPLEMENTARY_METHODS_v1.md` | ADDRESSED |
| 7. Keep engineering value as manageability/change locality | Main text explicitly reports 224 TMSU boundary lines and rejects lower-total-code/time interpretation; change locality remains primary | Results RQ3; Discussion | ADDRESSED |
| 8. Do not depend on supplemental-file acceptance | All essential results remain in main manuscript, Figures 1–4 and Tables 1–3; supplement duplicated as repository-hosted reproducibility material | Main manuscript + supporting evidence package | ADDRESSED |
| 9. Add declarations/end matter | Ethical/consent/data-code statements added; conflict and funding remain explicit author-completion items rather than invented statements | End matter in v1.1 | ADDRESSED WITH ADMIN COMPLETION |
| 10. Improve provenance discoverability | Public DTEP repository and evidence manifest identified in data/code availability statement; detailed hashes remain outside narrative text | End matter + evidence package | ADDRESSED |

## Minor comments

1. **Title shortened** while retaining unification + bounded inheritance.
2. **TMSU terminology normalized** to `Test Model Service Unit`.
3. **Upper-trial terminology standardized**; exact artifact names are used only where a metric depends on them.
4. **Qualification vs accreditation separated** throughout.
5. `QUALIFIED_WITHIN_EVIDENCE` is explicitly defined as a bounded research evidence state.
6. Main figures use border/line-style/state labels in addition to restrained color so meaning survives grayscale reproduction.
7. Figure 3 is retained as the conceptual center of the lifecycle argument.
8. Table 2 remains in the main paper to expose quantitative anchors and inference boundaries.

## Figure revisions completed

The four main SVGs were redrawn for submission readability:

- larger minimum text size and improved whitespace;
- reduced decorative content;
- restrained print-compatible palette;
- state meaning encoded by labels, borders and dashed lines rather than color alone;
- no quantitative value added beyond frozen evidence;
- accessible SVG `<title>` / `<desc>` elements added.

Files:

```text
research/figures/Figure1_TMSU_heterogeneous_model_unification.svg
research/figures/Figure2_evidence_ladder_and_unknown.svg
research/figures/Figure3_cumulative_evidence_nonmonotonic_qualification.svg
research/figures/Figure4_selective_carry_forward_vs_stop_rule.svg
```

## Supplementary / reproducibility package completed

Repository-hosted supporting material now includes:

```text
research/SUPPORTING_EVIDENCE_PACKAGE_v1_1.md
research/supplementary/SUPPLEMENTARY_METHODS_v1.md
research/supplementary/SUPPLEMENTARY_TABLES_v1.md
research/supplementary/FigureS1_BP_behavior_matrix.svg
research/supplementary/FigureS2_LC_algorithm_discrimination.svg
```

The supplement is non-essential to the main scientific conclusion; this avoids dependence on journal-specific supplemental-file handling.

## Residual pre-upload items

These are administrative, not scientific-evidence gaps:

1. author names, affiliations and corresponding-author details;
2. final conflict-of-interest declaration;
3. final funding statement;
4. final immutable repository tag/archive for the exact submitted commit;
5. journal-system formatting conversion after the scientific Markdown is approved.

## Revision conclusion

The simulated review's substantive concerns were addressable without adding another model, transport protocol, or mechanism experiment. v1.1 preserves the frozen empirical scope while improving journal fit, evidence boundaries, reproducibility, and presentation. The manuscript is therefore advanced from the simulated **major-revision-before-submission** state to a **submission candidate suitable for external author review and final administrative completion**.
