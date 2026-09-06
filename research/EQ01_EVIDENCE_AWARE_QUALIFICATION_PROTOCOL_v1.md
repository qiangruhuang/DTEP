# EQ-01 Evidence-Aware Qualification & Reuse Protocol v1.0

Status: **Preregistered minimal experiment**

Research target: **RQ4 / H5**

## Purpose

EQ-01 tests whether existing machine-readable BP-01, MS-01 and SP-01 evidence can support a bounded intended-use screening decision and selective evidence reuse after controlled changes, without treating conformance evidence as operational accreditation.

The experiment deliberately reuses the existing OpenEaagles/RadarSimPublic evidence base. It adds no model, transport, API, broker, registry service or orchestration mechanism.

## Qualification decision states

```text
QUALIFIED_WITHIN_EVIDENCE
NOT_QUALIFIED
UNKNOWN
```

`UNKNOWN` means that no explicit incompatibility necessarily exists, but the available evidence is insufficient for the requested intended use. `UNKNOWN` is not promoted to qualified by default.

## Qualification rule

For a candidate implementation `M`, intended use `U` and evidence set `E`, the screen checks:

```text
required semantics(U) supported by E
requested domain(U) contained in an executed evidence envelope
required evidence classes(U) present in E
```

The precedence is:

```text
explicit semantic conflict -> NOT_QUALIFIED
semantic unknown / domain outside evidence / required evidence absent -> UNKNOWN
otherwise -> QUALIFIED_WITHIN_EVIDENCE
```

The output is an evidence-sufficiency screening result only. It is not authoritative VV&A or accreditation.

## Preregistered intended-use cases

| Case | Intended use | Expected decision |
|---|---|---|
| U1 | architectural substitution demonstration, track kinematics, within frozen E2 envelope | QUALIFIED_WITHIN_EVIDENCE |
| U2 | RF signal output used for a radar performance test decision | UNKNOWN |
| U3 | substitution demonstration at 50 km, outside frozen E2 execution envelope | UNKNOWN |
| U4 | explicit conflicting range-unit declaration | NOT_QUALIFIED |

U2 intentionally carries forward the real SP-01 ambiguity: RadarSimPublic `rf.signal_to_noise_ratio` has not been proven equivalent to the canonical `rf.track_average_signal` concept. It additionally requests comparative model-validity evidence, which is absent from the current evidence base.

## Preregistered evidence-reuse changes

The experiment also evaluates change impact over the existing gates BP-01, SP-01 and MS-01.

| Change | BP-01 | SP-01 | MS-01 |
|---|---|---|---|
| C1 display/documentation metadata only | REUSE | REUSE | REUSE |
| C2 semantic mapping change | REUSE | REASSESS | REUSE |
| C3 wrapper/adapter executable change | REASSESS | REUSE | REASSESS |
| C4 upper trial specification change | REUSE | REUSE | REASSESS |

The gate dependency map is frozen before execution. A gate is `REASSESS` only when the changed dimensions intersect its declared evidence dependencies; otherwise its evidence is `REUSE`.

Across four changes and three gates there are 12 gate-change cells. The preregistered expectation is:

```text
REUSE = 8 / 12
REASSESS = 4 / 12
```

This is a selective-invalidation experiment, not a measured engineer-time study. It therefore does not answer RQ5 or H1/H3.

## Decision rule

EQ-01 passes only if:

1. all four intended-use screens match the preregistered decision;
2. all four change-impact cases match the preregistered reuse/reassess pattern;
3. the referenced BP-01, MS-01 and SP-01 evidence reports exist and are hashed in the evidence output.

## Boundary of inference

A PASS would support the claim that machine-readable evidence can provide a conservative, intended-use-dependent screening function and can selectively bound requalification after controlled changes. It would not prove underlying radar-model validity, operational fitness, accreditation, or enterprise-level cost savings.
