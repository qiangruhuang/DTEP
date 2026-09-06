# Paper Evidence Architecture v1.0

Status: **Manuscript evidence integration after WP1 empirical freeze**

## 1. Recommended paper identity

### English working title

**Evidence-Aware Unification of Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Contracts, Cumulative Evidence, and Selective Requalification**

### Chinese working title

**面向数字化试验鉴定的异构仿真模型统型：能力契约、可累积证据与选择性再鉴定**

The paper should no longer be framed primarily as “service-enabling legacy simulation software” or “reducing integration code.” The empirical contribution is narrower and stronger: making heterogeneous model capabilities and their T&E evidence manageable over lifecycle change.

## 2. Problem statement

Modern M&S modernization proposals correctly emphasize modular/open architectures, reusable data, standardized interfaces and incremental migration. For test and evaluation, however, interface interoperability is not sufficient.

A long-lived digital T&E environment must also answer:

```text
Which capability is this model implementation claiming to provide?
Which semantic interpretation is attached to that capability?
What evidence supports use of this implementation for this intended use?
What evidence remains valid after the implementation, adapter, trial or semantics change?
What evidence must become stale?
When may a prior claim be restored with delta evidence?
When must carry-forward be refused?
```

The research gap is therefore not merely a missing API layer. It is the absence of a bounded mechanism connecting **capability modularity to evidence lifecycle governance**.

## 3. Position relative to existing modernization / VV&A guidance

This study should be positioned as an implementation bridge rather than a replacement for existing architecture or accreditation doctrine.

### Enterprise M&S modernization

RAND's *A Modernized Enterprise Army Modeling and Simulation Concept* identifies aging/monolithic M&S infrastructure, unique model/data silos, reuse limitations, and the need to capture, curate and reuse M&S information across acquisition. It proposes an enterprise modernization direction including modular/open approaches and incremental migration.

Our study deliberately narrows this enterprise question to the trial-identification layer:

```text
enterprise modernization problem
        ↓
trial/T&E model capability unit
        ↓
controlled contract + semantics + provenance
        ↓
executable evidence lifecycle
```

### MOSA

DoD MOSA guidance emphasizes modular design, key interfaces, open standards, verified conformance, and the ability to add/modify/replace components across the life cycle.

Our addition is:

> replaceability at the interface level does not itself establish inheritance of T&E qualification evidence.

MS-01 demonstrates architectural substitution; LC-01 demonstrates why qualification inheritance must remain a separate decision.

### VV&A / accreditation

MIL-STD-3022 provides a common documentation framework intended to support consistency and reuse across V&V and accreditation products. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, version control, capabilities, assumptions, limitations, uncertainty and evaluation/validation response variables.

TMSU therefore should be described as a machine-manageable **pre-accreditation/conformance evidence organization mechanism** that supplies traceable inputs to trial-specific qualification/VV&A activities. It does not issue an accreditation decision.

## 4. Core conceptual model

### 4.1 Capability unit

The frozen logical form is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the TMSU is a packaging/conformance unit rather than runtime middleware.

The identity rule remains:

```text
Capability_ID != Model_Implementation_ID
```

This allows multiple implementations to claim one capability contract without conflating the abstract test need with a particular legacy codebase.

### 4.2 Evidence item

For the paper, define one evidence record as:

```text
E = <Claim,
     Configuration,
     IntendedUse,
     Domain,
     Method,
     Result,
     Dependencies,
     Provenance>
```

The key point is that evidence has both **historical identity** and **current applicability**.

### 4.3 Current qualification

For implementation `I`, intended use `U`, configuration `C`, and accumulated evidence base `E_t`:

```text
Q(I,U,C | E_t)
  in {QUALIFIED_WITHIN_EVIDENCE, UNKNOWN, NOT_QUALIFIED}
```

`Q` is not a global model label. It is conditional on use, configuration, domain and current evidence.

### 4.4 Change and evidence applicability

