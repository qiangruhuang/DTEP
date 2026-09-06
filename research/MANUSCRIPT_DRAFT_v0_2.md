# Evidence-Aware Unification of Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Contracts, Cumulative Evidence, and Selective Requalification

**Manuscript draft v0.2 — terminology-corrected, WP1 evidence locked**

## Abstract

Legacy modeling and simulation (M&S) environments used in acquisition and test and evaluation (T&E) often combine model logic, data, interfaces, semantic assumptions and local integration code in long-lived monolithic software systems. Enterprise modernization initiatives increasingly emphasize modular open architectures, reusable data and incremental migration, but T&E adds a separate problem: replacing or updating a model implementation also changes the evidentiary basis on which that implementation may be used for a particular test purpose. We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned **Test Model Service Unit (TMSU)**, defined as a logical capability/conformance package rather than a new simulation runtime. A TMSU separates stable `Capability_ID` from concrete `Implementation_ID` and associates capability contracts, semantic declarations, implementation bindings and traceable evidence provenance with the model boundary. Using a real legacy OpenEaagles track-while-scan radar capability and an independently developed public RadarSimPublic radar/tracking implementation, we evaluated an eight-stage evidence chain. A wrapper preserved the declared OpenEaagles observable behavior exactly in 16/16 frozen cases. A heterogeneous model substitution required no upper-trial edits and both implementations passed the same frozen structural contract in 16/16 cases each. A semantic precheck rejected 5/5 structurally valid injected mismatches and returned `UNKNOWN` for an unresolved real RF concept. Intended-use screening qualified a bounded kinematic research use while retaining `UNKNOWN` for an RF-performance use. Evidence then accumulated without deleting history while applicability changed selectively. A strict byte-level carry-forward rule failed on repeated numerical execution, whereas an evidence-type-aware numerical criterion supported one controlled provenance-only revision. Finally, changing the selected RadarSimPublic tracking algorithm from a constant-velocity to a constant-acceleration Kalman filter crossed the tested carry-forward boundary: both algorithms executed the old 16-case envelope, but automatic implementation-specific qualification inheritance was rejected and fresh affected fitness evidence remained required. These results support a bounded modernization principle for digital T&E: **evidence history can be provenance-monotonic while qualification remains configuration- and intended-use-dependent**. The engineering value demonstrated here is manageability, traceability and bounded evidence inheritance rather than reduced source-code volume or measured integration time.

## 1. Introduction

M&S is used across defense acquisition, experimentation and T&E, yet long-lived simulation environments frequently accumulate tightly coupled model logic, data representations, semantic assumptions and application-specific integration. RAND's 2025 *A Modernized Enterprise Army Modeling and Simulation Concept* describes an Army M&S infrastructure affected by aging software, model/data silos and limited ability to capture, curate and reuse M&S-generated information across acquisition activities [1]. Contemporary Modular Open Systems Approach (MOSA) policy similarly emphasizes modular design, open key interfaces, verifiable conformance and the ability to add, modify or replace components across the system lifecycle [2,3].

These modernization directions are necessary but do not fully specify the T&E problem. In ordinary software modularity, the central question is often whether one component can connect to or replace another. T&E introduces a second question: **what happens to the evidence that justified use of the previous model for a particular purpose?** The replacement may satisfy the same interface while changing assumptions or algorithms. A small adapter revision may leave model behavior intact. A semantic mapping may change the meaning of structurally valid data. A numerical model may produce non-bitwise-identical traces across execution environments without a scientifically meaningful change. Treating every change as requiring complete revalidation causes evidentiary reset; treating interface compatibility as sufficient for evidence inheritance causes blind reuse.

Existing VV&A guidance makes intended use, configuration and evidence documentation central. MIL-STD-3022 provides common documentation structures for V&V and accreditation products and is explicitly intended to facilitate consistent information sharing and reuse [4]. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, version control, capabilities, assumptions, limitations, uncertainty and the response variables used for evaluation and validation [5]. Our work does not replace these processes and does not issue an accreditation decision. Instead, it investigates a narrower implementation question: can heterogeneous model capabilities and their supporting evidence be organized so that evidence remains traceable and reusable where justified, becomes stale when dependencies change, and explicitly refuses inheritance when change crosses a defensible boundary?

We operationalized this question through a SAL-aligned TMSU. The frozen TMSU conformance profile defines a TMSU as a packaging/conformance profile for a model capability, not a runtime middleware layer. It distinguishes `Capability_ID`, `Implementation_ID`, `Contract_ID`, `Semantic_Profile_ID` and immutable `Evidence_Set_ID`. The central identity rule is:

```text
Capability_ID != Implementation_ID
```

This distinction allows multiple implementations to expose one trial-facing capability without conflating the test need with a particular codebase.

We evaluated the approach through a sequence of experiments based on one real legacy capability—OpenEaagles TWS radar plus AirTrkMgr—and an independent public RadarSimPublic radar/Kalman tracking implementation. The research asks whether a stable capability boundary can preserve a legacy implementation, whether a real heterogeneous alternative can be substituted without changing upper trial logic, whether structural interoperability can be separated from semantic compatibility, whether intended-use qualification can be reconstructed from explicit evidence, and whether evidence can accumulate and be selectively requalified as model configurations evolve.

The resulting contribution is an evidence-lifecycle mechanism rather than a new simulation bus. Evidence records remain historically auditable even when they become stale for a new configuration; `UNKNOWN` remains unresolved until relevant evidence addresses it; a controlled provenance-only revision may use evidence-type-appropriate delta evidence; and a substantive model-algorithm change may be prevented from inheriting implementation-specific qualification while unrelated evidence remains reusable.

## 2. Methods

### 2.1 TMSU and capability identity

The frozen logical formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

The component identities and required artifacts follow the frozen research protocol. The equation is used here to emphasize that a TMSU is a logical composition of contract, semantic, binding, evidence, test and provenance artifacts rather than a container or runtime middleware component.

The study used the following common trial-facing identity:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values.

### 2.2 Evidence model

We represent an evidence record conceptually as:

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

Current qualification is conditional rather than a global model property:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE,
     UNKNOWN,
     NOT_QUALIFIED}
