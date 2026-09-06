# Main Tables v1.0

Status: **Evidence-locked manuscript tables**

Date: 2026-09-06

All quantitative entries are taken from frozen WP1 reports. These tables are intended for manuscript production; journal-specific formatting can be applied later without changing values or claim strength.

## Table 1. Capability, implementation and current evidence identity

| Capability_ID | Implementation_ID | Role | Contract_ID | Semantic_Profile_ID | Migration path | Current architectural state | Current kinematic-use state | RF semantic state |
|---|---|---|---|---|---|---|---|---|
| `sensor.tws.track` | `openeaagles.tws.airtrkmgr@b3d7e74` | real legacy OpenEaagles TWS + AirTrkMgr | `tmsu.sensor.tws.track.v1` | `tmsu.sensor.tws.track.semantic.v1` | M1 Wrap | BP-01 PASS; implementation available for MS-01 | bounded legacy/conformance evidence only; no new operational accreditation claim | native OpenEaagles RF observable retained; cross-model RF concept relation unresolved |
| `sensor.tws.track` | `radarsimpublic.radar-kf@8b63f82` | independent public RadarSimPublic constant-velocity configuration | `tmsu.sensor.tws.track.v1` | `tmsu.sensor.tws.track.semantic.v1` | M2 Adapt | MS-01 PASS; VU-01b current architectural claim carried forward by delta evidence | `QUALIFIED_WITHIN_EVIDENCE` for frozen kinematic research/conformance use after VU-01b | `UNKNOWN` for `rf.signal_to_noise_ratio ?= rf.track_average_signal` |
| `sensor.tws.track` | `radarsimpublic.radar-ca-kf@8b63f82` | RadarSimPublic constant-acceleration algorithm variant | `tmsu.sensor.tws.track.v1` | `tmsu.sensor.tws.track.semantic.v1` | M2 Adapt | `PASS_FRESH_EXECUTION` after LC-01 | `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE` | `UNKNOWN`; unchanged unresolved RF relation |

**Interpretation.** One stable capability identity is associated with multiple concrete implementations and implementation configurations. Architectural executability, semantic status and intended-use qualification remain separate state dimensions.

---

## Table 2. Frozen empirical evidence chain and inference boundaries

| Experiment | Primary question | Frozen intervention / test | Result | Quantitative anchor | Supported inference | Explicit boundary |
|---|---|---|---|---|---|---|
| **BP-01** | Can a real legacy capability be wrapped without changing declared observable behavior? | OpenEaagles native probe vs M1 wrapper over 2×2×2×2 scenario envelope | PASS | 16/16 exact behavior preservation; negative control rejected | Wrapper transparency within declared deterministic envelope | no hidden-state/universal equivalence; no accreditation |
| **MS-01 v2** | Can a real heterogeneous implementation replace the legacy implementation without upper-trial edits? | OpenEaagles vs independent RadarSimPublic CV under same trial/orchestrator/contract | PASS | 16/16 + 16/16 contract-valid; 0 upper-trial artifacts modified; 16/16 cross-implementation traces different | architectural/contract-level heterogeneous substitutability | not equal numerical behavior or fidelity |
| **SP-01** | Does structural validity imply semantic compatibility? | 5 injected semantic mismatches + positive control + real RF ambiguity | PASS | all 7 structurally PASS; 5/5 injected mismatches rejected; RF relation `UNKNOWN` | structural conformance is insufficient for semantic qualification | no automatic ontology/source-code semantic inference |
| **EQ-01** | Can qualification be conditioned on intended use and evidence scope? | four intended-use cases | PASS | 4/4 expected decisions; U1 qualified, U2/U3 unknown, U4 not qualified | same implementation can have different qualification states by use/domain | not authoritative accreditation |
| **EB-01** | Does TMSU reduce shared-core change and reassessment propagation in a controlled integration benchmark? | TMSU binding vs competent direct point-to-point RadarSimPublic integration | PASS | identical outputs 16/16; upper-core churn 0 vs 160 lines; direct core model refs 0 vs 9; semantic-update reassessment 1/4 vs 3/4 scopes | change locality and smaller declared evidence invalidation radius | not fewer total LOC or measured engineer-hours |
| **EA-01** | Can evidence accumulate without deletion while applicability changes selectively? | append-only replay of BP→MS→SP→EQ→EB plus controlled lifecycle changes | PASS | evidence-record count 1→2→3→4→5; 5/5 history retained under change cases; six final decision queries reconstructed | provenance can accumulate monotonically while qualification remains conditional | no enterprise-scale evidence repository claim |
| **VU-01a** | Is exact cross-run byte identity a reliable generic carry-forward criterion for the tested numerical traces? | repeated RadarSimPublic execution under provenance-only revision | **FAIL** | exact identity only 8/16 on final-head rerun | strict byte equality is too brittle for this cross-run numerical evidence | not proof that all simulations are non-bitwise reproducible |
| **VU-01b** | Can an evidence-type-aware delta criterion support one controlled version carry-forward? | exact discrete structure + 9-decimal numeric normalization + +1e-6 m negative perturbation | PASS | updated 16/16; normalized equivalence 16/16; negative control rejected | selective carry-forward feasible for one provenance-only adapter/binding revision | not universal delta-requalification; 9 decimals not a validity tolerance |
| **LC-01** | Where must automatic evidence inheritance stop? | RadarSimPublic CV→CA algorithm/`Implementation_ID` change with same repo commit, trial, contract and declared semantic mapping | PASS | CV 16/16; CA 16/16; 12/16 old-envelope traces equal; max maneuver separation 109.0755 m range and 67.6108 m/s range rate; automatic carry-forward rejected | substantive algorithm/identity change crosses tested carry-forward boundary; unaffected evidence remains reusable, affected fitness requires fresh evidence | does not establish general CA superiority; does not require complete evidence reset |

