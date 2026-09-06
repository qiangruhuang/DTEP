# WP1 Formal Results and Research-Question Audit v1.5

Status: **WP1 evidence freeze after LC-01**

Date: 2026-09-06

This audit freezes the WP1 empirical chain after the planned carry-forward boundary experiment. It retains positive, negative and `UNKNOWN` results. No third sensor model, new transport, broker, registry runtime or additional upper-trial mechanism is added.

## 1. Frozen empirical evidence chain

| Result | Question answered | Frozen outcome |
|---|---|---|
| **BP-01** | Can a real legacy capability be wrapped without changing its declared observable behavior? | **PASS**, OpenEaagles TWS, 16/16 exact within frozen deterministic envelope |
| **MS-01 v2** | Can two genuinely heterogeneous implementations sit behind one frozen upper trial/capability contract? | **PASS**, OpenEaagles + independent RadarSimPublic, binding-only selection, 16/16 each |
| **SP-01** | Can semantic incompatibility invisible to structural validation be detected? | **PASS**, 5/5 injected mismatches rejected; real RF relation = `UNKNOWN` |
| **EQ-01** | Can qualification depend on intended use and evidence scope rather than one global trust label? | **PASS**, kinematic research use qualified; RF-performance use = `UNKNOWN` |
| **EB-01** | Does boundary isolation reduce shared-core change/reassessment propagation? | **PASS** for change radius; **not** a code/time reduction claim |
| **EA-01** | Can evidence accumulate while applicability/qualification changes over time? | **PASS**, append-only history + selective staleness/reuse |
| **VU-01a** | Is cross-run byte identity a safe generic carry-forward rule for numerical traces? | **FAIL**, 8/16 exact; retained negative result |
| **VU-01b** | Can typed numerical delta evidence restore a controlled provenance-only revision? | **PASS**, 16/16 normalized equivalence + negative-control rejection |
| **LC-01** | Where must carry-forward stop when the model algorithm / implementation identity changes? | **PASS**, automatic inheritance rejected; fresh affected implementation qualification required |

The empirical narrative is therefore:

```text
Preserve
-> Substitute
-> Qualify semantics
-> Qualify intended use
-> Bound model-specific change
-> Accumulate evidence
-> Carry forward a controlled revision
-> Reject carry-forward when a substantive algorithm change crosses the boundary
```

## 2. LC-01 closes the lifecycle question

LC-01 changes the selected RadarSimPublic tracking algorithm from the upstream constant-velocity KF to the upstream constant-acceleration KF while keeping the repository commit, upper trial, capability contract and declared semantic mapping frozen.

Both configurations execute all 16 old E2 cases successfully. At the frozen 9-decimal behavior criterion:

```text
behavior-equal:      12 / 16
behavior-different:   4 / 16
```

A separate maneuver challenge materially discriminates the algorithms:

```text
max range difference:       109.0754918963 m
max range-rate difference:   67.6107619584 m/s
```

The lifecycle decision is therefore not inferred from contract sameness or from the old scenario envelope. Because the selected algorithm and `Implementation_ID` changed, CV-specific implementation evidence becomes historical/stale for the CA configuration.

LC-01 retains/reuses BP-01 and SP-01, freshly re-establishes CA architectural execution, but leaves CA kinematic fitness-for-use as:

```text
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

This is the tested **stop rule for automatic evidence inheritance**.

## 3. Central WP1 result

WP1 is no longer framed around “less code” or “less integration time.”

The supported engineering result is:

```text
model-specific implementation change
        ↓
controlled capability boundary
        ↓
stable upper trial where the contract remains valid
        ↓
versioned evidence + explicit dependencies
        ↓
selective ACTIVE / STALE / HISTORICAL state
        ↓
evidence-type-aware delta reassessment where allowed
        ↓
refusal to inherit when the change crosses the evidence boundary
        ↓
current intended-use decision
```

The contribution is **manageability, cumulative evidence and bounded inheritance**.

## 4. Three lifecycle separations now empirically required

### 4.1 Historical retention is not current applicability

A stale evidence item is not deleted. It remains available for provenance/audit but is not current evidence for the changed configuration.

### 4.2 Current applicability is not intended-use qualification

An evidence set can be current yet insufficient for a requested use, producing `UNKNOWN`.

### 4.3 Numerical equivalence is not byte identity

VU-01a/VU-01b show that long-lived numerical evidence requires an evidence-type-appropriate reproducibility/equivalence criterion rather than a universal byte-hash rule.

Together:

```text
historical retention != current applicability
current applicability != intended-use qualification
numerical equivalence != byte identity
```

LC-01 adds a fourth constraint:

```text
contract compatibility != qualification inheritance
```

## 5. Durable role of `UNKNOWN`

The RF semantic `UNKNOWN` is now traced through four lifecycle stages:

```text
SP-01:
created because semantic-equivalence evidence is absent

EQ-01:
blocks only intended uses that require the unresolved RF evidence

EA-01 / VU-01b:
persists while unrelated evidence accumulates and a version revision succeeds

