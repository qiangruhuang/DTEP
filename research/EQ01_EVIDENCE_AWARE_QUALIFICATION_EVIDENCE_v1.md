# EQ-01 Evidence-Aware Qualification & Reuse Evidence v1.0

Status: **Frozen result: PASS**

Research target: **RQ4 / H5**

Evidence run:

- DTEP branch: `eq01-evidence-aware-qualification-reuse`
- GitHub Actions run: `33998600234`
- Tested DTEP head: `a3f3ac47f5a8b6f8a9e2b93dbe59e651a1591731`
- Artifact: `eq01-evidence-aware-qualification-reuse`
- Artifact ID: `9978795799`
- Artifact SHA-256: `8253f1372998b5e470143580793069025e66590903b9668fcb55a5f8f96785c1`

## 1. Claim under test

EQ-01 asks whether existing machine-readable evidence from BP-01, MS-01 and SP-01 can be reused to make conservative intended-use-dependent screening decisions and to selectively identify which evidence gates require reassessment after controlled changes.

The screen deliberately separates:

```text
conformance evidence
!=
operational model validity / accreditation
```

The three qualification outcomes are:

```text
QUALIFIED_WITHIN_EVIDENCE
NOT_QUALIFIED
UNKNOWN
```

`UNKNOWN` means that no explicit incompatibility necessarily exists, but the current evidence is insufficient for the requested use. It is not promoted to qualified by default.

## 2. Frozen evidence inputs

EQ-01 references the existing reports and records their SHA-256 values at execution time:

```text
BP-01 report SHA-256
0526705b4fa5e33d5dcf61719e19eacb5b095b052f509a2588f88151764e814d

MS-01 report SHA-256
54d066329bc293a23f39cd2601a2d6e78382f47b36fe8e3a84ea99b75ac33589

SP-01 report SHA-256
4f5d4ae561179bee9e3b30a206c1f49aa5d4cda61c44045ff2811cd45a0e9ca7
```

No new model, transport, API, broker or orchestration mechanism was introduced.

## 3. Intended-use qualification cases

### U1 — architectural tracking use within the executed envelope

Requested use:

- research/conformance demonstration only;
- RadarSimPublic implementation;
- required observables: `range_m`, `range_rate_mps`, `relative_azimuth_rad`;
- domain limited to the frozen 10–20 km / 0–20° / 1–4 m² E2 envelope;
- required evidence classes: architectural substitution + semantic precheck.

Decision:

```text
QUALIFIED_WITHIN_EVIDENCE
```

This does **not** mean the radar model is operationally validated. It means the requested research/conformance use is supported by the currently declared evidence.

### U2 — RF output used for a radar-performance test decision

Requested use requires `average_signal_db` and comparative model-validity evidence.

Decision:

```text
UNKNOWN
```

Reason codes:

```text
SEM-UNKNOWN: average_signal_db
EVIDENCE-ABSENT: comparative_model_validity
```

This carries forward the real SP-01 ambiguity:

```text
rf.signal_to_noise_ratio
?=
rf.track_average_signal
```

The same implementation that is evidence-sufficient for U1 is therefore not automatically qualified for U2.

### U3 — 50 km use outside the executed envelope

Decision:

```text
UNKNOWN
```

Reason:

```text
DOMAIN-OUTSIDE-EVIDENCE
```

The screen does not extrapolate the 10–20 km evidence to 50 km.

### U4 — explicit semantic conflict

A conflicting range-unit declaration is injected while the structural contract remains otherwise usable.

Decision:

```text
NOT_QUALIFIED
```

Reason:

```text
SEM-INCOMPATIBLE: range_m
```

## 4. Qualification result

All four preregistered cases matched the expected decision:

| Case | Expected | Observed |
|---|---|---|
| U1 | QUALIFIED_WITHIN_EVIDENCE | QUALIFIED_WITHIN_EVIDENCE |
| U2 | UNKNOWN | UNKNOWN |
| U3 | UNKNOWN | UNKNOWN |
| U4 | NOT_QUALIFIED | NOT_QUALIFIED |

Summary:

```text
qualification cases matched: 4 / 4
EQ-01 qualification arm: PASS
```

The result demonstrates that qualification is use-relative rather than a static property of a model implementation.

## 5. Evidence-reuse / change-impact experiment

A frozen dependency map was applied to BP-01, SP-01 and MS-01 under four controlled changes.

| Change | BP-01 | SP-01 | MS-01 |
|---|---|---|---|
| display/documentation metadata only | REUSE | REUSE | REUSE |
| semantic mapping change | REUSE | REASSESS | REUSE |
| wrapper/adapter executable change | REASSESS | REUSE | REASSESS |
| upper trial specification change | REUSE | REUSE | REASSESS |

All four change cases matched the preregistered dependency rule.

Across 12 gate-change cells:

```text
REUSE:       8 / 12
REASSESS:    4 / 12
reuse fraction: 0.6667
naive full reassessment cells: 12
selectively avoided reassessment cells: 8
```

This is evidence of **selective evidence invalidation/reuse under a declared dependency graph**. It is not a measured engineer-time or cost-savings study.

## 6. Supported inference

Within the frozen research evidence base, machine-readable evidence can:

1. produce intended-use-dependent screening outcomes rather than one global trust label;
2. return `UNKNOWN` when semantic, validity or domain evidence is insufficient;
3. return `NOT_QUALIFIED` on explicit incompatibility;
4. reuse unaffected evidence while selectively requiring reassessment of evidence touched by a controlled change.

This provides bounded positive support for H5 as an **evidence-aware fitness-for-use screening mechanism**.

## 7. Why the real UNKNOWN matters

The most informative case is U2. RadarSimPublic is structurally substitutable and semantically adequate for the kinematic observables needed by U1, but the same implementation becomes `UNKNOWN` when a test decision depends on the unresolved RF concept and comparative-validity evidence.

Thus:

```text
same model + same binding
+ different intended use
-> different qualification decision
```

The result supports a central test-grade principle:

> absence of a detected conflict is not evidence of fitness for an intended use.

## 8. Boundary of inference

EQ-01 does not establish:

- the physical validity of RadarSimPublic or OpenEaagles for an operational radar decision;
- authoritative VV&A or accreditation;
- enterprise-wide evidence-reuse rates;
- reduced engineer-hours or integration time;
- optimality/completeness of the evidence dependency graph.

Those are separate claims. In particular, RQ5/H1 remain untested by EQ-01.

## 9. Evidence identity

```text
Evidence_Set_ID:
eq01.tws.evidence-aware-qualification.2026-09-06.v1

CI Run:
33998600234

Tested DTEP head:
a3f3ac47f5a8b6f8a9e2b93dbe59e651a1591731

Artifact ID:
9978795799

Artifact SHA-256:
8253f1372998b5e470143580793069025e66590903b9668fcb55a5f8f96785c1
```