---

## Table 3. Tested lifecycle change-to-evidence-action profile

| Change class | Example in study/profile | Typical dependency effect | Historical evidence treatment | Current claim treatment | Empirical anchor |
|---|---|---|---|---|---|
| documentation / display metadata | non-semantic documentation update | no declared behavioral/semantic dependency intersection | retain all records | reuse original evidence | EA-01 controlled lifecycle case |
| adapter/binding provenance | `radarsimpublic_adapter.py` → `radarsimpublic_adapter_v2.py` with same model identity and semantic mapping | affects current execution/binding provenance path | retain prior records; affected records may become stale until checked | typed delta comparison may restore affected claim | VU-01a/b |
| execution environment | runner/platform change that may alter numerical representation | comparator/reproducibility dependency may change | retain historical evidence | evidence-type-appropriate reproducibility reassessment required | VU-01a exposes byte-identity risk; profile rule extrapolation only |
| semantic mapping | unit/frame/sign/time/concept mapping change | semantic and dependent intended-use claims affected | retain previous semantic evidence as history | semantic reassessment; downstream qualification recomputed | SP-01, EQ-01, EA-01 |
| model algorithm / `Implementation_ID` | CV KF → CA KF | implementation-specific behavior/fitness dependencies intersect change | CV evidence retained as historical/stale for CA | no automatic qualification inheritance; fresh affected evidence required | LC-01 |
| upper trial specification | change in frozen trial scenario/logic | trial-specific substitution/fitness evidence may no longer apply | retain old trial evidence historically | reassess affected trial-dependent claims | EQ-01/EA-01 dependency experiments |
| capability contract | change in declared trial-facing I/O/semantics | broad dependency intersection | retain old contract evidence historically | broad dependent-claim reassessment | EA-01 controlled lifecycle case |

**Note.** Table 3 is a research lifecycle profile derived from the tested TWS evidence chain, not a universal VV&A standard.

---

## Supplementary Table S1. EQ-01 intended-use decisions

| Use case | Required use | Observed state | Reason |
|---|---|---|---|
| U1 | kinematic research/conformance use within 10–20 km / 0–20° / 1–4 m² envelope | `QUALIFIED_WITHIN_EVIDENCE` | architectural substitution and kinematic semantic evidence available |
| U2 | RF-performance test decision using `average_signal_db` | `UNKNOWN` | unresolved RF concept + absent comparative model-validity evidence |
| U3 | use at 50 km | `UNKNOWN` | outside executed evidence domain |
| U4 | explicit conflicting range-unit mapping | `NOT_QUALIFIED` | semantic incompatibility |

---

## Supplementary Table S2. Evidence state after the two lifecycle-change experiments

| Evidence/claim | Before VU | After VU-01b | After LC-01 CA change |
|---|---|---|---|
| BP-01 legacy behavior preservation | ACTIVE | ACTIVE_FROM_ORIGINAL_EVIDENCE | ACTIVE_FROM_ORIGINAL_EVIDENCE |
| SP-01 semantic precheck | ACTIVE; RF relation UNKNOWN | ACTIVE_FROM_ORIGINAL_EVIDENCE; RF UNKNOWN | ACTIVE_FROM_ORIGINAL_EVIDENCE; RF UNKNOWN |
| MS-01 RadarSimPublic CV substitution | ACTIVE | `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE` | HISTORICAL/STALE for CA |
| EQ-01 CV kinematic intended use | `QUALIFIED_WITHIN_EVIDENCE` | `QUALIFIED_WITHIN_EVIDENCE` | HISTORICAL/STALE for CA |
| EB-01 CV change-radius result | ACTIVE/HISTORICAL reference | HISTORICAL for revised configuration | HISTORICAL/STALE for CA configuration |
| VU-01b CV carry-forward evidence | not yet present | ACTIVE evidence for provenance-only revision | HISTORICAL/STALE for CA implementation-specific path |
| CA architectural execution | not applicable | not applicable | `PASS_FRESH_EXECUTION` |
| CA kinematic intended use | not applicable | not applicable | `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE` |
| RF-performance use | UNKNOWN | UNKNOWN | UNKNOWN |
