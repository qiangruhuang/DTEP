# TMSU Evidence Lifecycle Profile v1.0

Status: **Frozen research profile — v1.0**

This profile defines how TMSU evidence is retained, linked and re-evaluated across model/trial changes. It is downstream of the existing BP-01, SP-01, MS-01 and EQ-01 profiles and does not redefine those gates.

## 1. Design objective

The primary objective is not to minimize source code or engineer time. It is to make evidence:

```text
manageable
traceable
cumulative
change-aware
intended-use aware
```

A model lifecycle should neither erase prior evidence after every change nor reuse old evidence unconditionally.

## 2. Two independent state dimensions

Evidence lifecycle state and qualification state SHALL be kept separate.

### 2.1 Evidence lifecycle state

- `ACTIVE`: retained evidence whose declared dependencies still match the current configuration.
- `STALE`: retained evidence whose applicability has been invalidated by a change in one or more declared dependencies.
- `SUPERSEDED`: retained evidence replaced by a later evidence set for the same claim/configuration scope.
- `HISTORICAL`: retained evidence not selected as the current evidence for a decision but preserved for audit and reconstruction.

`STALE`, `SUPERSEDED` and `HISTORICAL` do not mean the old experiment was scientifically false. They mean that the evidence is not currently selected as directly applicable to the present configuration/decision.

### 2.2 Qualification state

Qualification states remain separate, including:

```text
PASS
FAIL
COMPATIBLE
INCOMPATIBLE
QUALIFIED_WITHIN_EVIDENCE
NOT_QUALIFIED
UNKNOWN
```

In particular:

```text
UNKNOWN != STALE
```

`UNKNOWN` is a statement about evidence insufficiency for a claim or intended use. `STALE` is a statement about evidence applicability after configuration change.

## 3. Evidence record minimum fields

Each retained evidence record SHALL declare at least:

```text
Evidence_Set_ID
Gate / evidence class
Subject Capability_ID / Implementation_ID where applicable
Frozen result
Report/artifact location
Artifact/report digest
Depends_On evidence IDs
Applicability_Dependencies
Evidence envelope / intended-use scope where applicable
```

The research prototype uses an append-only logical ledger. Existing frozen evidence reports are referenced by digest and are not rewritten merely to add later evidence.

## 4. Accumulation rule

For evidence sets `E_t` and newly generated evidence `DeltaE`:

```text
E_(t+1) = E_t union DeltaE
```

Earlier evidence remains retained.

This is a provenance-monotonic rule. It does **not** imply qualification monotonicity.

A later evidence set may:

- support an existing claim;
- narrow its validity domain;
- expose an `UNKNOWN`;
- make an earlier result stale for a changed configuration;
- supersede an earlier evidence set while retaining it historically.

## 5. Change-impact rule

Each evidence set declares `Applicability_Dependencies`.

For change set `C`:

```text
C intersects Applicability_Dependencies(E)
    -> E becomes STALE for the changed configuration
```

Staleness propagates transitively through declared `Depends_On` links.

The evidence record itself SHALL remain retained.

Thus:

```text
invalidate applicability != delete evidence
```

## 6. Decision reconstruction rule

A current decision should be reconstructable as a minimal provenance path through active evidence.

Example from the frozen WP1 chain:

```text
Kinematic intended use
MS-01 -> SP-01 -> EQ-01
-> QUALIFIED_WITHIN_EVIDENCE

RF-performance intended use
MS-01 -> SP-01 -> EQ-01
-> UNKNOWN
```

A decision engine SHALL NOT use a later unrelated PASS to overwrite an unresolved earlier evidence gap.

## 7. UNKNOWN persistence rule

An `UNKNOWN` remains unresolved until evidence explicitly addressing the missing semantic relation, validity domain or required evidence class is added and accepted.

Therefore:

```text
later unrelated evidence
!=
resolution of UNKNOWN
```

This rule prevents a last-write-wins trust model.

## 8. Reference evidence

EA-01 provides the first bounded validation of this profile:

```text
Evidence_Set_ID:
ea01.tws.evidence-accumulation.2026-09-06.v1

Frozen evidence records: 5
Final decision queries reconstructed: 6 / 6
Prior frozen reports modified by accumulation layer: 0
Historical retention under all controlled changes: 5 / 5
Deleted historical records: 0
Real RF UNKNOWN preserved through later evidence: yes
Decision: PASS
```

Reference report:

`research/EA01_EVIDENCE_ACCUMULATION_EVIDENCE_v1.md`

## 9. Relationship to Digital Trial Thread

The evidence ledger is a thin research realization of the evidence portion of the Digital Trial Thread. It is not a new runtime middleware service.

A fuller trial thread may connect:

```text
Research Question
-> Requirement
-> Scenario Version
-> Model Version
-> Data Version
-> Semantic Mapping
-> Adapter / Binding
-> Execution Environment
-> Parameters / Seed
-> Run
-> Raw / Derived Output
-> Evidence Set
-> Qualification / VV&A conclusion
```

EA-01 validates only the cumulative evidence-management logic around the existing WP1 artifacts.

## 10. Boundary

This profile is a research conformance/lifecycle profile. It does not replace configuration management policy, authoritative VV&A governance, accreditation authority, or enterprise records-management requirements.
