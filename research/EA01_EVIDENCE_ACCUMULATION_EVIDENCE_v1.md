# EA-01 Evidence Accumulation & Lifecycle Manageability Evidence v1.0

Status: **Frozen result: PASS**

Research target: **RQ4/RQ5 refinement — manageability and accumulation**

Evidence run:

- DTEP branch: `ea01-evidence-accumulation`
- GitHub Actions run: `34000965675`
- Tested DTEP head: `94ea5a10cc6ce4b7ae602b1be2bb87f4c84c31c0`
- Common pre-EA baseline: `df40e7377a10ed7560437d11cea92685c440fce1`
- Artifact: `ea01-evidence-accumulation-lifecycle`
- Artifact ID: `9979464771`
- Artifact SHA-256: `782e7033d1d9105c0790f7b94769016b34c34b67e82c585a262a236cf27e2f50`

## 1. Question

EA-01 asks whether the evidence already produced by WP1 can be accumulated as an immutable, machine-readable evidence chain that remains queryable across later research stages and can distinguish:

```text
historical retention
from
current applicability
```

The experiment therefore tests **evidence manageability**, not whether a repository contains fewer files or whether engineers work faster.

The central lifecycle proposition is:

```text
new evidence is appended;
old evidence is retained;
changes may invalidate applicability without deleting history;
unresolved evidence gaps remain unresolved until relevant evidence is added.
```

## 2. Frozen evidence chain

EA-01 registered five existing WP1 evidence sets without modifying their reports:

| Stage | Evidence | Gate | Frozen result | Report SHA-256 |
|---:|---|---|---|---|
| 1 | `bp01.openeaagles.tws.2026-09-05.v1` | BP-01 | PASS | `0526705b4fa5e33d5dcf61719e19eacb5b095b052f509a2588f88151764e814d` |
| 2 | `ms01.tws.openeaagles-radarsimpublic.2026-09-05.v2` | MS-01 | PASS | `54d066329bc293a23f39cd2601a2d6e78382f47b36fe8e3a84ea99b75ac33589` |
| 3 | `sp01.tws.semantic-precheck.2026-09-05.v1` | SP-01 | PASS | `4f5d4ae561179bee9e3b30a206c1f49aa5d4cda61c44045ff2811cd45a0e9ca7` |
| 4 | `eq01.tws.evidence-aware-qualification.2026-09-06.v1` | EQ-01 | PASS | `f4740e26b73b7fbf2f617ee45599771d6e18d668ea6673659f6cd6ad17e1f765` |
| 5 | `eb01.tws.paired-engineering-burden.2026-09-06.v1` | EB-01 | PASS | `2fc537ef5932e686f8a829e33243322be4fb0e4b45b39f362390c8e43bc19db0` |

EA-01 verified that all five reports were present and hashable, all declared evidence dependencies were resolvable, and the dependency graph contained no cycle or orphan reference.

The branch-level check also confirmed that EA-01 itself changed **none** of the five frozen evidence reports relative to the pre-EA baseline.

## 3. Append-only stage replay

The evidence ledger was replayed in the order in which the five results accumulated.

| Stage | Evidence records | Prior records retained | Behavior | Substitution | RF semantics | U1 kinematic use | U2 RF use | Change manageability |
|---:|---:|---|---|---|---|---|---|---|
| 1 | 1 | yes | PASS | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED |
| 2 | 2 | yes | PASS | PASS | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED |
| 3 | 3 | yes | PASS | PASS | **UNKNOWN** | NOT_ASSESSED | NOT_ASSESSED | NOT_ASSESSED |
| 4 | 4 | yes | PASS | PASS | **UNKNOWN** | **QUALIFIED_WITHIN_EVIDENCE** | **UNKNOWN** | NOT_ASSESSED |
| 5 | 5 | yes | PASS | PASS | **UNKNOWN** | **QUALIFIED_WITHIN_EVIDENCE** | **UNKNOWN** | **SUPPORTED_WITHIN_EVIDENCE** |

The evidence-record set therefore grew monotonically:

```text
1 -> 2 -> 3 -> 4 -> 5
```

with every earlier evidence record retained at every later stage.

## 4. A central result: provenance can accumulate while qualification does not monotonically increase

SP-01 introduced a real unresolved semantic relation:

```text
rf.signal_to_noise_ratio
?=
rf.track_average_signal
```

and correctly classified it as:

```text
UNKNOWN
```

EA-01 shows that adding later EQ-01 and EB-01 evidence did **not** overwrite that unresolved state. At the final stage:

```text
Q3 RF semantic relation = UNKNOWN
Q5 RF performance use   = UNKNOWN
```

while the kinematic use remained:

```text
Q4 U1 kinematic use = QUALIFIED_WITHIN_EVIDENCE
```

This yields an important distinction:

```text
provenance accumulation is monotonic;
qualification is not monotonic.
```

Formally, for the retained evidence set:

```text
E_(t+1) = E_t union DeltaE
```

