# Manuscript Evidence Audit v1.0

Status: **Evidence and terminology audit of `MANUSCRIPT_DRAFT_v0_1.md`**

## 1. Overall decision

```text
EVIDENCE STORY:          PASS
QUANTITATIVE ALIGNMENT:  PASS
INFERENCE BOUNDARIES:    PASS WITH MINOR EDITS
TERMINOLOGY:             CORRECTION REQUIRED
EXTERNAL CONTEXT:        SUPPORTED BY AUTHORITATIVE SOURCES
```

The manuscript can proceed without new mechanism experiments. One nomenclature error must be corrected before the next manuscript freeze.

## 2. Required terminology correction

`MANUSCRIPT_DRAFT_v0_1.md` expands TMSU in the Abstract as:

```text
Test Modeling and Simulation Unit
```

The frozen conformance profile defines TMSU as:

```text
Test Model Service Unit
```

and explicitly states that a TMSU is a packaging/conformance profile for a model capability, **not a new runtime middleware layer**.

Therefore the next manuscript version SHALL use `Test Model Service Unit (TMSU)` on first definition.

A second edit is required in Methods §2.1. The formula:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

is frozen, but the manuscript should not paraphrase or expand the six component abbreviations unless it uses the exact definitions from the frozen research protocol. Replace the current informal gloss with:

> The component identities and required artifacts follow the frozen research protocol; the equation is used here to emphasize that TMSU is a logical composition of contract, semantic, binding, evidence, test and provenance artifacts rather than a container or runtime middleware component.

This wording preserves the intended logic without redefining frozen terms.

## 3. Quantitative claim audit

| Manuscript quantity | Frozen evidence | Audit |
|---|---|---|
| BP-01 16/16 exact behavior preservation | BP-01 | PASS |
| MS-01 OpenEaagles 16/16 and RadarSimPublic 16/16 | MS-01 v2 | PASS |
| SP-01 5/5 injected semantic mismatches rejected | SP-01 | PASS |
| EQ-01 4/4 intended-use cases | EQ-01 | PASS |
| EB upper-core churn 0 vs 160 | EB-01 | PASS |
| EB direct core dependencies 0 vs 9 | EB-01 | PASS |
| EB reassessment scopes 1/4 vs 3/4 | EB-01 | PASS |
| EA evidence records 1→2→3→4→5 | EA-01 | PASS |
| VU-01a exact trace identity 8/16 | VU-01a | PASS |
| VU-01b normalized equivalence 16/16 + negative control rejected | VU-01b | PASS |
| LC old E2 CV and CA each 16/16 valid | LC-01 | PASS |
| LC normalized CV–CA equality 12/16; difference 4/16 | LC-01 | PASS |
| LC max range difference 109.0754918963 m | LC-01 | PASS |
| LC max range-rate difference 67.6107619584 m/s | LC-01 | PASS |
| LC challenge RMSE values | LC-01 | PASS; retain sensitivity-only wording |

No unsupported percentage engineer-time or enterprise-scale reuse claim appears in the frozen evidence architecture.

## 4. Inference-boundary audit

### BP/MS

The manuscript correctly distinguishes:

```text
wrapper transparency
!=
heterogeneous behavioral equivalence
```

and:

```text
architectural substitutability
!=
model fidelity equivalence
```

### SP/EQ

The manuscript correctly distinguishes structural, semantic and intended-use states and does not promote the real RF ambiguity beyond `UNKNOWN`.

### EB

The manuscript correctly states that TMSU did not necessarily contain less total code and does not translate churn/reassessment radius into engineer-hours.

### EA/VU

The manuscript correctly treats historical retention, current applicability and numerical equivalence as separate dimensions.

### LC

The manuscript correctly avoids claiming that CA is operationally superior. The accelerated-target RMSE result is used only to demonstrate that the algorithms are discriminable under the constructed challenge.

The manuscript also correctly leaves:

```text
CA kinematic intended use = UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

rather than turning fresh structural/architectural execution into model validation.

## 5. External-context audit

The manuscript's external context is supported by current authoritative sources:

### RAND enterprise M&S modernization

RAND RRA3261-1 states that Army M&S modernization is motivated by antiquated infrastructure and concerns about the ability to capture, curate and reuse M&S-generated information during acquisition. This supports the manuscript's modernization problem statement.

### MOSA

Current DoD/OUSD(R&E) MOSA material describes modular, loosely coupled architecture, open standards/conformance and component addition/modification/replacement across the lifecycle. This supports positioning TMSU as an implementation bridge below higher-level modular/open architecture objectives.

### DoDM 5000.102

The December 2024 manual requires T&E M&S V&V planning to address intended use, version control, capabilities, assumptions, limitations, uncertainty and response variables. This directly supports the study's use-relative and version-aware evidence organization.

### MIL-STD-3022

The standard provides a common VV&A documentation framework and explicitly supports consistency/reuse of information across accreditation-related products. This supports the paper's emphasis on evidence traceability and reuse, while also reinforcing that TMSU must not be presented as the accreditation authority.

## 6. Required manuscript edits before v0.2 freeze

1. Correct first expansion to `Test Model Service Unit (TMSU)`.
2. Remove informal expansion of `CP + SC + SP + EB + TP + PP`; cite the frozen protocol definition instead.
3. Use `Implementation_ID` consistently where the conformance profile does; avoid switching unnecessarily between `Model_Implementation_ID` and `Implementation_ID` unless the relationship is explicitly defined.
4. In the Abstract, retain “bounded” before modernization claims and avoid “validated model” wording.
5. In Discussion, explicitly state once that TMSU evidence screening supplies traceable inputs to trial-specific VV&A/accreditation but does not replace the accreditation decision.
6. Keep VU-01a as a negative methodological result and LC development-run failures in supplement/audit history rather than presenting them as defects of the upstream model.

## 7. Research decision

No new model, transport or API experiment is needed to correct these issues.

The next manuscript action is editorial/evidence integration:

```text
v0.1
-> terminology correction
-> source insertion
-> figures/tables from frozen artifacts
-> v0.2 evidence-locked manuscript
```

The empirical WP1 stopping rule remains unchanged.