Let `Dep(e)` denote evidence dependencies and `Delta(C)` the declared change set.

Original evidence remains directly active when:

```text
Dep(e) intersection Delta(C) = empty
```

Otherwise it becomes stale for the changed configuration unless allowed delta evidence restores the affected claim.

Evidence history remains append-only:

```text
E_(t+1) = E_t union DeltaE
```

Hence the central lifecycle result:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

## 5. Research questions after empirical freeze

### RQ1 — Capability boundary

Can a stable capability/contract/semantic declaration provide a sufficient practical boundary for wrapping a real legacy implementation and exposing a genuinely heterogeneous alternative without rewriting the upper trial?

Status: **bounded practical support; global minimality not claimed**.

### RQ2 — Substitution

Can heterogeneous implementations be selected behind the same frozen upper trial while model-specific adaptation remains at the boundary?

Status: **strong bounded support**.

### RQ3 — Semantic qualification

Can semantic incompatibility and uncertainty be separated from structural interoperability?

Status: **bounded positive support**.

### RQ4 — Intended-use evidence and lifecycle

Can qualification be reconstructed from machine-readable evidence, preserve `UNKNOWN`, accumulate history, and selectively change applicability after lifecycle events?

Status: **strong bounded positive support**.

### RQ5 — T&E engineering benefit

Does the approach reduce uncontrolled change/requalification propagation and make the model/evidence portfolio more governable over time?

Status: **bounded positive support for manageability/change propagation; no engineer-time claim**.

## 6. Empirical evidence ladder

### E1 — Preserve: BP-01

Real OpenEaagles TWS + AirTrkMgr legacy capability. M1 external wrapper. Sixteen frozen cases. Observable native trace preserved exactly.

Supported claim: a controlled wrapper can preserve legacy observable behavior within a declared deterministic envelope.

### E2 — Substitute: MS-01 v2

Independent RadarSimPublic implementation replaces the OpenEaagles implementation by binding selection while the upper trial, orchestrator and capability contract remain frozen.

Supported claim: real software/model heterogeneity can be hidden behind one architectural contract without editing upper trial logic.

Not supported: equal fidelity or behavioral equivalence between implementations.

### E3 — Qualify semantics: SP-01

Five structurally valid semantic mismatches are rejected. A real RF relation is returned as `UNKNOWN` rather than forced to compatible.

Supported claim:

```text
structural PASS != semantic COMPATIBLE
```

### E4 — Qualify intended use: EQ-01

The same RadarSimPublic configuration is evidence-sufficient for a bounded kinematic research/conformance use but `UNKNOWN` for an RF-performance decision requiring unresolved semantic and comparative-validity evidence.

Supported claim:

```text
same model + same binding + different intended use
-> different qualification decision
```

### E5 — Bound change propagation: EB-01

Compared with a point-to-point direct integration benchmark, TMSU does not necessarily write fewer total lines. It isolates model-specific change outside the shared upper trial and reduces reassessment propagation for a controlled semantic update.

Supported claim: change-radius/evidence-impact benefit, not LOC/time superiority.

### E6 — Accumulate: EA-01

Five frozen evidence sets accumulate without deletion. Applicability can selectively become stale. `UNKNOWN` remains durable.

Supported claim: provenance history can be monotonic while qualification is configuration-dependent.

### E7 — Carry forward carefully: VU-01a/b

VU-01a retains a failed strict-byte cross-run comparator. VU-01b replaces it with an evidence-type-appropriate numerical rule and sensitivity control, then successfully carries a provenance-only adapter/binding revision.

Supported claim: evidence carry-forward criteria themselves require validation.

### E8 — Refuse inheritance when necessary: LC-01

The selected RadarSimPublic algorithm changes from CV KF to CA KF. Same upstream commit, contract and semantic mappings. Both execute the old E2 set; 12/16 cases are normalized-behavior equal, 4/16 differ. A maneuver challenge clearly discriminates the algorithms.