but a qualification decision is not required to become more positive as evidence accumulates:

```text
Q(E_(t+1)) is not necessarily >= Q(E_t)
```

New evidence may narrow a claim, expose an unresolved relation, or show that previous evidence is not applicable to a new intended use.

## 5. Current decision reconstruction

EA-01 reconstructed six current questions from explicit evidence provenance:

| Query | Final state | Minimal evidence path |
|---|---|---|
| behavior preservation | PASS | BP-01 |
| architectural substitution | PASS | BP-01 -> MS-01 |
| RF semantic relation | UNKNOWN | SP-01 |
| kinematic intended use | QUALIFIED_WITHIN_EVIDENCE | MS-01 -> SP-01 -> EQ-01 |
| RF-performance intended use | UNKNOWN | MS-01 -> SP-01 -> EQ-01 |
| change/requalification manageability | SUPPORTED_WITHIN_EVIDENCE | MS-01 -> EQ-01 -> EB-01 |

All **6 / 6** final query states matched the frozen expected result and every provenance reference resolved to a retained evidence record.

This is the key management property: a current decision can be traced backward to the evidence that supports, limits or blocks it.

## 6. Controlled lifecycle changes

EA-01 then applied five controlled changes to the frozen dependency graph. Evidence that becomes stale is not deleted; it remains as historical evidence but is no longer considered applicable to the changed configuration.

| Change | Final stale evidence | Active evidence | Historical records retained | Deleted |
|---|---:|---:|---:|---:|
| documentation metadata only | 0 / 5 | 5 / 5 | **5 / 5** | 0 |
| semantic mapping | 3 / 5 | 2 / 5 | **5 / 5** | 0 |
| RadarSimPublic adapter | 3 / 5 | 2 / 5 | **5 / 5** | 0 |
| upper trial specification | 3 / 5 | 2 / 5 | **5 / 5** | 0 |
| capability contract | 4 / 5 | 1 / 5 | **5 / 5** | 0 |

All five change cases matched the preregistered direct and transitive dependency rules.

The relevant interpretation is not:

```text
change -> delete old validation
```

and not:

```text
change -> blindly reuse old validation
```

It is:

```text
change
  -> recompute applicability
  -> mark affected evidence STALE
  -> retain historical evidence
  -> reassess only the affected chain before restoring current qualification
```

## 7. EA-01 decision

All nine frozen predicates passed:

| Predicate | Result |
|---|---|
| all five frozen reports present and hashable | PASS |
| dependency graph closed and acyclic | PASS |
| evidence-record set accumulates monotonically | PASS |
| real RF `UNKNOWN` persists until resolved | PASS |
| current decisions reconstruct from evidence graph | PASS |
| change impact matches dependency rules | PASS |
| stale evidence retained rather than deleted | PASS |
| prior frozen reports unchanged by accumulation layer | PASS |
| later unrelated evidence does not overwrite unresolved `UNKNOWN` | PASS |

Overall:

```text
EA-01 = PASS
```

## 8. Research interpretation

EA-01 shifts the engineering value proposition away from raw code or time reduction.

The stronger and better-supported proposition is:

> TMSU-based model integration can produce a cumulative evidence structure in which model behavior, semantic qualification, substitution, intended-use screening and change-impact evidence remain individually identifiable, linked and reusable across later changes without losing the historical record.

The key property is therefore **controlled accumulation**:

```text
model / adapter / contract / trial versions
                ↓
          evidence sets
                ↓
      current applicability
                ↓
      intended-use decision
```

This is directly relevant to digital T&E because repeated model updates should not force either complete evidentiary amnesia or unconditional inheritance of old results.

## 9. Paper-level contribution

The combined SP-01 -> EQ-01 -> EA-01 sequence supports a distinctive argument:

> An explicit `UNKNOWN` is a durable evidence state, not an error to be overwritten by later successful tests. Evidence can accumulate monotonically while qualification remains conditional on the current configuration and intended use.

This gives the current work a stronger test-grade identity than a conventional interface-integration demonstration.

## 10. Boundary of inference

EA-01 does not establish:

- enterprise-scale evidence-store performance;
- organization-wide governance effectiveness;
- automatic discovery of every hidden dependency;
- ontology completeness;
- authoritative VV&A or accreditation;
- that five evidence sets are sufficient to represent every model lifecycle;
- that a stale result is invalid scientifically; `STALE` means only that it is not currently applicable under the declared dependency rules.

The result is bounded to the existing WP1 TWS evidence chain and its frozen lifecycle rules.

## 11. Evidence identity

```text
Evidence_Set_ID:
ea01.tws.evidence-accumulation.2026-09-06.v1

CI Run:
34000965675

Tested DTEP head:
94ea5a10cc6ce4b7ae602b1be2bb87f4c84c31c0

Artifact ID:
9979464771

Artifact SHA-256:
782e7033d1d9105c0790f7b94769016b34c34b67e82c585a262a236cf27e2f50
```
