# WP1 Formal Results and Research-Question Audit v1.4

Status: **Corrected post-EA-01 / VU-01b evidence audit**

Date: 2026-09-06

This update retains BP-01, MS-01, SP-01, EQ-01, EB-01 and EA-01, and records both the failed strict-byte VU-01a and corrected VU-01b lifecycle experiment. No additional model class, transport, broker, registry runtime or orchestration mechanism is introduced.

## 1. Formal WP1 evidence chain

### R1 — BP-01 Behavior Preservation

`BP-01 = PASS`

A real wrapped OpenEaagles TWS capability preserved its declared native observable behavior exactly in 16/16 frozen cases.

### R2 — MS-01 Real Heterogeneous Model Substitution

`MS-01 = PASS`

OpenEaagles and independent RadarSimPublic implementations executed behind one frozen upper trial with zero upper-trial edits for model selection.

### R3 — SP-01 Semantic Precheck

`SP-01 = PASS`

Five of five structurally valid semantic mismatches were rejected. The real RadarSimPublic RF concept relation remained `UNKNOWN` rather than being silently promoted to compatibility.

### R4 — EQ-01 Evidence-Aware Intended-Use Qualification

`EQ-01 = PASS`

The same implementation was `QUALIFIED_WITHIN_EVIDENCE` for a kinematic research/conformance use but `UNKNOWN` for an RF-performance decision requiring unresolved semantic and comparative-validity evidence.

### R5 — EB-01 Paired Engineering Burden

`EB-01 = PASS`

The TMSU path did not use less total boundary code, but it isolated model-specific change outside the shared upper trial and reduced downstream reassessment propagation for a controlled semantic update.

### R6 — EA-01 Evidence Accumulation & Lifecycle Manageability

`EA-01 = PASS`

Five existing evidence sets were registered in a closed, acyclic evidence graph without modifying the frozen reports. Stage replay accumulated the evidence-record set monotonically from 1 to 5 while retaining every prior record.

Six final decision queries were reconstructed from explicit evidence provenance. The real RF semantic `UNKNOWN` introduced by SP-01 persisted through later EQ-01 and EB-01 evidence.

Five controlled lifecycle changes all preserved 5/5 historical evidence records while selectively marking only affected evidence as stale for the changed configuration.

Supported inference:

```text
provenance can accumulate monotonically
while
qualification remains configuration- and intended-use-dependent
```

### R7 — VU-01a / VU-01b Real Version Update & Evidence Carry-Forward

The lifecycle update changes only the RadarSimPublic adapter/binding provenance layer while preserving the upstream model commit, upper trial, contract, semantic profile and declared semantic mapping.

The original VU-01a cross-run criterion required exact floating-trace SHA identity. A final-head rerun disproved the reproducibility of that criterion:

```text
VU-01a strict byte criterion:
FAIL
Run 34001315535
Exact identity: 8 / 16
```

Artifact comparison showed only machine-precision-scale differences in moving-target floating values. This is retained as a negative methodological result rather than discarded.

The corrected VU-01b uses exact discrete trace structure plus 9-decimal normalization of floating fields, with a `1e-6 m` negative perturbation that the comparator must reject.

Corrected result:

```text
VU-01b = PASS
Run 34001585171
updated cases:                 16 / 16 PASS
normalized cross-run equality: 16 / 16
negative control:              rejected
```

BP-01 and SP-01 were reused without re-execution; the affected architectural-substitution/intended-use path was delta-reassessed. EB-01-v1 remains historical for the revised configuration. The RF-performance decision remains `UNKNOWN`.

Supported inference:

> selective evidence carry-forward is feasible for one real controlled version update, but the comparison rule itself must match the numerical/reproducibility properties of the evidence being carried forward.

## 2. Revised research interpretation

The primary engineering value demonstrated by WP1 is not "less code" or "less time."

The empirically supported story is:

```text
model-specific change
        ↓
controlled boundary
        ↓
stable upper trial
        ↓
versioned evidence sets
        ↓
explicit dependencies
        ↓
selective staleness / reuse
        ↓
evidence-type-aware reassessment
        ↓
current intended-use decision
```

This is **manageability, traceability and cumulative evidence**.

## 3. RQ audit after EA-01 and corrected VU-01b

