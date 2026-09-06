# TMSU Evidence Lifecycle Profile v1.2

Status: **Frozen profile amendment — post-LC-01**

This amendment preserves v1.1 and adds the empirically tested stopping rule for evidence carry-forward under a substantive model-algorithm / implementation-identity change.

## 1. Lifecycle objective

The objective is **controlled accumulation and bounded inheritance**.

Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t union DeltaE
```

Current applicability and intended-use qualification are recomputed after relevant configuration change.

Therefore:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

## 2. Evidence-state dimensions

Lifecycle state and decision state SHALL remain separate.

Lifecycle/applicability states include:

```text
ACTIVE
STALE
HISTORICAL
SUPERSEDED
```

Decision/qualification states include:

```text
PASS
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE
QUALIFIED_WITHIN_EVIDENCE
UNKNOWN
NOT_QUALIFIED
```

In particular:

```text
UNKNOWN != STALE
```

`UNKNOWN` means insufficient evidence for a requested claim/use. `STALE` means that an evidence item is no longer current for a changed configuration.

## 3. General dependency rule

Let `Dep(E)` be the declared applicability dependencies of evidence set `E`, and let `Delta(C)` be the declared change set for configuration transition `C`.

An original evidence set remains directly reusable when:

```text
Dep(E) intersection Delta(C) = empty
```

If dependencies intersect the change, the evidence becomes stale for the changed configuration unless an allowed, evidence-type-appropriate delta reassessment restores the affected claim.

Historical evidence SHALL be retained even when stale.

## 4. Evidence-type-aware delta rule

Delta carry-forward is not a generic PASS-through mechanism.

A candidate delta reassessment must specify:

```text
change class
claim being restored
evidence dependencies
comparison/equivalence type
comparison threshold or normalization rule
negative/sensitivity control where practical
source evidence identity
new evidence identity
current inference boundary
```

Comparison type must match evidence behavior:

```text
bitwise-controlled deterministic evidence
  -> exact identity may be appropriate

numerical deterministic evidence across non-bitwise-identical execution
  -> preregistered numerical equivalence / canonical normalization

stochastic evidence
  -> frozen-seed reproducibility where scientifically appropriate,
     or preregistered distributional/statistical equivalence
```

VU-01a/VU-01b are the reference test for this rule.

## 5. Change classes and default evidence action

| Change class | Example | Default lifecycle action |
|---|---|---|
| `DISPLAY_METADATA` | title/description only | reuse evidence whose dependencies exclude display metadata |
| `SEMANTIC_MAPPING` | unit/frame/concept mapping change | semantic evidence stale; propagate to dependent qualification claims |
| `ADAPTER_PROVENANCE` | adapter/binding revision with model, semantics and intended behavior frozen | typed delta carry-forward may be permitted if preservation evidence passes |
| `MODEL_ALGORITHM` | CV KF -> CA KF | no automatic inheritance of implementation-specific qualification; fresh affected evidence required |
| `IMPLEMENTATION_IDENTITY` | different model implementation | no automatic inheritance of implementation-specific qualification |
| `UPPER_TRIAL` | scenario/orchestrator/trial design change | composition/trial-specific evidence stale according to dependencies |
| `CAPABILITY_CONTRACT` | output concept/schema/semantic contract change | broad dependent-evidence reassessment; do not infer compatibility from old contract evidence |
| `EXECUTION_ENVIRONMENT` | compiler/runtime/hardware/numerical stack change | apply evidence-type-specific reproducibility/equivalence rule before carry-forward |

These are default rules. A project may require stricter reassessment. A weaker rule requires explicit evidence and cannot be selected merely to preserve a previous PASS.

## 6. VU envelope: provenance-only change

VU-01b demonstrates one permitted delta-carry-forward case:

```text
adapter/binding provenance revision
model commit unchanged
Implementation_ID unchanged
contract unchanged
semantic profile/mapping unchanged
upper trial unchanged
numerical-equivalence comparator passes
negative control passes
```

Result:

```text
unaffected evidence: retained/reused
affected current path: restored with delta evidence
unrelated UNKNOWN: preserved
```

This defines a bounded **carry-forward envelope**, not a universal rule.

## 7. LC stop rule: substantive algorithm/implementation change

LC-01 deliberately crossed the VU envelope:

```text
constant-velocity KF
-> constant-acceleration KF

Implementation_ID changed
upper trial unchanged
contract unchanged
semantic mapping unchanged
upstream repository commit unchanged
```

Both implementations executed the old 16-case envelope successfully, and 12/16 cases were behavior-equal at the frozen normalized criterion. A discriminating maneuver challenge nevertheless produced material differences between the two algorithms.

Therefore:

```text
same contract
or
mostly non-discriminating old regression envelope

DOES NOT imply

implementation-specific qualification carry-forward
```

The frozen stop rule is:

```text
if MODEL_ALGORITHM changes
or Implementation_ID changes materially:
    retain all historical evidence
    keep unaffected evidence ACTIVE
    mark prior implementation-specific evidence STALE for the new configuration
    re-establish architectural/contract execution as needed
    require fresh behavior/fitness evidence for affected intended-use claims
```

A successful fresh architectural execution does not itself restore fitness-for-use qualification.

## 8. Fuller requalification is selective, not total

`Fuller requalification` in this profile does not mean a complete evidence reset.

For LC-01:

```text
BP-01: reused
SP-01: reused
CV-specific MS/EQ/EB/VU: historical + stale for CA
fresh CA architectural execution: PASS
CA kinematic intended-use qualification: UNKNOWN pending fresh fitness evidence
RF semantic/performance state: UNKNOWN preserved
```

Thus:

```text
larger change
-> larger affected reassessment radius
```

not:

```text
larger change
-> erase all previous evidence
```

## 9. Mandatory safeguards

A carry-forward decision SHALL NOT be justified by any single shortcut such as:

```text
same repository commit
same API/schema
same Semantic_Profile_ID
same contract validator PASS
same old regression cases PASS
same developer assertion
```

The evidence system must evaluate the dependencies of the **claim being inherited**.

If the required evidence is absent or stale, current status remains `UNKNOWN` or `STALE` until fresh evidence explicitly restores the claim.

## 10. Current tested lifecycle ladder

The empirical WP1 sequence now supports:

```text
EA-01:
append-only history + dependency-aware staleness

VU-01a:
strict byte carry-forward rule can fail for numerical traces

VU-01b:
evidence-type-aware delta carry-forward can restore a provenance-only revision

LC-01:
substantive algorithm/Implementation_ID change crosses that carry-forward envelope
and requires fresh affected implementation-level qualification
```

## 11. Reference evidence

```text
VU-01b:
research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md

LC-01:
research/LC01_ALGORITHM_CHANGE_CARRY_FORWARD_BOUNDARY_EVIDENCE_v1.md
```

## 12. Profile-level conclusion

The model/evidence portfolio is manageable only if the system supports both inheritance and refusal to inherit.

The frozen lifecycle principle is therefore:

> Preserve evidence history monotonically; inherit only those current claims whose dependencies remain valid or are restored by evidence-type-appropriate delta evidence; reject automatic inheritance when a substantive model/algorithm change crosses the tested carry-forward boundary.
