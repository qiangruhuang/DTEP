# Evidence-Aware Unification of Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Contracts, Cumulative Evidence, and Selective Requalification

**Manuscript draft v0.1 — evidence-frozen WP1**

## Abstract

Legacy modeling and simulation (M&S) environments used in acquisition and test and evaluation (T&E) often combine model logic, data, interfaces, semantic assumptions and local integration code in monolithic software systems. Enterprise modernization concepts increasingly emphasize modular open architectures, reusable data and incremental migration, but a T&E-specific problem remains: replacing or updating a model implementation also changes the evidentiary basis on which that model may be used for a particular test purpose. We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned Test Modeling and Simulation Unit (TMSU), defined as a logical capability/conformance package rather than a new simulation runtime. A TMSU separates `Capability_ID` from `Model_Implementation_ID` and associates a capability contract, semantic profile, implementation binding and traceable evidence provenance with each implementation. Using a real legacy OpenEaagles track-while-scan radar capability and an independently developed public RadarSimPublic radar/tracking implementation, we evaluated an eight-stage evidence chain. A wrapper preserved the declared OpenEaagles observable behavior exactly in 16/16 frozen cases. A heterogeneous model swap required no changes to the frozen upper trial and both implementations passed the same structural contract in 16/16 cases. A semantic precheck rejected 5/5 structurally valid injected mismatches and returned `UNKNOWN` for an unresolved real RF concept. Intended-use screening consequently qualified a bounded kinematic research use while retaining `UNKNOWN` for an RF-performance use. Subsequent experiments showed that evidence can accumulate without deleting history while applicability changes selectively; a strict byte-level carry-forward rule failed on repeated numerical execution, whereas an evidence-type-aware numerical criterion supported a controlled provenance-only revision. Finally, changing the selected RadarSimPublic tracking algorithm from a constant-velocity to a constant-acceleration Kalman filter crossed the carry-forward boundary: both algorithms executed the old 16-case envelope, but automatic implementation-specific qualification inheritance was rejected and fresh affected fitness evidence remained required. These results support a bounded modernization principle for digital T&E: evidence history can be provenance-monotonic while qualification remains configuration- and intended-use-dependent. The engineering value demonstrated here is manageability, traceability and bounded evidence inheritance rather than reduced source-code volume or measured integration time.

## 1. Introduction

Modeling and simulation are embedded throughout defense acquisition, experimentation and T&E, yet many long-lived simulation environments have accumulated tightly coupled model logic, data representations, interfaces and application-specific integration. RAND's 2025 *A Modernized Enterprise Army Modeling and Simulation Concept* describes an Army M&S infrastructure facing aging software, model/data silos and difficulty capturing, curating and reusing information generated across acquisition activities. Contemporary Modular Open Systems Approach (MOSA) guidance similarly emphasizes modular design, open key interfaces, conformance and the ability to add, modify or replace components across the system life cycle.

These modernization directions are necessary but do not completely specify the T&E problem. For ordinary software modularity, the central question is often whether one component can be connected to or replaced by another. For T&E, a second question is unavoidable: **what happens to the evidence that justified use of the previous model for a particular purpose?** A new implementation may satisfy the same interface while using different assumptions or physics; a small adapter change may leave model behavior intact; a semantic mapping may alter the meaning of an otherwise valid data structure; a numerical model may produce non-bitwise-identical traces across execution environments without a scientifically meaningful behavioral change. Treating all changes either as requiring complete revalidation or as permitting automatic inheritance produces two opposite failures: evidentiary reset or blind trust.

Existing Verification, Validation and Accreditation (VV&A) guidance already makes intended use and versioning central. MIL-STD-3022 establishes common documentation structures intended to promote consistency and reuse across VV&A products. DoDM 5000.102 requires M&S V&V planning for operational and live-fire T&E to identify intended use, version control, capabilities, assumptions, limitations, uncertainty and validation response variables. Our study does not replace these processes or issue accreditation decisions. Instead, it investigates a narrower implementation question: can heterogeneous model capabilities and their supporting evidence be organized so that evidence remains traceable and reusable where justified, becomes stale where necessary, and explicitly refuses inheritance when a change crosses a defensible boundary?