Automatic implementation-specific qualification inheritance is rejected. Unaffected BP/SP evidence remains active; prior CV-specific evidence remains historical/stale for CA; fresh architectural execution passes; intended-use fitness remains `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`.

Supported claim: cumulative evidence requires an explicit stop rule, not universal reuse.

## 7. Four paper-level propositions

### P1 — Stable boundary

A stable capability contract can decouple upper trial design from concrete model implementation sufficiently to wrap and substitute heterogeneous implementations in a bounded real case.

### P2 — Interoperability is layered

Structural interoperability is insufficient for semantic compatibility, and semantic compatibility is insufficient for intended-use fitness.

The hierarchy is:

```text
structural conformance
< semantic qualification
< execution/behavior evidence
< intended-use fitness
< accreditation decision
```

The study empirically evaluates the lower/middle layers; it does not perform authoritative accreditation.

### P3 — Evidence is cumulative but trust is conditional

Historical evidence should remain auditable even when it ceases to be current. Qualification may increase, decrease or become `UNKNOWN` as configuration and intended use change.

### P4 — Inheritance must be bounded

Controlled provenance-only revisions may use typed delta evidence. Substantive algorithm/implementation changes must not blindly inherit implementation-specific qualification, even when interface contracts remain unchanged.

## 8. Main figures

### Figure 1 — From monolithic model silos to evidence-aware capability units

Left: legacy monoliths each containing model logic, data, semantics and test-specific integration.

Center: SAL-level test request / trial design.

Right: multiple TMSUs exposing the same `Capability_ID`, each with implementation-specific binding and evidence provenance.

Below: evidence thread connecting trial, model, adapter, semantic profile, execution environment, evidence set and current intended-use decision.

The visual message is **controlled separation without creating another runtime platform**.

### Figure 2 — Empirical evidence ladder

A horizontal eight-stage pipeline:

```text
BP -> MS -> SP -> EQ -> EB -> EA -> VU -> LC
```

Each stage should show:

- the claim under test;
- the evidence object added;
- PASS / FAIL / UNKNOWN state;
- what the result permits the next stage to claim.

Important visual elements:

- VU-01a is retained as a red/negative branch feeding corrected VU-01b;
- `UNKNOWN` persists across SP -> EQ -> EA -> VU -> LC;
- LC ends with a deliberate refusal arrow rather than another unconditional PASS.

### Figure 3 — Same contract, different qualification

Use two dimensions:

X-axis: lifecycle change magnitude / dependency intersection.

Y-axis: evidence required before intended-use claim can be current.

Show:

```text
metadata -> reuse
adapter provenance -> typed delta
semantic mapping -> semantic reassessment
model algorithm / Implementation_ID -> fresh implementation-level qualification
contract / upper trial -> wider reassessment
```

This becomes the central “manageability” figure.

### Figure 4 — Evidence state transition under VU vs LC

Panel A: VU-01b

```text
old evidence -> some stale -> typed delta -> claim restored
```

Panel B: LC-01

```text
old evidence -> implementation-specific evidence stale
             -> fresh architecture PASS
             -> intended-use remains UNKNOWN pending fresh fitness evidence
```

Both panels retain historical records.

## 9. Main tables

### Table 1 — TMSU conformance/evidence fields

Include:

```text
Capability_ID
Model_Implementation_ID
Contract_ID
Semantic_Profile_ID
Scenario/Domain profile
Adapter/Binding identity
Execution environment identity
Evidence_Set_ID
Evidence dependencies
Intended use
Current applicability state
Qualification result
```

### Table 2 — Evidence chain and inference boundaries

One row per BP/MS/SP/EQ/EB/EA/VU/LC with `Question`, `Result`, `Supported inference`, `Not supported`.

### Table 3 — Change class to evidence action

Use Evidence Lifecycle Profile v1.2 as the source.

## 10. Results structure for manuscript

### Result 1 — A real legacy TWS capability can be preserved and externally controlled

BP-01.