```

where `I` is an implementation, `U` an intended use, `C` the current configuration and `E_t` the accumulated evidence base at time `t`.

For a configuration change `Delta(C)`, original evidence remains directly active when:

```text
Dep(E) ∩ Delta(C) = ∅
```

Otherwise it remains historically retained but becomes stale for the changed configuration unless an allowed delta reassessment restores the affected claim. Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

### 2.3 BP-01: behavior preservation of a real legacy capability

We selected OpenEaagles TWS radar plus AirTrkMgr at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A deterministic headless native probe observed track count, track identity, range, range rate, relative azimuth, elevation, quality and average RF signal directly from the native track manager. The M1 TMSU wrapper executed the same probe as an external process and applied zero transformations to the native stdout behavior trace.

The frozen behavior matrix was a 2×2×2×2 design over target distance (10 or 20 km), azimuth (0° or 20°), RCS (1 or 4 m²) and motion (static or closing at 150 m/s), yielding 16 cases. Preservation required successful execution, native tracks, absence of the previously observed missing-Station warning and exact trace identity. A deliberately modified trace served as a negative control.

### 2.4 MS-01: real heterogeneous substitution

The second implementation came from the independent public repository `Murmur-ops/RadarSimPublic` at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. The TMSU binding called the upstream radar/SNR, constant-velocity Kalman and track-quality components without modifying upstream source.

The upper trial specification, orchestrator and capability contract were frozen. Substitution changed only the implementation binding. Each implementation executed the same 16 matched cases. MS-01 evaluated architectural/contract substitution, not numerical or fidelity equivalence between the models.

### 2.5 SP-01: semantic precheck

SP-01 compared structural validation alone with structural validation plus a semantic precheck. Five structurally valid negative cases changed one semantic dimension: range unit, azimuth unit, range-rate sign convention, reference frame or time basis. A positive control preserved all declarations. A real RadarSimPublic mapping of `Radar.snr(range, rcs)` to the canonical `average_signal_db` field was retained as an ambiguity control because available evidence did not establish equivalence between RF signal-to-noise ratio and the canonical track-average-signal concept.

Semantic decisions were `COMPATIBLE`, `INCOMPATIBLE` or `UNKNOWN`.

### 2.6 EQ-01: intended-use qualification screening

Four preregistered use cases were evaluated. A bounded kinematic research/conformance use required range, range-rate and azimuth within the executed E2 envelope. An RF-performance use additionally required the unresolved RF concept and comparative model-validity evidence. A 50 km use lay outside the executed domain. A final case injected an explicit range-unit conflict.

The screen was deliberately separated from authoritative accreditation.

### 2.7 EB-01: change surface and reassessment propagation

We compared the TMSU route with a controlled point-to-point integration of the same RadarSimPublic implementation. Both arms executed the same 16 cases and were required to produce the same canonical outputs. We measured upper-orchestrator modification, concrete-model dependencies and the declared evidence/retest scopes affected by a semantic-mapping-only update. Total LOC was not treated as engineer time.

### 2.8 EA-01: evidence accumulation

BP-01 through EB-01 were registered in a closed, acyclic evidence graph without modifying their frozen reports. Sequential stage replay tested append-only accumulation, current decision reconstruction, persistence of `UNKNOWN` and selective staleness under controlled metadata, semantic, adapter, upper-trial and contract changes.

### 2.9 VU-01a/b: carry-forward under a controlled provenance revision

A real RadarSimPublic adapter/binding provenance revision was introduced while the upstream model commit, `Implementation_ID`, capability contract, semantic profile and declared semantic mapping remained unchanged.

VU-01a required exact SHA identity across independent floating-point traces. A final-head repeated execution failed this criterion in 8/16 cases. The observed differences were at machine-precision scale.

VU-01b retained that failure as a negative result and used an evidence-type-aware criterion: exact discrete record structure plus nine-decimal normalization of floating fields. A +1e-6 m perturbation had to be rejected as a comparator sensitivity control.

### 2.10 LC-01: carry-forward boundary under model-algorithm change

LC-01 deliberately crossed the VU provenance-only envelope. The selected RadarSimPublic algorithm changed from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter. `Implementation_ID` changed, while the repository commit, upper trial, contract, semantic profile and declared field mappings remained frozen.

Both configurations executed the old 16-case E2 envelope. Their canonical S/T traces were compared after exact discrete matching and nine-decimal numeric normalization. A separate maneuvering-target challenge used a 20 km initial range, 20° azimuth, 150 m/s initial closing speed and 15 m/s² closing acceleration to verify that the algorithm choices were genuinely discriminable outside the original E2 envelope. The challenge was a sensitivity/discrimination control, not an operational validation.

The lifecycle decision was specified independently of old-envelope similarity: a substantive `MODEL_ALGORITHM` or implementation-identity change must not automatically inherit prior implementation-specific intended-use qualification.

## 3. Results

### 3.1 A real legacy capability was preserved behind the wrapper boundary

BP-01 passed all 16 frozen cases. Every case produced native tracks; direct and wrapped traces were byte-identical; the Station warning was absent; and all 16 baseline behavior traces were distinct. The negative control was rejected. These data support M1 wrapper transparency within the declared deterministic observation envelope, not universal or hidden-state equivalence.

### 3.2 A real heterogeneous implementation was substituted without upper-trial changes

MS-01 v2 passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic. The trial specification, orchestrator and capability contract were unchanged; only binding selection changed. The two implementations produced different canonical traces in all 16 matched scenarios, which is compatible with the experiment's architectural—not behavioral-equivalence—objective.

### 3.3 Structural validity was insufficient for semantic compatibility

All seven SP-01 cases passed structural validation. Semantic evaluation rejected 5/5 injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RF relation. Thus:

```text
structural PASS != semantic COMPATIBLE
```

The ambiguity was not coerced into either compatibility or incompatibility without evidence.

### 3.4 Qualification depended on intended use and evidence scope

All four EQ-01 cases matched their preregistered decisions. The bounded kinematic research/conformance use was `QUALIFIED_WITHIN_EVIDENCE`; the RF-performance use was `UNKNOWN`; the 50 km case was `UNKNOWN` because it lay outside the evidence domain; and the explicit unit conflict was `NOT_QUALIFIED`.

The same implementation therefore received different qualification decisions when the intended use changed.

### 3.5 The demonstrated engineering benefit was change isolation, not less code

Both EB-01 integration arms passed 16/16 cases with byte-identical outputs. The TMSU route changed zero upper-orchestrator lines and introduced zero direct RadarSimPublic references into the shared core. The controlled direct route changed 160 upper-core lines and introduced nine direct model references. The isolated TMSU boundary itself contained 224 physical lines, so total LOC superiority was not supported.

For the controlled semantic-mapping update, 1/4 declared reassessment scopes were affected under TMSU versus 3/4 under the direct route. The supported advantage is reduced shared-core coupling and evidence invalidation radius.

### 3.6 Evidence accumulated without monotonically accumulating trust

EA-01 grew the frozen evidence-record set from one to five records while retaining every earlier record. Six final decision queries were reconstructed from explicit provenance. Controlled lifecycle changes retained 5/5 historical records while selectively changing their applicability. The RF semantic `UNKNOWN` introduced by SP-01 persisted after EQ-01 and EB-01 evidence were added.

The empirical lifecycle distinction is:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

### 3.7 The carry-forward comparator itself required validation

VU-01a's strict byte-level rule failed on repeated numerical execution: only 8/16 traces retained exact SHA identity. This failure was preserved as methodological evidence.

VU-01b's typed numerical criterion matched 16/16 prior/current traces after the frozen normalization and rejected the +1e-6 m negative perturbation. BP-01 and SP-01 were reused without re-execution; the affected architectural/intended-use path was restored through delta evidence; the unrelated RF `UNKNOWN` remained `UNKNOWN`.

This result supports carry-forward for the tested provenance-only revision, not a universal requalification shortcut.

### 3.8 A substantive algorithm change crossed the evidence-inheritance boundary

LC-01 changed the selected RadarSimPublic tracking algorithm and `Implementation_ID`. Both CV and CA configurations passed all 16 old E2 cases. At the frozen normalized behavior criterion, 12/16 were equal and 4/16 differed. The old regression envelope was therefore not uniformly discriminating.

The maneuver challenge materially separated the algorithms:

```text
max |range_CA - range_CV|          = 109.0754918963 m
max |range-rate_CA - range-rate_CV| = 67.6107619584 m/s
```

In the same constructed challenge:

```text
CV range RMSE       = 49.3549496311 m
CA range RMSE       = 0.0453110175 m
CV range-rate RMSE  = 39.9657741219 m/s
CA range-rate RMSE  = 0.5330317957 m/s
```

These metrics demonstrate discriminability under an accelerating target; they are not evidence of general or operational CA superiority.

The lifecycle decision rejected automatic implementation-specific qualification inheritance. BP-01 and SP-01 remained active because their declared dependencies were unchanged. CV-specific MS/EQ/EB/VU evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was re-established as `PASS_FRESH_EXECUTION`; CA kinematic intended-use fitness remained:

```text
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

