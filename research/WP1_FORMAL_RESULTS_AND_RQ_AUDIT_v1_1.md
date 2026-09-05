# WP1 Formal Results and Research-Question Audit v1.1

Status: **Post-SP-01 evidence audit**

Date: 2026-09-05

This update retains the BP-01 and MS-01 conclusions from v1.0 and adds SP-01 as the formal WP1 semantic-interoperability result. No additional model, API, broker, transport, registry, or orchestration mechanism is introduced.

## 1. Formal WP1 evidence now available

### R1 — BP-01 Behavior Preservation

- OpenEaagles TWS legacy capability;
- 16/16 frozen cases behavior-bearing;
- 16/16 baseline-versus-wrapper native traces byte-identical;
- zero OpenEaagles source patches;
- negative control rejected;
- result: `BP-01 = PASS`.

Supported inference: the tested external TMSU wrapper is behavior-transparent within the frozen observational envelope.

### R2 — MS-01 Real Heterogeneous Model Substitution

- OpenEaagles TWS and independent RadarSimPublic Radar/KF;
- 16/16 cases execute for each implementation;
- both pass the same frozen structural/canonical validator;
- upper trial artifacts changed for swap: 0;
- binding selections changed: 1;
- result: `MS-01 = PASS`.

Supported inference: real heterogeneous architectural/contract substitution is demonstrated within the frozen E2 envelope.

### R3 — SP-01 Semantic Precheck Ablation

A structural-only arm was compared against a semantic-precheck arm using the frozen `sensor.tws.track` semantic target.

Result:

```text
all cases structural PASS:             7 / 7
injected semantic mismatches rejected: 5 / 5
detection rate:                         1.00
positive semantic control:              COMPATIBLE
real RadarSimPublic RF ambiguity:       UNKNOWN
SP-01 decision:                         PASS
```

The five preregistered mismatches were unit (`m/km`), angular unit (`rad/deg`), range-rate sign convention, reference frame, and time basis. Structural validation accepted all five; semantic validation rejected all five.

The real control was more important: `Radar.snr(range, rcs)` mapped to the canonical `average_signal_db` field was not assumed to be equivalent to `rf.track_average_signal`; the precheck returned `UNKNOWN` because equivalence evidence was absent.

Supported inference: semantic precheck can detect declared semantic mismatches beyond structural validation and can refuse to overclaim compatibility when real concept equivalence is unresolved.

## 2. RQ audit after SP-01

| RQ | Status | Current evidence | Remaining gap |
|---|---|---|---|
| **RQ1 Minimum contract** | **Partially answered** | One stable capability/contract plus controlled semantic declarations supports C++ OpenEaagles and Python/NumPy RadarSimPublic. The identity separation `Capability_ID != Implementation_ID` is empirically useful. | Current contract is demonstrated sufficient, not proven mathematically/minimally necessary. Evidence remains one capability class. |
| **RQ2 Composition / substitution** | **Substitution strongly supported** | MS-01 demonstrates binding-only real heterogeneous substitution with zero upper-trial edits. | Multi-capability composition is still untested; no claim should be made unless needed by the final paper. |
| **RQ3 Semantic interoperability** | **Bounded positive answer** | SP-01: structural arm passed all 7 cases; semantic precheck rejected 5/5 injected mismatches and returned `UNKNOWN` for the real unresolved RF concept mapping. | No automatic semantic inference from arbitrary source code; no ontology-completeness claim; unresolved real concepts still require evidence. |
| **RQ4 Trust / evidence reuse** | **Foundation only** | Immutable evidence sets now exist for behavior preservation, substitution, and semantic qualification, with hashes, decision states, provenance and inference boundaries. | No intended-use/validity-domain qualification or change-impact evidence-reuse experiment yet. |
| **RQ5 T&E engineering benefit** | **Not answered** | One local indicator exists: substitution required zero upper-trial edits. | No paired before/after evidence for engineer time, manual steps, integration/update effort, bespoke interfaces, reuse rate or evidence-discovery burden. |

## 3. Hypothesis audit after SP-01

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1 integration time lower** | Untested | no paired engineering baseline |
| **H2 upper-level change cost approaches zero on swap** | Supported in one bounded real heterogeneous case | zero upper-trial edits; one binding selection |
| **H3 reuse rate higher** | Untested | no repeated integration/update denominator |
| **H4 semantic precheck detects structural-valid mismatch** | **Supported in the preregistered SP-01 ablation** | 5/5 injected semantic mismatches structurally accepted and semantically rejected; real ambiguity returned `UNKNOWN` |
| **H5 machine-assisted fitness-for-use** | Untested | evidence gates exist, but intended-use/validity qualification has not been evaluated |
| **H6 Golden Scenario preservation** | Partially supported | BP-01 16/16 exact identity within the deterministic wrapper envelope |

## 4. Important revision to the interpretation of MS-01

SP-01 reveals that equality of `Semantic_Profile_ID` is not semantic evidence by itself.

Therefore the real heterogeneous OpenEaagles/RadarSimPublic result shall now be reported as:

```text
MS-01 architectural substitution: PASS
SP-01 RF semantic qualification:  UNKNOWN
Combined status:
ARCHITECTURALLY_SUBSTITUTABLE / SEMANTICALLY_UNRESOLVED
```

This does not retract MS-01. It prevents an architectural result from being misreported as semantic or model-validity equivalence.

## 5. What WP1 can now legitimately claim

WP1 has empirical evidence for three bounded properties:

1. **behavior preservation** of one real legacy wrapper (`BP-01`);
2. **real heterogeneous implementation substitution** without upper-trial rewrite (`MS-01`);
3. **semantic fail-safe precheck** that distinguishes structural validity from semantic compatibility (`SP-01`).

WP1 still cannot claim enterprise-wide minimum-contract optimality, multi-capability composability, fitness-for-use/VV&A reuse, or measured engineering savings.

Recommended current paper claim:

> A SAL-aligned TMSU conformance approach can preserve the observable behavior of a wrapped legacy capability, substitute an independently implemented heterogeneous model without rewriting the upper trial, and reject or quarantine structurally valid bindings with incompatible or unresolved semantics within a frozen experimental envelope.

## 6. Next evidence bottleneck

After SP-01, adding more sensor implementations or more transport mechanisms has low marginal research value.

The next unresolved claim most central to the phrase **test-grade / trusted service** is RQ4/H5, not another substitution case. A minimal next experiment, if approved, should therefore be an evidence-aware intended-use/change-impact qualification test using the existing BP-01, MS-01 and SP-01 evidence sets rather than adding a new model.

That experiment should only begin after explicit approval; this audit does not implement it.