We operationalized this question through a SAL-aligned TMSU. TMSU is not another simulation bus or middleware layer. It is a logical packaging and conformance unit that separates an abstract test capability from concrete implementations and attaches semantic, execution and evidence metadata to the implementation boundary. We then built a sequence of empirical tests around one real legacy capability—OpenEaagles TWS radar with AirTrkMgr—and an independently developed RadarSimPublic radar/Kalman tracking implementation.

The study addresses five questions. First, can a stable capability boundary preserve a real legacy implementation while supporting a heterogeneous alternative? Second, can implementations be substituted without changing upper trial logic? Third, can structural interoperability be separated from semantic compatibility? Fourth, can intended-use qualification and evidence applicability be represented explicitly through lifecycle change? Fifth, does this organization reduce uncontrolled change and reassessment propagation, even if it does not reduce total lines of code or directly measured engineering time?

The central contribution is an evidence-lifecycle result: **evidence history can accumulate monotonically while qualification does not**. A historical evidence record remains auditable even after becoming stale for a new configuration; an `UNKNOWN` remains unresolved until relevant evidence addresses it; a controlled provenance-only change may be carried forward with an evidence-type-appropriate delta check; and a substantive model-algorithm change can be prevented from inheriting implementation-specific qualification while unrelated evidence remains reusable.

## 2. Methods

### 2.1 TMSU logical unit

The frozen TMSU formulation was:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the components represent the capability/contract, semantic declaration, service or execution binding, evidence bundle, test profile and provenance package defined in the research protocol. The TMSU is a logical capability/conformance package; it need not correspond to one container or one runtime process.

A fundamental identity constraint is:

```text
Capability_ID != Model_Implementation_ID
```

The empirical capability used in this study was:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

This same capability identity was exposed by distinct OpenEaagles and RadarSimPublic implementations.

### 2.2 Evidence record and qualification state

We represent evidence conceptually as:

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

