# TMSU Evidence Lifecycle Profile v1.1

Status: **Corrected frozen profile amendment — v1.1**

This amendment preserves v1.0 and adds the real version-update carry-forward behavior tested by VU-01a/VU-01b.

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
5. select an evidence-type-appropriate reassessment criterion;
6. execute only the reassessment required to restore the current decision path;
7. append delta evidence rather than rewriting the old evidence set;
8. reconstruct the current decision from ACTIVE + delta evidence.
```

## 3. Carry-forward decision states

A current claim may be reported as:

- `ACTIVE_FROM_ORIGINAL_EVIDENCE`
- `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`
- `QUALIFIED_WITHIN_EVIDENCE`
- `UNKNOWN`
- `NOT_QUALIFIED`

A prior evidence set may simultaneously be `HISTORICAL` or `STALE` while later delta evidence restores a current claim.

## 4. Evidence-type-aware comparison rule

VU-01a demonstrated that a carry-forward rule can itself be wrong: exact byte identity of a floating-point numerical trace was not stable across repeated runners, even though the observed differences were at machine-precision scale.

Therefore a preservation/carry-forward comparison SHALL be typed to the evidence and execution behavior.

Examples include:

```text
deterministic + bitwise-controlled environment
    -> exact byte identity may be valid

numerical deterministic model across non-bitwise-identical environments
    -> preregistered numerical equivalence / normalized representation

stochastic model
    -> frozen seed where scientifically appropriate,
       or preregistered distributional equivalence
```

A comparator SHALL include a sensitivity/negative control where practical. A weak comparison rule must not be introduced merely to force a prior result to pass.

## 5. Mandatory safeguards

Delta carry-forward SHALL NOT be used merely because a developer believes a change is harmless.

A carry-forward decision must freeze and test properties that justify reuse, including as applicable:

```text
unchanged model/version identity
unchanged upper trial
unchanged capability contract
unchanged semantic profile/mapping
successful execution after change
evidence-type-appropriate output/behavior comparison
comparator sensitivity control
complete provenance to the evidence being reused
```

If these conditions cannot be established, the relevant gate remains `STALE` or `UNKNOWN` and fuller reassessment is required.

## 6. UNKNOWN is orthogonal to version carry-forward

A successful version-update reassessment does not resolve an unrelated `UNKNOWN`.

Therefore:

```text
version update PASS
+ unresolved semantic evidence
-> semantic/intended-use UNKNOWN remains UNKNOWN
```

This prevents successful maintenance activity from being treated as implicit evidence for a different claim.

## 7. Reference validation and correction

The first strict version of VU-01 used exact SHA-256 identity across independent executions. A final-head rerun failed that criterion:

```text
VU-01a run 34001315535
exact identity: 8 / 16
Decision: FAIL
```

Artifact comparison showed last-bit floating representation differences in moving-target traces. The strict failure is retained as diagnostic evidence.

The corrected VU-01b freezes a numerical representation rule:

```text
META/S/discrete identities: exact
T floating fields: normalized to 9 decimal places
negative control: +1e-6 m range perturbation must be rejected
```

Corrected result:

```text
VU-01b run 34001585171
updated cases passed:             16 / 16
normalized cross-run equivalence: 16 / 16
negative control:                 rejected
reused without re-execution:      BP-01, SP-01
delta reassessed:                 MS-01 architectural substitution,
                                  EQ-01 intended-use screening
RF-performance state after update: UNKNOWN
Decision: PASS
```

Reference report:

`research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md`

## 8. Three separations required for cumulative evidence

The combined EA-01/VU-01 result requires three distinctions:

```text
historical retention != current applicability
current applicability != intended-use qualification
numerical equivalence != byte identity
```

This is the minimum logic needed to avoid both evidentiary amnesia and blind inheritance.

## 9. Interpretation

The evidence lifecycle is intended to make a model portfolio and its trial evidence **manageable over time**:

```text
versioned assets
-> dependency-aware evidence
-> selective staleness
-> evidence-type-aware delta reassessment
-> accumulated historical record
-> current intended-use decision
```

The profile does not claim that every change is small or that every major model revision can avoid full revalidation.
