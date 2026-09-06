# Intended-Use Qualification Profile v1.0

Status: **Frozen screening profile — v1.0**

This profile is downstream of TMSU Conformance Profile v1.1. It does not change BP-01, SP-01 or MS-01. It defines how their evidence may be screened against a declared intended use and how evidence may be selectively reused after controlled changes.

## 1. Separation of concerns

The profile distinguishes:

```text
Registration / conformance evidence
    BP-01 / SP-01 / MS-01

from

Intended-use evidence sufficiency screening
    EQ-01

from

Authoritative VV&A / accreditation
```

A positive EQ-01 screening decision is not accreditation.

## 2. Screening decision states

- `QUALIFIED_WITHIN_EVIDENCE`: all evidence classes required by the declared research/test use are present, required semantics are compatible, and the requested domain is contained within the relevant evidence envelope.
- `NOT_QUALIFIED`: an explicit incompatibility is present in a required dimension.
- `UNKNOWN`: no explicit incompatibility necessarily exists, but required semantic, validity, domain or provenance evidence is missing/unresolved.

`UNKNOWN` is fail-safe and SHALL NOT be silently promoted to `QUALIFIED_WITHIN_EVIDENCE`.

## 3. Intended-use decision function

For candidate implementation `M`, intended use `U` and available evidence `E`:

```text
Q(M,U,E) -> {
  QUALIFIED_WITHIN_EVIDENCE,
  NOT_QUALIFIED,
  UNKNOWN
}
```

The screen evaluates:

```text
RequiredObservables(U) ⊆ SemanticallySupported(M,E)
RequestedDomain(U)     ⊆ EvidenceEnvelope(M,E)
RequiredEvidence(U)    ⊆ AvailableEvidence(M,E)
```

Decision precedence:

```text
explicit semantic conflict
  -> NOT_QUALIFIED

semantic unknown OR domain outside evidence OR required evidence absent
  -> UNKNOWN

otherwise
  -> QUALIFIED_WITHIN_EVIDENCE
```

## 4. Evidence-reuse rule

Each evidence gate declares its dependency dimensions. A controlled change invalidates only those gates whose declared dependencies intersect the changed dimensions.

```text
changed_dimension ∩ gate_dependencies != empty
    -> REASSESS
otherwise
    -> REUSE
```

This is impact-bounded requalification. It is not blind inheritance and not automatic full revalidation.

## 5. Reference evidence

```text
Evidence_Set_ID:
eq01.tws.evidence-aware-qualification.2026-09-06.v1

Research target:
RQ4 / H5

CI Run:
33998600234

Tested DTEP head:
a3f3ac47f5a8b6f8a9e2b93dbe59e651a1591731

Qualification cases matched:
4 / 4

Change-impact cases matched:
4 / 4

Gate-change cells:
12

Evidence reused:
8 / 12

Evidence reassessed:
4 / 12

Decision:
PASS
```

Reference report: `research/EQ01_EVIDENCE_AWARE_QUALIFICATION_EVIDENCE_v1.md`.

## 6. Current RadarSimPublic example

The current evidence base yields different outcomes for the same implementation depending on intended use:

```text
U1: kinematic architectural-substitution research use
    -> QUALIFIED_WITHIN_EVIDENCE

U2: RF performance test decision
    -> UNKNOWN
```

U2 remains unresolved because the required RF concept relation is not proven and comparative model-validity evidence is absent.

This is the intended behavior of the profile: trust is relative to the requested use and available evidence, not a permanent binary label attached to a model.

## 7. Preserved boundary

This profile supports evidence sufficiency screening and change-impact reuse decisions only. It does not establish physical model validity, replace authoritative VV&A, or confer accreditation for an acquisition/operational decision.