Current qualification is conditional rather than a global model label:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE, UNKNOWN, NOT_QUALIFIED}
```

where `I` is implementation, `U` intended use, `C` current configuration and `E_t` accumulated evidence at time `t`.

For a change set `Delta(C)`, an existing evidence record remains directly applicable only when its declared dependencies do not intersect the change:

```text
Dep(E) ∩ Delta(C) = ∅
```

When dependencies intersect, the record is retained historically but becomes stale for the changed configuration unless appropriate delta evidence restores the affected claim.

The evidence history itself is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

### 2.3 BP-01: legacy behavior preservation

We selected the public OpenEaagles TWS radar and AirTrkMgr capability at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A deterministic headless native probe observed track count, track identity, range, range rate, relative azimuth, elevation, track quality and average RF signal directly from the OpenEaagles track manager. The TMSU M1 wrapper executed the same native probe as an external process and applied zero transformations to its stdout behavior trace.

The frozen behavior matrix was a full 2×2×2×2 design over target range (10 or 20 km), azimuth (0° or 20°), RCS (1 or 4 m²) and motion (static or closing at 150 m/s), for 16 cases. Behavior preservation required successful execution, native track production, absence of the earlier Station host warning and exact byte identity between native and wrapped traces. A negative control deliberately modified one recorded track value and had to be rejected.

### 2.4 MS-01: real heterogeneous substitution

A second implementation was drawn from the independent public repository `Murmur-ops/RadarSimPublic` at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. The adapter executed the upstream radar equation/SNR calculation, constant-velocity Kalman filter and track-quality logic without modifying the upstream source.

The upper trial specification, orchestrator and capability contract were frozen. Substitution changed only the implementation binding. Each implementation executed the same 16-case upper trial. MS-01 required successful execution and validation against the common structural contract; it did not require cross-implementation numerical equality.

### 2.5 SP-01: semantic precheck

We compared structural metadata validation alone against structural validation plus a semantic precheck. Five structurally valid negative cases deliberately changed one of: range unit, azimuth unit, range-rate sign convention, reference frame or time basis. A positive control preserved all declarations. A real RadarSimPublic RF mapping—`Radar.snr(range, rcs)` mapped to the canonical `average_signal_db` field—was used as an ambiguity control because available evidence did not establish equivalence between signal-to-noise ratio and the OpenEaagles track-average-signal concept.

The semantic evaluator returned `COMPATIBLE`, `INCOMPATIBLE` or `UNKNOWN`.

### 2.6 EQ-01: intended-use qualification

Four intended-use cases exercised machine-readable evidence screening. A bounded kinematic research/conformance use required range, range-rate and azimuth observables within the executed E2 domain. An RF-performance use additionally required the unresolved RF concept and comparative model-validity evidence. A 50 km use was outside the executed evidence domain. A final case injected an explicit unit conflict.

The allowed decisions were `QUALIFIED_WITHIN_EVIDENCE`, `UNKNOWN` and `NOT_QUALIFIED`.

### 2.7 EB-01: change surface and reassessment propagation

We compared the TMSU binding route with a controlled direct point-to-point integration of the same RadarSimPublic implementation. Both arms executed the same 16 cases and produced identical canonical outputs. We measured shared upper-orchestrator modifications, direct model dependencies and the number of evidence/retest scopes affected by a semantic-mapping-only change. The experiment did not treat total LOC as a proxy for engineering time.

### 2.8 EA-01: cumulative evidence lifecycle

BP-01 through EB-01 were registered in an append-only evidence graph with explicit dependencies. We replayed sequential evidence accumulation and controlled lifecycle changes. Historical evidence retention and current applicability were tracked separately. The central test was whether new evidence or configuration changes could selectively alter applicability without deleting prior records or silently resolving an existing `UNKNOWN`.

### 2.9 VU-01a/b: typed version carry-forward

A real adapter/binding provenance revision was introduced while the upstream RadarSimPublic model, implementation identity, contract, semantic profile and field mapping remained unchanged.

VU-01a initially required exact SHA-256 identity of floating-point traces across independent executions. A repeated final-head run failed this rule in 8 of 16 cases due to machine-precision-scale numeric representation differences.

VU-01b retained that negative result and changed the preregistered comparison to exact discrete record structure plus normalization of floating fields to nine decimal places. A +1e-6 m perturbation served as a comparator sensitivity control and had to be rejected.

### 2.10 LC-01: model-algorithm carry-forward boundary

LC-01 deliberately crossed the provenance-only VU envelope. The selected RadarSimPublic tracking algorithm changed from the real upstream `initialize_constant_velocity_filter` to `initialize_constant_acceleration_filter`, and the `Implementation_ID` changed accordingly. The upstream repository commit, upper trial, capability contract, semantic profile and declared field mappings remained frozen.

Both algorithms executed the old E2 envelope. Their canonical behavior traces were compared after exact discrete matching and nine-decimal numerical normalization. A separate maneuvering-target sensitivity challenge—20 km initial range, 20° azimuth, 150 m/s initial closing speed and 15 m/s² closing acceleration—tested whether the two algorithm choices were genuinely distinguishable outside the old E2 envelope.

The lifecycle decision was specified independently of whether the old envelope happened to show similar traces: a substantive model-algorithm or implementation-identity change must not automatically inherit implementation-specific intended-use qualification.

## 3. Results

### 3.1 Legacy behavior was preserved within the frozen wrapper envelope

BP-01 passed all 16 cases. Every case produced native tracks, all native-versus-wrapper byte distances were zero, and the missing-Station warning was absent. The 16 native traces were distinct across the behavior matrix, demonstrating that the result was not 16 repetitions of one identical behavior trace. The negative control was rejected.

The result supports transparent M1 wrapping of this OpenEaagles capability within the declared observation and scenario envelope. It does not establish hidden-state or universal behavioral equivalence.

### 3.2 Real heterogeneous model substitution required no upper-trial edits

MS-01 v2 passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic. The frozen trial specification, orchestrator and capability contract were unchanged; only binding selection differed. Cross-implementation traces differed in all 16 matched cases, as expected for distinct implementations.

This separates architectural substitutability from behavioral equivalence: the common contract made both implementations executable behind the same upper trial, but it did not imply equal model outputs or fidelity.

### 3.3 Structural validity did not imply semantic compatibility

All seven SP-01 cases passed structural validation. Semantic evaluation then rejected all five injected mismatches, accepted the positive control, and returned `UNKNOWN` for the real RF relation.

Thus:

```text
structural PASS != semantic COMPATIBLE
```

The `UNKNOWN` result was treated as non-compatible for qualification purposes rather than being coerced into either compatibility or incompatibility without evidence.

### 3.4 Intended-use qualification depended on evidence scope

EQ-01 produced the four preregistered decisions exactly. The bounded kinematic research/conformance use was `QUALIFIED_WITHIN_EVIDENCE`. The RF-performance use was `UNKNOWN` because both the RF semantic relation and comparative model-validity evidence were unresolved. The 50 km case was `UNKNOWN` because it lay outside the executed evidence envelope, and the explicit unit conflict was `NOT_QUALIFIED`.

The same implementation and binding therefore received different decisions for different intended uses.

### 3.5 The engineering benefit was change isolation, not fewer lines of code

Both EB-01 arms passed 16/16 cases with byte-identical outputs. The TMSU path made zero changes to the shared upper orchestrator and had no direct RadarSimPublic references in that core. The controlled direct path changed 160 upper-core lines and introduced nine direct RadarSimPublic references. The isolated TMSU boundary itself contained 224 physical lines, so the experiment did not support a claim of lower total source code.

For the controlled semantic-mapping update, the TMSU path required reassessment of 1/4 declared scopes versus 3/4 for the direct path. The supported benefit is therefore smaller shared-core coupling and evidence invalidation radius.

### 3.6 Evidence accumulated while applicability remained selective

EA-01 accumulated the five preceding evidence records without deleting prior records. Controlled change cases preserved the historical evidence base while selectively changing current applicability. The RF semantic `UNKNOWN` persisted through later evidence additions.

The result establishes the lifecycle distinction:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

### 3.7 A failed byte-level carry-forward rule exposed the need for typed evidence criteria

VU-01a's exact floating-trace hash rule failed on a final-head repeated execution: 8/16 cases were exact and 8/16 differed only at machine-precision numerical levels. The failure was retained rather than reclassified as a model failure.

VU-01b then applied the frozen nine-decimal numerical representation rule. All 16 historical/current traces matched at that criterion, and the +1e-6 m negative perturbation was rejected. The affected architectural and intended-use path was restored with delta evidence while BP-01 and SP-01 were reused and the RF `UNKNOWN` remained unresolved.

This demonstrates that evidence reuse requires a comparator appropriate to the evidence type and execution environment.

### 3.8 A substantive algorithm change crossed the carry-forward boundary

LC-01 changed the selected RadarSimPublic tracking algorithm and `Implementation_ID` while keeping the upstream repository commit, upper trial, contract and declared semantic mappings frozen.

Both CV and CA configurations passed all 16 old E2 cases. At the frozen normalized behavior criterion, 12/16 matched and 4/16 differed. The old E2 envelope was therefore not uniformly discriminating.

The maneuver sensitivity challenge clearly separated the algorithms: the maximum absolute range difference was 109.0755 m and the maximum absolute range-rate difference was 67.6108 m/s. In this constructed accelerated-target case, CV range and range-rate RMSE were 49.3549 m and 39.9658 m/s, respectively, while CA values were 0.0453 m and 0.5330 m/s. These values demonstrate algorithm discrimination in the challenge; they are not evidence of general operational superiority.

The lifecycle engine rejected automatic carry-forward of implementation-specific qualification. BP-01 and SP-01 remained reusable because their dependencies were unchanged. Prior CV-specific MS/EQ/EB/VU evidence remained historical but stale for the CA configuration. Fresh CA architectural execution was re-established as `PASS_FRESH_EXECUTION`, while the CA kinematic intended-use state remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`. The RF semantic and performance states remained `UNKNOWN`.