LC-01:
remains UNKNOWN after a substantive algorithm change and fresh architectural execution
```

Thus `UNKNOWN` is a durable evidence state, not a transient integration error.

The new CA kinematic state also becomes `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`: this is a second, independently generated example showing that successful execution/contract validation does not itself constitute fitness-for-use evidence.

## 6. Research-question audit

| RQ | Final WP1 status | Evidence-supported answer | Remaining boundary |
|---|---|---|---|
| **RQ1 Minimum contract** | **Partially answered** | One stable capability/contract/semantic declaration supports a legacy wrapper and an independent heterogeneous implementation and remains usable across a subsequent algorithm revision. | Sufficiency shown for one capability class; mathematical/global minimality not proven. |
| **RQ2 Composition / substitution** | **Strong bounded support for substitution** | Real heterogeneous binding-only selection with zero upper-trial edits; CA algorithm revision also executes behind the same frozen upper contract. | Multi-capability composition remains outside the demonstrated scope and should not be claimed. |
| **RQ3 Semantic interoperability** | **Bounded positive answer** | 5/5 injected mismatches detected; unresolved real RF concept quarantined as `UNKNOWN` through later lifecycle events. | No automatic ontology inference/completeness; RF equivalence remains unresolved. |
| **RQ4 Trust / evidence reuse** | **Strong bounded positive answer** | EQ gives intended-use-relative screening; EA gives cumulative evidence/staleness; VU shows permitted typed carry-forward; LC gives a tested refusal boundary. | No authoritative accreditation, large organizational history or enterprise-scale repository test. |
| **RQ5 T&E engineering benefit** | **Bounded positive answer for manageability/change propagation** | Stable upper trial, isolated model-specific boundary, smaller reassessment propagation, append-only evidence, selective requalification and explicit stop rule. | Engineer-hours/calendar time/cost unmeasured and not the primary claim. |

## 7. Hypothesis audit

| Hypothesis | Final status | Interpretation |
|---|---|---|
| **H1 integration time lower** | **Not directly tested; de-emphasized** | No engineer-time experiment; do not report time-saving percentages. |
| **H2 upper-level change cost approaches zero on swap** | **Supported only as zero upper-trial edits in bounded cases** | MS and LC preserve the upper trial, but total qualification burden is not zero; LC demonstrates why implementation-specific evidence may still need renewal. |
| **H3 reuse rate higher** | **Not proven as portfolio-wide comparative outcome** | Controlled evidence reuse/retention is demonstrated; “higher reuse rate” against an external organizational baseline is not. |
| **H4 semantic precheck detects structural-valid mismatch** | **Supported** | SP-01 5/5 injected mismatch detection plus fail-safe `UNKNOWN`. |
| **H5 machine-assisted fitness-for-use screening** | **Boundedly supported** | EQ-01 4/4 intended-use decisions; EA/VU/LC maintain and update those decisions through lifecycle change. |
| **H6 Golden Scenario preservation** | **Partially supported** | BP-01 exact preservation within one deterministic legacy wrapper envelope; not universal behavioral equivalence. |

## 8. Negative results retained as evidence

WP1 intentionally retains two classes of non-PASS development/evidence results.

### VU-01a

The strict-byte rule failed on repeated numerical execution. It establishes that evidence-management rules themselves require validation.

### LC-01 development runs

One early CA execution produced a state-dimension failure that was not reproduced after an explicit state/matrix probe; the final instrumented CA runs passed. A later lifecycle evaluator also failed because its harness searched fully qualified algorithm component names using an incorrect exact-list membership test; correcting the harness caused the preregistered substantive-change predicate to evaluate as intended.

These failures are retained in CI history. The paper should use them only as methodological audit/development evidence, not as scientific claims about RadarSimPublic.

## 9. Frozen integrated WP1 claim

WP1 supports the following bounded statement:

> A SAL-aligned TMSU approach can make a heterogeneous simulation capability and its T&E evidence manageable over time: a legacy capability can be preserved behind a controlled boundary; an independently implemented model can be substituted without rewriting the upper trial; semantic incompatibility and evidence insufficiency can be rejected or represented explicitly; qualification can be conditioned on intended use; evidence can accumulate without deleting history; controlled maintenance changes can use typed delta evidence; and substantive model-algorithm changes can be prevented from blindly inheriting implementation-specific qualification while unaffected evidence remains reusable.

This is a **governability/evidence-lifecycle claim**, not an accreditation, fidelity-equivalence, or enterprise-wide efficiency claim.

## 10. What WP1 cannot claim

WP1 does not establish:

- enterprise-wide contract optimality;
- multi-capability federation/composition;
- universal semantic understanding;
- operational/acquisition accreditation;
- equal fidelity between heterogeneous models;
- organization-wide code/time/cost savings;
- a universal change-impact graph for every model class;
- enterprise-scale evidence repository performance.

## 11. WP1 stopping rule

The planned high-value limit experiment has now been completed.

Adding a third radar implementation, another transport protocol, more APIs, or a larger scenario matrix would primarily enlarge the demonstration rather than answer a remaining central WP1 question.

Therefore:

```text
WP1 EMPIRICAL MECHANISM = FROZEN
```

The next research phase is **paper-level evidence integration**, not further mechanism expansion.

The manuscript should be organized around the four central propositions:

```text
P1  Stable capability boundary enables heterogeneous access/substitution.
P2  Structural compatibility is insufficient without semantic and intended-use evidence.
P3  Evidence can accumulate monotonically while applicability/qualification changes non-monotonically.
P4  Evidence inheritance must be bounded: typed delta carry-forward is allowed for controlled changes and explicitly refused for substantive algorithm/implementation changes until affected qualification is renewed.
```