The RF semantic and RF-performance states also remained `UNKNOWN`.

## 4. Discussion

### 4.1 Model unification for digital T&E is a governance problem, not a code-convergence problem

The experiments do not support converting heterogeneous simulators into one common codebase or introducing another runtime platform. The evidence instead supports a narrower meaning of “unification”: stabilize the trial-facing capability identity and contract, keep concrete model implementations distinct, and make semantics, bindings and supporting evidence explicitly manageable.

This is compatible with MOSA's lifecycle emphasis on modular and replaceable components [2,3], but T&E introduces a stricter distinction: **replaceability of the component does not imply inheritance of the evidence supporting its use**.

### 4.2 Interoperability is layered

MS-01 could be misread as a plug-and-play result if considered alone. SP-01 and EQ-01 demonstrate why that interpretation is too strong. Structural conformance does not establish semantic compatibility; semantic compatibility does not by itself establish intended-use fitness; and the study does not make an accreditation decision.

A useful hierarchy is:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

TMSU evidence organization supplies traceable inputs to the lower and intermediate layers and can support later trial-specific VV&A/accreditation activities, but it does not replace the accreditation authority.

### 4.3 `UNKNOWN` is a durable evidence state

The unresolved RF concept first appeared in SP-01, blocked the RF-performance use in EQ-01, persisted through EA-01 evidence accumulation, survived the successful VU-01b revision, and remained unresolved after LC-01. It was never overwritten by unrelated PASS results.

LC-01 produced a second `UNKNOWN`: fresh CA architectural execution succeeded, yet intended-use fitness was not inherited. These results show that evidence insufficiency can be represented explicitly rather than being collapsed into either failure or implicit trust.

### 4.4 Cumulative evidence requires selective staleness

Deleting old evidence when a model changes destroys auditability. Applying all old evidence to the changed configuration destroys validity. EA-01 separates historical retention from current applicability. Evidence may remain available as `HISTORICAL` while becoming `STALE` for a new configuration.

This creates the central lifecycle principle:

```text
historical retention != current applicability
current applicability != intended-use qualification
```

VU-01a/b adds:

```text
numerical equivalence != byte identity
```

LC-01 adds:

```text
contract compatibility != qualification inheritance
```

### 4.5 Evidence inheritance needs both a positive rule and a stop rule

VU-01b and LC-01 form a paired lifecycle result. A controlled adapter/binding provenance revision, with model identity and semantics frozen, could restore affected current claims using typed numerical delta evidence plus a sensitivity control. A substantive tracking-algorithm and `Implementation_ID` change crossed that carry-forward envelope.

