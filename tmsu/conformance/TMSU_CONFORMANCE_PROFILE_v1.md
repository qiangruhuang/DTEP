# TMSU Conformance Profile v1.0

Status: **Frozen profile — v1.0**

This profile defines the minimum evidence gates for a legacy or native model implementation to be registered as a Test Model Service Unit (TMSU) implementation under the SAL-aligned research prototype. A TMSU is a packaging/conformance profile for a model capability; it is not a new runtime middleware layer.

## 1. Units of conformance

The profile distinguishes:

- `Capability_ID`: stable logical capability, e.g. `sensor.tws.track`.
- `Implementation_ID`: a concrete executable/model implementation of that capability.
- `Contract_ID`: the declared input/output and lifecycle contract.
- `Semantic_Profile_ID`: the declared meaning, type, unit, reference frame and time basis of exchanged data.
- `Evidence_Set_ID`: immutable evidence bundle supporting a gate decision.

`Capability_ID != Implementation_ID` is mandatory. This separation is the prerequisite for model substitution.

## 2. Decision states

Each gate returns one of:

- `PASS`: all mandatory predicates satisfied with referenced evidence.
- `FAIL`: at least one mandatory predicate violated.
- `UNKNOWN`: required evidence is absent or cannot be evaluated.
- `WARN`: non-blocking issue; the implementation may proceed only if the gate explicitly permits warnings.

Registration conformance is distinct from trial-specific fitness-for-use and from authoritative accreditation.

## 3. BP-01 — Behavior Preservation

### Purpose

BP-01 tests whether introducing a TMSU wrapper/adapter around an existing deterministic legacy implementation changes the legacy behavior observable at the declared native evidence interface.

### Applicability

Mandatory for `M1 Wrap` and `M2 Adapt` migration paths when the TMSU boundary is added around an existing legacy implementation and behavior preservation is claimed.

For deterministic implementations the default comparison is exact trace identity. Stochastic implementations require a separately preregistered distributional-equivalence rule and are not covered by the deterministic decision rule below.

### Required frozen declarations

Before execution, the evidence set SHALL freeze:

1. `Capability_ID` and `Implementation_ID`;
2. implementation version/commit or binary digest;
3. wrapper/adapter version/digest;
4. execution environment and time configuration;
5. scenario envelope;
6. observational domain;
7. comparison metric and acceptance threshold;
8. permitted source changes, if any;
9. negative-control procedure for the comparator.

### Deterministic decision rule

For every paired case `i` in the declared evidence envelope:

```text
Y_legacy(i) == Y_TMSU(i)
D_byte(Y_legacy(i), Y_TMSU(i)) = 0
```

and all mandatory predicates below SHALL be satisfied.

| Predicate | Requirement |
|---|---|
| BP01-P1 | direct baseline executes successfully |
| BP01-P2 | repeated direct baseline is reproducible under the frozen deterministic configuration |
| BP01-P3 | wrapped/adapter execution completes successfully |
| BP01-P4 | declared native observable trace is non-empty / behavior-bearing |
| BP01-P5 | every matched baseline-versus-wrapper trace satisfies the preregistered equivalence rule |
| BP01-P6 | wrapper does not apply an undeclared transformation to the native evidence trace |
| BP01-P7 | comparator rejects a deliberately altered negative-control trace |
| BP01-P8 | source modifications are zero or exactly equal to the preregistered permitted patch set |
| BP01-P9 | blocking runtime/lifecycle warnings declared by the evidence profile are absent |
| BP01-P10 | evidence contains hashes/provenance sufficient to reproduce the decision |

Any failure of BP01-P1 through BP01-P10 yields `FAIL`. Missing evidence yields `UNKNOWN`.

### Frozen reference evidence

```text
Evidence_Set_ID: bp01.openeaagles.tws.2026-09-05.v1
Capability_ID: sensor.tws.track
Implementation_ID: openeaagles.tws.airtrkmgr@b3d7e74
Profile: Behavior Preservation Evidence v1.0
Cases: 16
Decision: PASS
```

Reference report: `mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md`.

## 4. MS-01 — Model Substitution

### Purpose

MS-01 tests whether a frozen upper-level trial can substitute one concrete implementation of a declared capability for another while preserving the upper trial specification, orchestration logic, capability contract and semantic profile.

MS-01 is an architectural/contract conformance gate. It does not assert behavioral equivalence, equal model fidelity, trial-specific fitness-for-use or authoritative accreditation.

### Applicability

MS-01 applies when two or more distinct `Implementation_ID`s claim the same `Capability_ID` and are intended to be selectable through TMSU capability binding.

