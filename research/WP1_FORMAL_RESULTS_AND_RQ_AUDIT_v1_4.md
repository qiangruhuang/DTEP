# WP1 Formal Results and Research-Question Audit v1.4

Status: **Post-EA-01 / VU-01 evidence audit**

Date: 2026-09-06

This update retains BP-01, MS-01, SP-01, EQ-01 and EB-01, adds EA-01 as the formal evidence-accumulation result, and adds VU-01 as the first real lifecycle carry-forward result. No additional model class, transport, broker, registry runtime or orchestration mechanism is introduced.

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

Five existing evidence sets were registered in a closed, acyclic evidence graph without modifying the frozen reports. Stage replay accumulated the evidence record set monotonically from 1 to 5 while retaining every prior record.

Six final decision queries were reconstructed from explicit evidence provenance. The real RF semantic `UNKNOWN` introduced by SP-01 persisted through later EQ-01 and EB-01 evidence.

Five controlled lifecycle changes all preserved 5/5 historical evidence records while selectively marking only affected evidence as stale for the changed configuration.

Supported inference:

```text
provenance can accumulate monotonically
while
qualification remains configuration- and intended-use-dependent
```

### R7 — VU-01 Real Version Update & Evidence Carry-Forward

`VU-01 = PASS`

A real RadarSimPublic adapter/binding revision was introduced while preserving the upstream model commit, upper trial, capability contract, semantic profile and declared semantic mapping.

Immediately after change, BP-01 and SP-01 remained active while MS-01, EQ-01 and EB-01 were conservatively stale for the changed configuration. All prior evidence remained historically retained.

The updated binding then executed the same 16 frozen cases successfully and produced canonical traces byte-identical to the prior MS-01 RadarSimPublic traces in 16/16 cases.

The current architectural-substitution and kinematic intended-use decisions were restored through delta evidence without rerunning BP-01 or SP-01. The RF-performance state remained `UNKNOWN`.

Supported inference:

> selective evidence carry-forward works for at least one real, controlled version-update event and does not require either complete evidentiary reset or blind inheritance.

## 2. Revised research interpretation

The primary engineering value demonstrated by WP1 is no longer framed as "less code" or "less time."

The stronger empirical story is:

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
current intended-use decision
```

This is **manageability and cumulative evidence**, not raw implementation minimization.

## 3. RQ audit after EA-01 and VU-01

| RQ | Status | Current evidence | Remaining gap |
|---|---|---|---|
| **RQ1 Minimum contract** | Partially answered | One stable capability/contract/semantic declaration supports two heterogeneous implementations and survives one controlled binding revision. | Sufficiency shown for one capability class; minimality not proven. |
| **RQ2 Composition / substitution** | Substitution strongly supported | Real heterogeneous binding-only substitution demonstrated; VU-01 shows the substitution decision can be selectively carried forward after a controlled adapter/binding revision. | Multi-capability composition remains untested and should not be claimed unless central to the final paper. |
| **RQ3 Semantic interoperability** | Bounded positive answer | 5/5 injected mismatches rejected; real unresolved RF concept quarantined as `UNKNOWN`; VU-01 shows later successful version maintenance does not erase that uncertainty. | No automatic ontology inference/completeness claim; RF concept equivalence remains unresolved. |
| **RQ4 Trust / evidence reuse** | **Strong bounded positive answer within WP1** | EQ-01 gives intended-use-relative screening; EA-01 demonstrates cumulative, traceable evidence management; VU-01 demonstrates selective carry-forward under an actual version change. | No authoritative accreditation, no large organizational history, no enterprise-scale repository performance. |
| **RQ5 T&E engineering benefit** | **Bounded positive answer for manageability/change propagation** | EB-01 shows stable upper core and smaller reassessment radius; EA-01/VU-01 show that evidence can be accumulated, retained and selectively requalified after change. | Engineer-hours, calendar time and organization-wide cost remain unmeasured and are no longer treated as the primary value proposition. |

## 4. Hypothesis audit

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1 integration time lower** | Not directly tested and de-emphasized | No human engineer-time measurement. Current paper should not claim percentage time reduction. |
| **H2 upper-level change cost approaches zero on swap** | Supported in one bounded real heterogeneous case | zero upper-trial edits for implementation substitution; VU-01 preserves the frozen upper trial across one adapter/binding revision. |
| **H3 reuse rate higher** | Not proven as a comparative cross-project outcome | Evidence reuse/retention is demonstrated mechanistically and in one real version update, but no external baseline establishes a higher portfolio-wide reuse rate. |
| **H4 semantic precheck detects structural-valid mismatch** | Supported | SP-01 5/5 mismatch detection; real `UNKNOWN` retained. |
| **H5 machine-assisted fitness-for-use screening** | Boundedly supported | EQ-01 4/4 intended-use cases; EA/VU maintain qualification provenance through evidence accumulation and change. |
| **H6 Golden Scenario preservation** | Partially supported | BP-01 16/16 exact identity within the deterministic wrapper envelope. |

## 5. The paper-level role of UNKNOWN

The `UNKNOWN` result is now more than a semantic-edge case.

Across SP-01, EQ-01, EA-01 and VU-01 it demonstrates four distinct properties:

```text
SP-01:
UNKNOWN can be generated when semantic equivalence evidence is absent.