The consequence is not “large change means rerun everything.” Rather:

```text
larger dependency intersection
-> larger affected reassessment radius
```

Unchanged evidence may remain active. Changed implementation-specific behavior and fitness claims require fresh support.

### 4.6 The old regression envelope cannot be the only lifecycle criterion

LC-01 is particularly informative because both algorithms passed all 16 old cases and 12/16 were equal at the frozen normalized behavior criterion. A lifecycle policy based only on whether legacy regression tests pass would therefore under-identify the significance of the algorithm change. The independent maneuver challenge showed that the two algorithms can diverge materially when dynamics change.

The lifecycle engine therefore uses both declared change identity/dependencies and evidence appropriate to the claim being inherited. Contract conformance and regression similarity are evidence inputs, not automatic permission to reuse model validity.

### 4.7 The engineering benefit is manageability and change locality

EB-01 deliberately prevents a “less code” narrative: the isolated TMSU boundary contained more physical lines than the upper-core churn in the direct benchmark. Nor did we measure engineer-hours. The measurable benefit is locality. The shared upper trial remains stable in demonstrated substitutions; model-specific dependencies are kept at the boundary; and the evidence graph identifies which claims become stale when that boundary changes.

For T&E, this matters because a modification creates both an implementation task and an evidence-admissibility task. The current study addresses the latter directly.

## 5. Limitations

The study evaluates one primary capability class, two public heterogeneous codebases and one algorithm variant within RadarSimPublic. The scenario envelopes are deliberately small. No experiment establishes enterprise-wide interchangeability, equal model fidelity, automatic semantic inference, authoritative VV&A/accreditation, organization-wide time/cost savings or enterprise-scale evidence-store performance.

The LC-01 maneuver challenge was constructed to distinguish CV and CA tracking behavior, not to validate either against operational data. The CA kinematic intended-use state therefore remains unresolved pending fresh fitness evidence. Likewise, the RadarSimPublic RF semantic relation remains `UNKNOWN` because the study did not establish physical-concept equivalence.

The evidence dependency graph is a research profile rather than a universal taxonomy. Other model classes and stochastic simulations will require evidence-type-appropriate comparison methods. In particular, stochastic evidence should use preregistered seeded or distributional criteria rather than deterministic trace identity.

## 6. Conclusion

A practical modernization path for heterogeneous simulation software in digital T&E must manage more than interfaces. It must manage the relationship between capability identity, implementation identity, semantic meaning, configuration change and evidence for intended use. In the bounded TWS case studied here, a SAL-aligned TMSU preserved a real legacy capability, enabled substitution of an independent heterogeneous implementation without rewriting the upper trial, detected semantic incompatibility and uncertainty, produced intended-use-dependent qualification decisions, isolated model-specific change and maintained a cumulative evidence history. A controlled provenance revision could be restored with typed delta evidence; a substantive model-algorithm revision correctly crossed the automatic inheritance boundary and required fresh affected qualification.

The resulting principle is:

> **Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are restored by evidence-type-appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the tested qualification boundary.**

For digital T&E, this reframes legacy model modernization from a narrow software-integration problem into a lifecycle problem of evidence governability.

## Working references

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Modular Open Systems Approach*. Systems Engineering and Architecture guidance.
3. U.S. Department of Defense. *SD-28: Standardization Decisions for a Modular Open Systems Approach (MOSA)*. 12 March 2026.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 9 December 2024.
6. Zimmerman P, Ofori M, Barrett D, Soler J, Harriman A, et al. Considerations and examples of a modular open systems approach in defense systems. *Journal of Defense Modeling and Simulation*. 2019;16(4).

## Frozen internal evidence

- `mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md`
- `mre2/model_substitution/E2_MODEL_SUBSTITUTION_REAL_EVIDENCE_v2.md`
- `research/SP01_SEMANTIC_PRECHECK_EVIDENCE_v1.md`
- `research/EQ01_EVIDENCE_AWARE_QUALIFICATION_EVIDENCE_v1.md`
- `research/EB01_ENGINEERING_BURDEN_EVIDENCE_v1.md`
- `research/EA01_EVIDENCE_ACCUMULATION_EVIDENCE_v1.md`
- `research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md`
- `research/LC01_ALGORITHM_CHANGE_CARRY_FORWARD_BOUNDARY_EVIDENCE_v1.md`
- `tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json`
- `tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_2.md`
