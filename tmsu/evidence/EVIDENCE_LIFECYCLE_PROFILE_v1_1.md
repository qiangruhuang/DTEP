# TMSU Evidence Lifecycle Profile v1.1

Status: **Frozen profile amendment — v1.1**

This amendment preserves v1.0 and adds the real version-update carry-forward behavior validated by VU-01.

## 1. Core principle

The lifecycle objective is **controlled accumulation**, not automatic reuse and not automatic full revalidation.

Evidence history is retained monotonically:

```text
E_(t+1) = E_t union DeltaE
```

Current applicability is recomputed after every declared configuration change.

## 2. Real-change transition

For a controlled change `C`:

```text
1. identify evidence whose applicability dependencies intersect C;
2. mark those evidence sets STALE for the changed configuration;
3. propagate staleness through declared Depends_On links;
4. retain all prior evidence historically;
5. execute only the reassessment required to restore the current decision path;
6. append delta evidence rather than rewriting the old evidence set;
7. reconstruct the current decision from ACTIVE + delta evidence.
```

## 3. Carry-forward decision states

A current claim may be reported as:

- `ACTIVE_FROM_ORIGINAL_EVIDENCE`
- `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`
- `QUALIFIED_WITHIN_EVIDENCE`
- `UNKNOWN`
- `NOT_QUALIFIED`

A prior evidence set may simultaneously be `HISTORICAL` or `STALE` while a later delta evidence set restores the current claim.

## 4. Mandatory safeguards

Delta carry-forward SHALL NOT be used merely because a developer believes a change is harmless.

A carry-forward decision must freeze and test the properties that justify reuse, including as applicable:

```text
unchanged model/version identity
unchanged upper trial
unchanged capability contract
unchanged semantic profile/mapping
successful execution after change
output/behavior equivalence criterion where preservation is required
complete provenance to the evidence being reused
```

If these conditions cannot be established, the relevant gate remains `STALE` or `UNKNOWN` and a fuller reassessment is required.

## 5. UNKNOWN is orthogonal to version carry-forward

A successful version-update reassessment does not resolve an unrelated `UNKNOWN`.

Therefore:

```text
version update PASS
+ unresolved semantic evidence
-> semantic/intended-use UNKNOWN remains UNKNOWN
```

This prevents the lifecycle system from using successful maintenance activity as implicit evidence for a different claim.

## 6. Reference validation

VU-01 exercised v1.1 with a real RadarSimPublic adapter/binding revision:

```text
old adapter: radarsimpublic_adapter.py
new adapter: radarsimpublic_adapter_v2.py
old binding: 1.0.0
new binding: 1.1.0
upstream RadarSimPublic model commit: unchanged
upper trial / contract / semantic profile / semantic mapping: unchanged
updated cases passed: 16 / 16
new vs prior canonical traces: 16 / 16 byte-identical
reused without re-execution: BP-01, SP-01
delta reassessed: MS-01 architectural substitution, EQ-01 intended-use screening
RF-performance state after update: UNKNOWN
Decision: PASS
```

Reference report:

`research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md`

## 7. Interpretation

The evidence lifecycle is intended to make a model portfolio and its trial evidence **manageable over time**:

```text
versioned assets
-> dependency-aware evidence
-> selective staleness
-> delta reassessment
-> accumulated historical record
-> current intended-use decision
```

The profile does not claim that every change is small or that every major model revision can avoid full revalidation.
