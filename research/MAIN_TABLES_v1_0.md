# Main Tables v1.0

Status: **Submission-production tables; WP1 evidence locked**

## Table 1. Capability, implementation and current evidence identity

| Trial-facing capability | Implementation | Implementation_ID | Migration / change class | Contract / semantic profile | Evidence anchors | Current bounded state |
|---|---|---|---|---|---|---|
| `sensor.tws.track` | OpenEaagles TWS + AirTrkMgr | `openeaagles.tws.airtrkmgr@b3d7e74` | M1 Wrap | `tmsu.sensor.tws.track.v1` / `tmsu.sensor.tws.track.semantic.v1` | BP-01, MS-01 | Behavior-preserved within frozen BP envelope; architecturally substitutable within MS-01 |
| `sensor.tws.track` | RadarSimPublic radar + CV KF | `radarsimpublic.radar-kf@8b63f82` | M2 Adapt | same frozen contract/profile | MS-01, SP-01, EQ-01, EB-01, EA-01, VU-01b | Kinematic research use `QUALIFIED_WITHIN_EVIDENCE`; RF-performance use `UNKNOWN` |
| `sensor.tws.track` | RadarSimPublic radar + CA KF | `radarsimpublic.radar-ca-kf@8b63f82` | substantive `MODEL_ALGORITHM` + `Implementation_ID` change | same frozen contract/profile | LC-01 | Architecture `PASS_FRESH_EXECUTION`; kinematic fitness `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`; RF state `UNKNOWN` |

**Interpretation.** `Capability_ID` remains stable while concrete implementation identity and qualification state change. Shared contract identity is therefore not treated as evidence of equal behavior, equal fidelity or inherited qualification.

---

## Table 2. Frozen experiment chain and allowed inference

| Experiment | Primary question | Frozen result | Quantitative anchor | Supported inference | Explicit boundary |
|---|---|---|---|---|---|
| BP-01 | Can a real legacy capability be wrapped without altering declared observable behavior? | PASS | 16/16 exact; negative control rejected | Transparent wrapping is achievable in the frozen deterministic observation envelope | no hidden-state/universal equivalence; no accreditation |
| MS-01 | Can genuinely heterogeneous implementations execute behind one stable upper trial? | PASS | OpenEaagles 16/16; RadarSimPublic 16/16; upper-trial edits = 0; cross-implementation traces different 16/16 | Bounded architectural/contract substitution with binding-only selection | no equal fidelity or semantic-qualified substitutability |
| SP-01 | Does structural validity imply semantic compatibility? | PASS | 5/5 injected mismatches rejected; positive control compatible; real RF relation `UNKNOWN` | Structural conformance is separable from semantic qualification | no automatic ontology/source-code semantic inference |
| EQ-01 | Does one model have one global qualification state? | PASS | 4/4 intended-use cases matched | Qualification is intended-use and evidence dependent | not authoritative accreditation |
| EB-01 | Does TMSU reduce uncontrolled change propagation? | PASS | upper-core churn 0 vs 160; direct model refs 0 vs 9; reassessment scopes 1/4 vs 3/4 | TMSU isolates model-specific change and narrows declared reassessment radius | no lower-total-LOC, engineer-time or cost claim |
| EA-01 | Can evidence accumulate without deleting history while applicability changes? | PASS | evidence records 1→2→3→4→5; all prior records retained; RF `UNKNOWN` persists | Provenance can accumulate monotonically while qualification remains selective | no enterprise-scale evidence repository claim |
| VU-01a | Is exact byte identity a robust generic cross-run carry-forward rule? | **FAIL** | exact trace identity 8/16 on repeated run | Comparator criteria themselves require qualification | does not imply all numerical simulations are non-bitwise reproducible |
| VU-01b | Can typed delta evidence support one controlled revision? | PASS | normalized equivalence 16/16; +1e-6 m negative control rejected | Selective carry-forward is possible for the tested provenance-only revision | not a universal delta-requalification rule |
| LC-01 | Where must carry-forward stop after substantive implementation change? | PASS for stop-rule test | CV 16/16; CA 16/16; 12/16 normalized equal; maneuver max differences 109.0755 m and 67.6108 m/s | Algorithm/Implementation_ID change crosses automatic inheritance boundary; unaffected evidence may remain active | maneuver is discrimination control, not operational validation or proof of CA superiority |

---

## Table 3. Lifecycle change–evidence action matrix

| Change class | Representative example | Default evidence consequence | Required action | Empirical anchor |
|---|---|---|---|---|
| Documentation / display metadata | label or non-behavior descriptive field | evidence remains applicable | reuse original evidence | EA-01 |
| Adapter/binding provenance only | VU adapter/binding revision with same model identity and semantics | affected architectural/current-use claims may become stale while unrelated evidence remains active | typed delta reassessment with comparator sensitivity control | VU-01a/b |
| Execution-environment numerical representation | same deterministic numerical logic on non-bitwise-identical runner | exact-byte rule may be inappropriate | use preregistered evidence-type-aware equivalence; retain negative control | VU-01a/b |
| Semantic mapping | unit/frame/sign/time/concept declaration changes | semantic and dependent intended-use claims affected | SP-style semantic reassessment; preserve unresolved `UNKNOWN` | SP-01, EQ-01, EA-01 |
| Model algorithm / Implementation_ID | CV KF → CA KF | implementation-specific prior evidence becomes historical/stale for changed configuration | reject automatic qualification inheritance; obtain fresh affected execution/behavior/fitness evidence | LC-01 |
| Upper trial specification | trial/scenario requirement changes | trial-specific substitution/fitness evidence affected | reassess dependent trial-composition and intended-use claims | EA-01 dependency replay |
| Capability contract | input/output or capability requirement changes | broad dependent evidence intersection | broad affected-claim reassessment; no blind inheritance | EA-01 dependency replay |

**Lifecycle rule.** Historical evidence is retained even when it is stale for the current configuration. Reassessment scope is driven by declared dependency intersection, not by a global “reuse everything” or “rerun everything” rule.