This provides the empirical stop rule missing from an unconditional reuse narrative.

## 4. Discussion

### 4.1 “Unification” should mean governable capability boundaries, not one codebase

The experiments do not support replacing heterogeneous simulators with one implementation, nor do they motivate another runtime platform. The evidence instead supports a narrower interpretation of model unification for digital T&E: stable capability identity, controlled contracts, explicit semantics, implementation-specific bindings and traceable evidence provenance allow heterogeneous models to remain technically distinct while being managed through a common trial-facing abstraction.

This interpretation is consistent with MOSA's emphasis on modularity and replaceable components, but adds a T&E-specific constraint: component replacement and evidence inheritance are separate decisions.

### 4.2 Structural interoperability, semantics and fitness are distinct layers

MS-01 alone could have produced an overly strong “plug-and-play” claim. SP-01 and EQ-01 prevented that interpretation. A model can pass the same structural contract yet remain semantically unresolved for one output and evidence-insufficient for one intended use. The empirical hierarchy is therefore:

```text
structural conformance
< semantic qualification
< execution/behavior evidence
< intended-use fitness
< accreditation decision
```

The study evaluates the lower and intermediate layers. Accreditation remains an authoritative external process.

### 4.3 `UNKNOWN` is a useful evidence state

The persistent RF `UNKNOWN` is not a defect in the framework. It is evidence that the framework can represent insufficiency without fabricating compatibility. The state survived EQ-01, evidence accumulation, a successful provenance-only version update and a later algorithm change. It was never silently overwritten by unrelated PASS results.