EQ-01:
UNKNOWN becomes decision-relevant only when the intended use requires that unresolved concept/evidence.

EA-01:
UNKNOWN persists as later unrelated evidence accumulates.

VU-01:
UNKNOWN survives a successful version update and selective requalification.
```

This supports the paper-level proposition:

> An explicit unknown state is a durable representation of evidence insufficiency, not a temporary integration failure and not a value that later successful tests may overwrite implicitly.

## 6. The paper-level role of accumulation

The strongest new conceptual result is:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

A mature T&E evidence system should therefore allow:

- evidence to accumulate without deletion;
- evidence applicability to become stale after relevant change;
- unaffected evidence to remain active;
- stale evidence to remain historically auditable;
- delta evidence to restore a current decision when justified;
- unresolved evidence gaps to persist until explicitly addressed.

This is a more defensible modernization claim than generic statements about reuse or integration efficiency.

## 7. Integrated WP1 claim

WP1 now supports the following bounded statement:

> A SAL-aligned TMSU approach can preserve a wrapped legacy capability, substitute an independently implemented heterogeneous model without rewriting the upper trial, reject or quarantine semantic incompatibility and uncertainty, condition qualification on intended use and evidence scope, isolate model-specific change from shared trial logic, and accumulate versioned evidence such that affected claims can be selectively requalified while historical evidence and unresolved uncertainties remain traceable.

## 8. What WP1 still cannot claim

WP1 does not establish:

- enterprise-wide contract optimality;
- multi-capability composition;
- automatic semantic understanding;
- operational/acquisition model accreditation;
- organization-wide time/cost reduction;
- universal delta requalification for major model-algorithm changes;
- enterprise-scale evidence repository performance.

## 9. Research stopping rule for WP1

The main WP1 mechanism is now sufficiently evidenced for the intended paper story.

Adding a third sensor model, another transport, or more API mechanisms has low marginal value.

The only additional experiment with clear value would be a **larger semantic/model-algorithm version change** to test where delta requalification stops being sufficient and a fuller reassessment becomes necessary. That experiment should be treated as optional sensitivity/limit evidence rather than a new main branch of the study.

Otherwise the recommended next phase is manuscript evidence integration and figure design around the chain:

```text
BP-01 -> MS-01 -> SP-01 -> EQ-01 -> EB-01 -> EA-01 -> VU-01
```

with the primary narrative:

```text
Preserve
-> Substitute
-> Qualify semantics
-> Qualify intended use
-> Bound change
-> Accumulate evidence
-> Carry evidence forward under controlled change
```
