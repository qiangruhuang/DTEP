# Submission Freeze v1.1

Status: **SCIENTIFIC CONTENT FROZEN — submission candidate**

Date: 2026-09-06

Target journal: **The Journal of Defense Modeling and Simulation (JDMS)**

## Frozen manuscript

```text
research/MANUSCRIPT_SUBMISSION_v1_1.md
```

Current title:

> **Unifying Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance**

## Frozen paper-level contribution

The paper has two co-equal, linked contributions:

1. **Heterogeneous-model unification.** A SAL-aligned TMSU stabilizes the trial-facing capability boundary while preserving distinct implementation identities, bindings and provenance. BP-01 and MS-01 provide the bounded empirical basis.
2. **Evidence-lifecycle governance.** Test-grade unification requires qualification evidence to remain versioned, dependency-aware and selectively reusable. SP/EQ/EA/VU/LC establish semantic uncertainty, intended-use dependence, cumulative history, typed carry-forward and an explicit inheritance stop rule.

The central synthesis is:

```text
heterogeneous model unification
        +
configuration-aware evidence lifecycle
        ↓
manageable digital T&E reuse without blind qualification inheritance
```

## Frozen research questions

- **RQ1:** stable capability boundary and heterogeneous substitution;
- **RQ2:** structural vs semantic vs intended-use qualification;
- **RQ3:** cumulative evidence with selective applicability;
- **RQ4:** bounded carry-forward and stopping rule.

No additional mechanism experiment is required for the current claim set.

## Frozen empirical anchors

| Evidence | Frozen anchor |
|---|---|
| BP-01 | 16/16 direct-vs-wrapper exact; negative control rejected |
| MS-01 | OpenEaagles 16/16; RadarSimPublic 16/16; upper-trial edits 0 |
| SP-01 | 5/5 injected semantic mismatches rejected; RF relation `UNKNOWN` |
| EQ-01 | 4/4 intended-use decisions matched |
| EB-01 | upper-core churn 0 vs 160; direct model refs 0 vs 9; reassessment 1/4 vs 3/4; no lower-total-code claim |
| EA-01 | evidence records 1→2→3→4→5; history retained; `UNKNOWN` persists |
| VU-01a | strict-byte rule FAIL; 8/16 exact on repeated run |
| VU-01b | normalized 16/16; `+1e-6 m` sensitivity perturbation rejected |
| LC-01 | CV 16/16; CA 16/16; 12/16 normalized equal; automatic inheritance rejected |

## Frozen main figures

```text
Figure 1 — heterogeneous-model unification boundary
Figure 2 — evidence ladder + durable UNKNOWN
Figure 3 — cumulative evidence vs non-monotonic qualification
Figure 4 — selective carry-forward vs stop rule
```

Master SVGs:

```text
research/figures/Figure1_TMSU_heterogeneous_model_unification.svg
research/figures/Figure2_evidence_ladder_and_unknown.svg
research/figures/Figure3_cumulative_evidence_nonmonotonic_qualification.svg
research/figures/Figure4_selective_carry_forward_vs_stop_rule.svg
```

## Frozen main tables

`research/MAIN_TABLES_v1_0.md`

- Table 1 — capability / implementation / evidence identity;
- Table 2 — frozen experiment chain and inference boundaries;
- Table 3 — lifecycle change–evidence action matrix.

## Supporting material

Repository-hosted supporting package:

```text
research/SUPPORTING_EVIDENCE_PACKAGE_v1_1.md
research/supplementary/SUPPLEMENTARY_METHODS_v1.md
research/supplementary/SUPPLEMENTARY_TABLES_v1.md
research/supplementary/FigureS1_BP_behavior_matrix.svg
research/supplementary/FigureS2_LC_algorithm_discrimination.svg
```

No essential paper claim depends on acceptance of a separate supplemental file by the journal.

## Evidence and language audits

```text
research/CLAIM_EVIDENCE_MATRIX_v1_2.md
research/METHOD_RESULT_CLAIM_AUDIT_v1_0.md
research/JDMS_SIMULATED_REVIEW_v1_1.md
research/JDMS_REVISION_RESPONSE_v1_1.md
research/REFERENCE_VERIFICATION_v1.md
```

## Prohibited claim expansion

The submission candidate must not be revised to claim:

- universal plug-and-play model interchangeability;
- equal fidelity of OpenEaagles and RadarSimPublic;
- physical equivalence of the unresolved RF quantities;
- authoritative accreditation by TMSU;
- operational superiority of CA over CV;
- lower total code, engineer-hour, cost or schedule savings;
- enterprise-scale effectiveness from this single capability class;
- universal optimality of the current evidence dependency graph.

## Required pre-upload administrative completion

Scientific content is frozen. Before journal upload, authors still need to supply:

1. title-page author names, affiliations and corresponding-author information;
2. conflict-of-interest declaration;
3. funding declaration;
4. any institution-specific acknowledgement or distribution statement;
5. immutable tag/archive identifier for the exact submission revision;
6. final journal template / ScholarOne file formatting.

Changes to these administrative fields do not reopen WP1 scientific content.

## Freeze decision

```text
MECHANISM EXPERIMENTS:       FROZEN
EVIDENCE CHAIN:              FROZEN
MAIN CLAIMS:                 FROZEN
FIGURES 1–4:                FROZEN FOR AUTHOR REVIEW
TABLES 1–3:                 FROZEN FOR AUTHOR REVIEW
SUPPORTING MATERIAL:         FROZEN FOR AUTHOR REVIEW
MANUSCRIPT v1.1:            SUBMISSION CANDIDATE
AUTHOR/ADMIN METADATA:       PENDING
```