LC-01 produced a second form of `UNKNOWN`: after fresh CA architectural execution, intended-use fitness remained unresolved. This demonstrates that successful execution is not equivalent to validation for a test purpose.

### 4.4 Cumulative evidence requires both preservation and refusal

The central lifecycle insight is that a useful evidence repository must support two apparently opposing operations. It must preserve historical evidence so that prior decisions remain auditable, and it must refuse to apply that evidence to configurations for which the dependencies no longer hold.

EA-01 supplies append-only accumulation and selective staleness. VU-01b supplies a positive delta-carry-forward example. LC-01 supplies the stopping rule. Together these avoid both complete evidentiary reset and blind inheritance.

### 4.5 The comparison rule is itself part of the evidence method

VU-01a is important precisely because it failed. A naive hash-based definition of equivalence would have made a numerically stable maintenance revision appear to invalidate half of the traces. Replacing that rule after inspecting the failure would be weak evidence unless the new rule also had a sensitivity control. VU-01b therefore incorporated a fixed numeric normalization and a deliberately detectable perturbation.

Long-lived digital T&E repositories will encounter changes in compiler, hardware, numerical libraries and execution infrastructure. The appropriate equivalence criterion should therefore be an explicit property of the evidence profile rather than an implicit property of a file hash.

### 4.6 Model-algorithm changes require fresh affected evidence even when contracts survive

LC-01 is the main boundary result. The common contract successfully supported both algorithms, and most old-envelope cases looked equivalent at the chosen observable criterion. Neither fact justified inheritance of the earlier implementation-specific qualification. A deliberately discriminating challenge showed that the implementations were materially different under another admissible dynamic condition.

