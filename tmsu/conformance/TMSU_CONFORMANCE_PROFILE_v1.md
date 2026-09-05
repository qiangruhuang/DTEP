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

`Capability_ID != Implementation_ID` is mandatory. This separation is the prerequisite for later model substitution.

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

### Evidence artifacts

A conforming deterministic BP-01 evidence set SHOULD contain at least:

- paired baseline and wrapped traces;
- scenario/configuration artifacts;
- executable/model and adapter digests;
- comparator report;
- negative-control report;
- runtime stderr/warning record;
- per-case decision matrix;
- machine-readable summary with evidence hashes.

## 4. Frozen reference evidence: OpenEaagles TWS

The first frozen BP-01 evidence set is:

```text
Evidence_Set_ID: bp01.openeaagles.tws.2026-09-05.v1
Capability_ID: sensor.tws.track
Implementation_ID: openeaagles.tws.airtrkmgr@b3d7e74
Profile: Behavior Preservation Evidence v1.0
Cases: 16
Decision: PASS
```

Evidence envelope:

```text
OpenEaagles commit: b3d7e74a9bf52934e13fd6a11f45dc9767ac9192
Host: native headless Station
Rate: 50 Hz
Length: 500 frames
Distance: {10 km, 20 km}
Azimuth: {0 deg, 20 deg}
RCS: {1 m^2, 4 m^2}
Motion: {static, closing 150 m/s}
Observables: {track_count, track_id, range, range_rate,
              relative_azimuth, elevation, quality, average_signal}
```

All 16 paired cases satisfied `D_byte = 0`; all contained native track behavior; all Station lifecycle warnings were absent; the deliberately changed negative control was rejected. OpenEaagles model source patch count was zero.

Reference report: `mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md`.

## 5. Relationship to model substitution

BP-01 establishes wrapper transparency for one implementation. It does **not** establish that two different implementations are interchangeable.

Model substitution is evaluated separately by E2. E2 freezes the upper trial specification and orchestrator, then changes only the capability binding from one `Implementation_ID` to another. E2 evaluates contract/semantic compatibility and change isolation; it does not require the two models to produce identical behavior unless a trial explicitly declares such a requirement.

A model implementation that passes BP-01 may therefore still fail an E2 substitution test because of contract, semantic, lifecycle, data, or trial-fitness incompatibility.