| RQ | Status | Current evidence | Remaining gap |
|---|---|---|---|
| **RQ1 Minimum contract** | Partially answered | One stable capability/contract/semantic declaration supports two heterogeneous implementations and survives one controlled binding revision. | Sufficiency shown for one capability class; minimality not proven. |
| **RQ2 Composition / substitution** | Substitution strongly supported | Real heterogeneous binding-only substitution; VU-01b shows the substitution claim can be selectively restored after a controlled adapter/binding revision. | Multi-capability composition remains untested and should not be claimed unless central to the paper. |
| **RQ3 Semantic interoperability** | Bounded positive answer | 5/5 injected mismatches rejected; real unresolved RF concept quarantined as `UNKNOWN`; later successful maintenance does not erase it. | No automatic ontology inference/completeness claim; RF concept equivalence remains unresolved. |
| **RQ4 Trust / evidence reuse** | **Strong bounded positive answer within WP1** | EQ-01 gives intended-use-relative screening; EA-01 demonstrates cumulative/traceable evidence management; VU-01a exposes a bad carry-forward criterion; VU-01b demonstrates corrected selective carry-forward under an actual code/binding change. | No authoritative accreditation, large organizational history, or enterprise-scale evidence repository. |
| **RQ5 T&E engineering benefit** | **Bounded positive answer for manageability/change propagation** | EB-01 isolates model-specific change; EA/VU show evidence can be retained, selectively made stale and restored with typed delta evidence rather than reset wholesale. | Engineer-hours/calendar time/cost remain unmeasured and are no longer the primary value proposition. |

## 4. Hypothesis audit

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1 integration time lower** | Not directly tested; de-emphasized | No human engineer-time measurement; no percentage time-saving claim should be made. |
| **H2 upper-level change cost approaches zero on swap** | Supported in one bounded real heterogeneous case | zero upper-trial edits for substitution; upper trial also remained frozen through VU adapter/binding revision. |
| **H3 reuse rate higher** | Not proven as a cross-project comparative outcome | Evidence carry-forward is demonstrated mechanistically and through one real revision, but no portfolio baseline establishes a higher organization-wide reuse rate. |
| **H4 semantic precheck detects structural-valid mismatch** | Supported | SP-01 5/5 mismatch detection; real `UNKNOWN` retained. |
| **H5 machine-assisted fitness-for-use screening** | Boundedly supported | EQ-01 4/4 intended-use cases; EA/VU maintain qualification provenance across evidence accumulation/change. |
| **H6 Golden Scenario preservation** | Partially supported | BP-01 16/16 exact identity within deterministic OpenEaagles wrapper envelope. |

## 5. Paper-level role of `UNKNOWN`

Across SP-01, EQ-01, EA-01 and VU-01b:

```text
SP-01:
UNKNOWN is generated when semantic-equivalence evidence is absent.

EQ-01:
UNKNOWN becomes decision-relevant when intended use requires that unresolved evidence.

EA-01:
UNKNOWN persists as unrelated evidence accumulates.

VU-01b:
UNKNOWN survives a successful version update and selective requalification.
```

Thus:

> An explicit unknown state is a durable representation of evidence insufficiency, not a temporary integration failure and not a value later successful tests may overwrite implicitly.

## 6. Paper-level role of accumulation

Two results now define the evidence-management contribution:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

and:

```text
Evidence criteria are typed by numerical/execution behavior.
```

A T&E evidence system should therefore allow evidence to accumulate without deletion, become stale after relevant change, retain unaffected evidence as active, preserve stale evidence historically, restore claims with justified delta evidence, and leave unresolved evidence gaps unresolved until explicitly addressed.

## 7. Integrated WP1 claim

WP1 now supports the bounded statement:

> A SAL-aligned TMSU approach can preserve a wrapped legacy capability, substitute an independently implemented heterogeneous model without rewriting the upper trial, reject or quarantine semantic incompatibility and uncertainty, condition qualification on intended use and evidence scope, isolate model-specific change from shared trial logic, and accumulate versioned evidence such that affected claims can be selectively requalified with evidence-type-appropriate criteria while historical evidence and unresolved uncertainties remain traceable.

## 8. Important negative result retained

The VU-01a failure should remain in the paper or supplement because it prevents an overly simplistic evidence-reuse story.

It shows:

```text
same model logic
+ same trial
+ same intended behavior
!= guaranteed cross-run byte identity
```

For numerical simulation evidence, management rules must distinguish bitwise reproducibility from numerical equivalence. This is directly relevant to long-lived T&E evidence archives that may be replayed across runners/platforms.

## 9. What WP1 still cannot claim

WP1 does not establish enterprise-wide contract optimality, multi-capability composition, automatic semantic understanding, authoritative operational/acquisition accreditation, organization-wide time/cost reduction, universal delta requalification for major model-algorithm changes, or enterprise-scale evidence-store performance.

## 10. Research stopping rule for WP1

The main WP1 mechanism is now sufficiently evidenced for the intended paper story. Adding a third sensor model, another transport, or additional API machinery has low marginal value.

The only optional limit experiment with clear value is a **substantive model-algorithm/semantic version change** that should deliberately exceed the current carry-forward envelope and demonstrate when selective delta evidence is insufficient and fuller reassessment is required.

Otherwise the recommended next phase is manuscript evidence integration and figure design around:

```text
BP-01 -> MS-01 -> SP-01 -> EQ-01 -> EB-01 -> EA-01 -> VU-01a/b
```

with the primary narrative:

```text
Preserve
-> Substitute
-> Qualify semantics
-> Qualify intended use
-> Bound change
-> Accumulate evidence
-> Carry forward selectively
-> Use evidence-type-appropriate requalification
```