A legacy `M1 Wrap` or `M2 Adapt` implementation SHALL satisfy its applicable BP-01 requirement before its MS-01 substitution evidence is accepted. A new independent implementation does not inherit BP-01 merely because it is invoked through a TMSU adapter; its model validity and trial suitability remain separate evidence questions.

### Required frozen declarations

Before execution, the substitution evidence SHALL freeze:

1. `Capability_ID`;
2. all participating `Implementation_ID`s;
3. `Contract_ID` and contract artifact digest;
4. `Semantic_Profile_ID`;
5. upper trial specification and digest;
6. orchestrator implementation and digest;
7. common scenario/case set;
8. implementation binding artifacts;
9. output conformance validator;
10. explicit statement of whether behavioral equality is or is not a trial requirement.

### Decision predicates

| Predicate | Requirement |
|---|---|
| MS01-P1 | all substituted runs use the identical frozen upper trial specification |
| MS01-P2 | all substituted runs use the identical frozen orchestrator |
| MS01-P3 | all implementations expose the same `Capability_ID` and `Contract_ID` |
| MS01-P4 | all implementations declare the same `Semantic_Profile_ID` for the exchanged capability data |
| MS01-P5 | participating `Implementation_ID`s are distinct and provenance demonstrates distinct implementations |
| MS01-P6 | the same frozen case set is executed for each implementation |
| MS01-P7 | every required case executes successfully for each implementation |
| MS01-P8 | every implementation output passes the same canonical contract validator |
| MS01-P9 | the model swap is isolated to implementation binding selection; frozen trial specification and orchestrator are not edited |
| MS01-P10 | evidence contains hashes/provenance sufficient to reproduce the substitution decision |

Any failure of MS01-P1 through MS01-P10 yields `FAIL`. Missing evidence yields `UNKNOWN`.

Behavioral equality is deliberately excluded from the universal MS-01 rule. If a particular test decision requires behavioral or statistical equivalence between implementations, that requirement SHALL be defined separately in the trial fitness-for-use criteria.

### Historical mechanism-development evidence

The original E2 v1 used a DTEP-authored independent reference implementation to prove that the binding-only substitution mechanism was executable:

```text
Evidence_Set_ID: ms01.tws.openeaagles-reference.2026-09-05.v1
Implementation_A: openeaagles.tws.airtrkmgr@b3d7e74
Implementation_B: dtep.reference_tws@1.0.0
Cases per implementation: 16
Upper trial artifacts modified for swap: 0
Binding selections changed: 1
Decision: PASS
```

Historical report: `mre2/model_substitution/E2_MODEL_SUBSTITUTION_EVIDENCE_v1.md`.

### Preferred real heterogeneous reference evidence

The stronger empirical reference replaces the DTEP-authored Reference TWS with independently developed public radar/tracking software from `Murmur-ops/RadarSimPublic` while retaining the same frozen E2 upper trial and the same MS-01 predicates:

```text
Evidence_Set_ID: ms01.tws.openeaagles-radarsimpublic.2026-09-05.v2
Capability_ID: sensor.tws.track
Implementation_A: openeaagles.tws.airtrkmgr@b3d7e74
Implementation_B: radarsimpublic.radar-kf@8b63f82
RadarSimPublic commit: 8b63f824a5744c1b3a3fca5e948fa7c59f897b17
Contract_ID: tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
Cases per implementation: 16
Upper trial artifacts modified for swap: 0
Binding selections changed: 1
Different cross-implementation traces: 16 / 16
Source patches A/B: 0 / 0
Decision: PASS
```

Evidence run: `33971627414`.

Tested DTEP head: `620fad4c934303a4682e97af7d5a42006a7c44e8`.

Reference report: `mre2/model_substitution/E2_MODEL_SUBSTITUTION_REAL_EVIDENCE_v2.md`.

The v2 result is the preferred reference for MS-01 because the second implementation is drawn from an independent public software/model codebase rather than authored inside DTEP. It still establishes architectural/contract substitutability only; it does not establish behavioral equivalence or equal model validity.

## 5. Gate relationship

The current minimum sequence for a wrapped legacy implementation is:

```text
BP-01 Behavior Preservation
          ↓
MS-01 Model Substitution
          ↓
Trial-specific fitness-for-use / VV&A / accreditation
```

BP-01 asks whether packaging preserves one legacy implementation's declared behavior. MS-01 asks whether implementation choice can change without rewriting the upper trial. Neither gate replaces the intended-use, validity, uncertainty or accreditation decisions required for a real test conclusion.