The implication is not that every algorithm update requires redoing every prior activity. Rather, change classification determines reassessment radius. Evidence whose dependencies are unaffected remains current; implementation-specific behavior and fitness evidence must be renewed to the extent required by the intended use.

### 4.7 Engineering value is manageability rather than measured speed

The study intentionally does not translate changed lines, evidence-gate counts or reassessment scopes into engineer-hours. EB-01 even showed that the isolated boundary could contain more physical lines than the direct integration changed in the upper core. The measurable benefit is architectural and evidentiary locality: model-specific change is externalized from shared trial logic, and the evidence graph identifies which claims need renewed support.

This is particularly relevant to T&E because the cost of a modification includes determining which prior evidence remains admissible, not merely writing new software.

## 5. Limitations

The empirical study uses one primary capability class and two public heterogeneous model codebases, plus one algorithm variant within RadarSimPublic. Scenario envelopes are deliberately small and deterministic. No result establishes enterprise-wide model interchangeability, equal model fidelity, authoritative VV&A/accreditation, automatic semantic inference, portfolio-scale repository performance or organization-wide time/cost reduction.

The LC-01 maneuver challenge was designed to discriminate two algorithms, not to validate either against operational truth. The current CA intended-use fitness state therefore correctly remains unresolved. Similarly, the RadarSimPublic RF semantic ambiguity remains `UNKNOWN` because this study did not obtain evidence sufficient to equate the two physical concepts.

The evidence dependency graph is a research profile rather than a universal taxonomy. Other model classes, stochastic simulations and distributed federations will require different behavior and equivalence criteria. In particular, stochastic evidence should use preregistered seed or distributional criteria rather than the deterministic trace methods used in BP-01.

## 6. Conclusion

A practical modernization path for legacy simulation software in digital T&E must manage more than interfaces. It must manage the relationship between capability identity, implementation identity, semantic meaning, version change and evidence for intended use. In the bounded TWS case studied here, a SAL-aligned TMSU preserved a real legacy capability, enabled substitution of an independent heterogeneous implementation without rewriting the upper trial, detected semantic incompatibility and uncertainty, produced intended-use-dependent qualification decisions, isolated model-specific change and maintained an append-only evidence history. A controlled provenance revision could be carried forward with typed delta evidence, whereas a substantive tracking-algorithm change correctly crossed the inheritance boundary and required fresh affected qualification.

The resulting principle is concise:

> Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are restored by evidence-type-appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the tested qualification boundary.

For digital T&E, this shifts model modernization from a narrow question of software integration to a lifecycle question of evidence governability.

## References — working set

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Modular Open Systems Approach* guidance and implementation materials.
3. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. December 9, 2024.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. Zimmerman P, Ofori M, Barrett D, Soler J, Harriman A, et al. Considerations and examples of a modular open systems approach in defense systems. *Journal of Defense Modeling and Simulation*. 2019;16(4).

## Internal frozen evidence sources

- BP-01 — `mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md`
- MS-01 v2 — `mre2/model_substitution/E2_MODEL_SUBSTITUTION_REAL_EVIDENCE_v2.md`
- SP-01 — `research/SP01_SEMANTIC_PRECHECK_EVIDENCE_v1.md`
- EQ-01 — `research/EQ01_EVIDENCE_AWARE_QUALIFICATION_EVIDENCE_v1.md`
- EB-01 — `research/EB01_ENGINEERING_BURDEN_EVIDENCE_v1.md`
- EA-01 — cumulative evidence lifecycle artifact/run `34000965675`
- VU-01a/b — `research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md`
- LC-01 — `research/LC01_ALGORITHM_CHANGE_CARRY_FORWARD_BOUNDARY_EVIDENCE_v1.md`
- WP1 evidence manifest — `tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json`