### Result 2 — A heterogeneous second implementation can be substituted without changing upper trial logic

MS-01.

### Result 3 — Structural substitution does not establish semantic or use-specific fitness

SP-01 + EQ-01.

### Result 4 — Boundary isolation constrains change and reassessment propagation

EB-01.

### Result 5 — Evidence can accumulate without blindly accumulating trust

EA-01 + durable `UNKNOWN`.

### Result 6 — Evidence carry-forward requires typed comparison and a stopping rule

VU-01a/b + LC-01.

This final Result 6 should be the manuscript's conceptual peak.

## 11. Discussion structure

### 11.1 What “统型” means in this study

Not converting all simulators into one codebase and not replacing existing simulation interoperability standards.

It means:

```text
stable capability identity
+ controlled external contract
+ explicit semantics
+ implementation-specific binding
+ traceable evidence provenance
+ bounded qualification inheritance
```

### 11.2 Why T&E changes the modernization problem

Ordinary software modularity asks whether a component can be connected/replaced. T&E additionally asks whether the evidence supporting its use remains valid after that replacement/change.

Therefore the unit of management is not just code or API. It is:

```text
capability + implementation + semantics + evidence + intended use
```

### 11.3 `UNKNOWN` as a positive safety property

A mature evidence system must be able to say “evidence insufficient” without converting that state into failure or silent compatibility.

### 11.4 Why evidence history and current qualification must diverge

Deletion loses auditability; blind inheritance loses validity. Append-only history + selective applicability resolves this tension.

### 11.5 When delta requalification stops

VU and LC provide the paired result:

```text
controlled provenance change -> bounded delta carry-forward
substantive algorithm identity change -> fresh affected qualification
```

### 11.6 Limitations

One capability class; two public heterogeneous codebases plus one algorithm variant; narrow scenario envelopes; no enterprise-scale repository; no authoritative accreditation; no human engineer-hour experiment; no claim of fidelity equivalence.

## 12. Novelty statement

The paper's novelty should not be claimed as a new simulation bus, API standard or VV&A process.

A defensible novelty statement is:

> This study operationalizes modular M&S modernization for digital T&E as an evidence-lifecycle problem. It demonstrates, with a real legacy simulation capability and an independent heterogeneous implementation, that capability-level substitution, semantic qualification, intended-use screening, cumulative evidence, typed delta reassessment, persistent uncertainty and an explicit carry-forward stop rule can be represented and empirically exercised as one traceable workflow.

## 13. Claim discipline

Use these formulations:

```text
SUPPORTED:
manageable / traceable / cumulative evidence
bounded heterogeneous substitution
selective staleness and requalification
explicit UNKNOWN
bounded evidence inheritance
stable upper trial in demonstrated cases

DO NOT CLAIM:
enterprise-wide plug-and-play
universal interchangeability
behavioral/fidelity equivalence between models
authoritative accreditation
percentage reduction in engineer-hours
universal evidence reuse rate
new replacement for HLA/DIS/FMI/MSaaS
```

## 14. Recommended next work

WP1 mechanism experiments should stop here.

The next work package is manuscript production:

```text
M1. freeze claim-evidence matrix
M2. generate four main figures and three main tables
M3. write Methods around the preregistered evidence gates
M4. write Results strictly from frozen evidence
M5. write Discussion against RAND/MOSA/VV&A context
M6. complete source/evidence audit so every manuscript claim points to a frozen evidence set or authoritative external source
```

No new model or integration mechanism should be added unless manuscript review identifies a specific unsupported central claim.

## 15. Primary external anchors for literature integration

- Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation, 2025. RRA3261-1.
- DoD / OUSD(R&E). Modular Open Systems Approach guidance and MOSA implementation materials.
- DoDM 5000.102. *Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 9 Dec 2024.
- MIL-STD-3022. *Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.

These sources establish the modernization, modularity, intended-use, version-control and VV&A context. The empirical TMSU evidence lifecycle remains the contribution tested in this study.
