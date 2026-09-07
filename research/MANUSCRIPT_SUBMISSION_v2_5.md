# Unifying Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance across Model Evolution

**Experimental revision candidate v2.5 — WP-FMI, WP-BL and WP-ENV evidence frozen**

## Abstract

**Purpose:** Digital test and evaluation (T&E) requires a stable way to organize heterogeneous simulation models and a defensible rule for qualification evidence as implementations and execution environments evolve. We evaluate a Simulation Abstraction Layer (SAL)-aligned Test Model Service Unit (TMSU) that separates trial-facing capability identity from concrete implementation identity and associates executable bindings with semantics, provenance, intended use, and evidence dependencies.

**Methods:** OpenEaagles TWS/AirTrkMgr and an independent RadarSimPublic radar/tracking implementation were used to test behavior preservation, heterogeneous substitution, semantic precheck, intended-use qualification, cumulative evidence, provenance-only carry-forward, execution-environment carry-forward, and an algorithm-change stopping rule. An FMI 3.0 Co-Simulation micro-demonstration tested standards-based execution and machine-readable metadata mapping. A three-arm ablation compared direct coupling, a competent plain software façade, and SAL/TMSU under functionally equivalent execution.

**Results:** OpenEaagles wrapper behavior was preserved in 16/16 cases, and both tracking implementations executed 16/16 cases behind one frozen upper trial. FMI-01 executed an FMI 3.0 Co-Simulation path and satisfied all four preregistered M3 Native criteria. In BL-01, direct, plain-façade, and SAL/TMSU arms produced byte-identical outputs in 16/16 matched cases; both the façade and SAL/TMSU removed executable concrete-model references from the shared upper core, whereas only SAL/TMSU carried the tested semantic, intended-use, and evidence-lifecycle controls. Semantic precheck rejected 5/5 injected mismatches while retaining a real RF relation as `UNKNOWN`. A provenance-only revision passed an evidence-type-aware carry-forward test, and an FMI runtime change from fmusim 0.9.0 to 0.10.0 made prior execution evidence stale before repeat/equivalence evidence restored the affected current claim. A constant-velocity to constant-acceleration tracker change prevented automatic inheritance of implementation-specific qualification.

**Conclusions:** A capability boundary can organize heterogeneous implementations over conventional adapters and standard execution mechanisms. The tested TMSU increment is T&E-specific governance attached to that boundary: explicit semantics, intended-use qualification, typed evidence dependencies, and bounded lifecycle inheritance. Evidence history can accumulate monotonically while current qualification remains configuration-, intended-use-, and evidence-dependent.

**Keywords:** modeling and simulation; digital test and evaluation; heterogeneous model unification; model interoperability; verification validation and accreditation; evidence reuse; model lifecycle; modular open systems; Functional Mock-up Interface

## 1. Introduction

Long-lived modeling and simulation (M&S) environments often bind useful model logic to implementation-specific data structures, semantic assumptions, and local integration code. Enterprise modernization therefore emphasizes modularity, open interfaces, reusable data, and incremental migration. RAND's enterprise Army M&S concept identifies aging infrastructure, model/data silos, and limited capture, curation, and reuse of M&S-generated information as persistent modernization problems [1]. DoD Modular Open Systems Approach (MOSA) guidance similarly emphasizes modular, loosely coupled systems, verifiable conformance, and lifecycle component replacement [2,3].

For digital T&E, modernization creates two coupled problems. The first is architectural: **can heterogeneous model implementations be organized behind a stable trial-facing boundary so that one implementation can replace another without rewriting upper-trial logic?** The second is evidentiary: **when an implementation or its execution context changes, which evidence supporting its use remains applicable?**

Interface compatibility does not establish model validity. Two implementations may satisfy one schema while representing different physical quantities, assumptions, or algorithms. A small adapter revision can preserve behavior, whereas a model-algorithm change can alter implementation-specific fitness despite an unchanged external contract. Numerical evidence can also depend on runtime and numerical-stack identity. Resetting all evidence after every change discards reusable knowledge; unqualified inheritance of prior evidence creates unsupported trust.

Existing verification, validation, and accreditation (VV&A) guidance treats intended use, model version, assumptions, limitations, uncertainty, and evidence documentation as central [4,5]. Reference-modeling and digital-engineering research likewise links model reuse to conceptual boundaries, validation use cases, and lifecycle credibility [6–9]. Interoperability and simulation-reuse research emphasizes standards, composability, and reusable components [10,14]. The present study addresses how heterogeneous-model organization and evidence applicability can be coupled at an executable T&E boundary.

We use a SAL-aligned **Test Model Service Unit (TMSU)** as a logical packaging and conformance unit. Runtime and exchange mechanisms remain external execution substrates. The central identity rule is:

```text
Capability_ID != Implementation_ID
```

A capability identifies what the trial requests; an implementation identifies the concrete software/model instance associated with evidence. TMSU associates a capability contract, semantic declarations, executable binding, provenance, intended-use constraints, and evidence with that boundary.

The study makes two linked contributions. First, it instantiates a method for **heterogeneous model unification** that preserves implementation heterogeneity while stabilizing upper-trial logic. Second, it extends that organization into a **configuration-aware evidence lifecycle** that distinguishes historical retention, current applicability, delta reassessment, and refusal of automatic inheritance. FMI-01, BL-01, and ENV-01 refine the mechanism boundaries without extending the study to broad multi-capability validation.

We ask four research questions:

**RQ1 — Heterogeneous model unification.** Can a stable capability boundary preserve a real legacy implementation and support a genuinely heterogeneous alternative without rewriting upper-trial logic?

**RQ2 — Qualification layers.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3 — Cumulative evidence.** Can evidence history accumulate while current applicability changes selectively as configurations evolve?

**RQ4 — Bounded inheritance.** Can the lifecycle distinguish changes that permit selective carry-forward from substantive implementation changes that require fresh affected qualification?

## 2. Related work and study positioning

### 2.1 Modular modernization and reuse

MOSA and enterprise M&S modernization motivate replaceable modular components [1–3]. Tolk et al. connect requirements capture, conceptual modeling, V&V, and composable M&S development [6]. Noguchi identifies standards gaps that limit broader interoperability of models developed in local contexts [10]. Recent simulation-reuse work distinguishes conceptual, open/reproducible, and black-box/component reuse [14]. These streams motivate modularity and reuse but do not determine whether qualification evidence from one configuration remains applicable after an implementation or execution environment changes.

### 2.2 Credibility and lifecycle VV&A

Winton et al. emphasize validation use cases connecting intended purpose and evidence [7]. Hill describes model-based and standards-based VV&A artifacts in digital-engineering ecosystems [8]. Fonseca i Casas frames VV&A as a continuous lifecycle process [9]. Owen and Chakrabortty review defense VV&A practice and emphasize executable comparison evidence [11], while M&S SPICE relates required credibility to task criticality [12]. Cross-domain credible-practice guidance similarly emphasizes context, version control, documentation, comparison of implementations, and standards [13].

The present work does not issue accreditation or replace these frameworks. It operationalizes a narrower executable-boundary relation:

```text
model replaceability != qualification-evidence inheritance
```

## 3. Methods

### 3.1 TMSU capability, execution, and evidence model

The frozen logical formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the elements denote the capability/contract package, service/execution contract, semantic profile, evidence bundle, test profile, and provenance package defined in the research protocol. The primary empirical thread used:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values. Execution mechanisms were treated as binding-level concerns. The v2.5 design allows implementation bindings to invoke native executables, adapters, or standards-based model interfaces while preserving the trial-facing capability identity and evidence controls.

An evidence record is represented as:

```text
E = <Claim, Configuration, IntendedUse, Domain,
     Method, Result, Dependencies, Provenance>
```

Research qualification is conditional:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE, UNKNOWN, NOT_QUALIFIED}
```

where `I` is implementation, `U` intended use, `C` current configuration, and `E_t` the accumulated evidence available at time `t`. `QUALIFIED_WITHIN_EVIDENCE` denotes support for a declared bounded research use and has no authoritative accreditation meaning.

Evidence history is append-only:

```text
E_(t+1) = E_t ∪ DeltaE
```

For configuration change `Delta(C)`, existing evidence remains directly active when:

```text
Dep(E) ∩ Delta(C) = ∅
```

When dependencies intersect the change, the record is retained historically and becomes stale for the changed configuration until claim-appropriate affected evidence is supplied. `UNKNOWN` denotes evidence insufficiency and remains distinct from `STALE`.

### 3.2 RQ1 — Behavior preservation, heterogeneous substitution, and FMI execution

BP-01 used OpenEaagles TWS radar plus AirTrkMgr at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A native probe recorded track count, identity, range, range rate, relative azimuth, elevation, quality, and RF signal. A TMSU M1 wrapper executed the same native probe without transforming its evidence trace.

The frozen full-factorial envelope contained 16 combinations of range (10/20 km), azimuth (0°/20°), RCS (1/4 m²), and motion (static/closing 150 m/s). Preservation required successful execution and exact direct-versus-wrapper trace identity; a deliberately altered trace served as a comparator negative control.

MS-01 introduced the independent public `Murmur-ops/RadarSimPublic` implementation at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. Its adapter invoked upstream radar/SNR, Kalman-filter, and track-quality components without upstream source changes. Upper trial, orchestrator, capability contract, and semantic-profile identifier were frozen. Substitution changed implementation binding only. MS-01 tested architectural/contract substitutability and did not impose cross-implementation behavioral equivalence.

FMI-01 exercised a standards-based execution route using the Modelica Association Reference-FMUs v0.0.40 FMI 3.0 `BouncingBall.fmu` and `fmusim 0.10.0`. This experiment was defined as an execution/conformance micro-demonstration under `platform.motion.vertical_state`; it was excluded from fitness or broad second-capability validation claims. The FMU was validated and executed through FMI 3 Co-Simulation for 0–1 s with a 0.01 s output interval. `modelDescription.xml` supplied variable names, types, causality, units, and interface metadata. The frozen mapping resolved `h` (`Position`, m) to `height_m` and `v` (`Velocity`, m/s) to `vertical_velocity_mps`. A sidecar supplied only T&E-specific fields absent from FMI metadata: program capability identity, domain concept identity, reference-frame/sign declarations, intended-use boundary, evidence state, and evidence/provenance policy.

The M3 Native micro-demonstration required four conditions: an approved FMI 3 execution profile, canonical variables resolved from machine-readable FMI metadata, no model-specific procedural adapter, and T&E-only declarations supplied separately from the model interface.

### 3.3 RQ2 — Semantic and intended-use qualification

SP-01 compared structural validation with structural plus semantic precheck across concept, datatype, unit, reference frame, time basis, and sign convention. Five structurally valid negative cases changed range unit, azimuth unit, range-rate sign, reference frame, or time basis; a positive control preserved all declarations. A real ambiguity control retained RadarSimPublic `Radar.snr(range, rcs)` mapped to canonical `average_signal_db`, because available evidence did not establish equivalence between SNR and the canonical track-average-signal concept. Semantic decisions were `COMPATIBLE`, `INCOMPATIBLE`, or `UNKNOWN`.

EQ-01 evaluated four use cases: a bounded kinematic research/conformance use; an RF-performance use requiring the unresolved RF concept and comparative validity evidence; a 50 km use outside the executed evidence domain; and an explicit range-unit conflict.

### 3.4 RQ3 — Stronger software baseline and cumulative evidence

EB-01 originally compared the TMSU binding route with a controlled direct point-to-point integration of the same RadarSimPublic implementation. Functional equivalence was required before software change-surface comparisons. The resulting direct-versus-TMSU observations were retained as a controlled precursor and were not used to establish uniqueness of adapter isolation.

BL-01 introduced a stronger three-arm ablation using the same frozen RadarSimPublic implementation and 16-case E2 trial:

1. **Direct coupling:** model-specific imports, configuration, and mapping were placed in the upper trial code.
2. **Plain façade:** a competent software façade isolated RadarSimPublic behind a stable call boundary and intentionally omitted TMSU semantic, intended-use, and evidence-lifecycle governance.
3. **SAL/TMSU:** the existing adapter/binding route was used with the same frozen upper orchestrator.

All three arms had to execute all 16 cases and produce byte-identical canonical traces before software-localization or governance comparisons. Executable concrete-model references in the shared upper core were counted separately from implementation identity or provenance labels. Boundary nonblank lines were reported descriptively and were not interpreted as engineer time, cost, or productivity. The governance ablation recorded presence or absence of five controls: semantic profile, explicit `UNKNOWN`, intended-use gate, typed evidence dependencies, and lifecycle rule.

EA-01 registered BP-01 through the accumulated evidence chain in a machine-readable acyclic evidence graph. Sequential replay tested append-only accumulation, current-decision reconstruction, persistence of `UNKNOWN`, and selective staleness under controlled configuration changes.

### 3.5 RQ4 — Provenance, execution-environment, and algorithm-change inheritance

VU-01 changed adapter/binding provenance while keeping the RadarSimPublic model commit, `Implementation_ID`, upper trial, contract, and semantic mapping unchanged. VU-01a initially required exact cross-run SHA identity for floating-point traces. A later full rerun failed this rule in 8/16 cases because of machine-precision-scale representation differences. The failure was retained.

VU-01b used an evidence-type-aware comparator: discrete record structure remained exact, while floating fields were normalized to nine decimal places for cross-run representation comparison. A `+1e-6 m` range perturbation served as a sensitivity control. The normalization was restricted to evidence representation and had no radar-validity interpretation.

ENV-01 exercised the previously untested `EXECUTION_ENVIRONMENT` dependency. The same Reference-FMUs v0.0.40 `BouncingBall.fmu`, FMI 3 Co-Simulation invocation, host operating system, kernel, architecture, and GitHub Actions runner were held constant while the execution runtime changed from `fmusim 0.9.0` to `fmusim 0.10.0`. Runtime version and runtime-binary SHA256 were the changed environment-identity fields. Each runtime was executed ten times on the same runner. Within-environment repeat stability required byte identity across all ten traces. Cross-environment comparison required identical columns and row counts, time differences ≤ `1e-15 s`, and absolute `h`/`v` differences ≤ `1e-12`. A single `h` value perturbed by `+1e-6` served as the negative control.

The source execution evidence declared dependencies on `CAPABILITY`, `IMPLEMENTATION`, `EXECUTION_ENVIRONMENT`, and `EVIDENCE_METHOD`. A semantic-control record declared dependencies on `SEMANTIC_PROFILE` and `CAPABILITY_CONTRACT`. The preregistered lifecycle rule required the source execution evidence to become `STALE` when its typed dependency intersected the environment change. Successful repeat/equivalence evidence could then restore only the affected current execution/conformance claim as `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`; evidence with an empty dependency intersection remained active without reassessment.

LC-01 changed the selected RadarSimPublic tracker from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter. `Implementation_ID` changed while repository commit, upper trial, contract, and semantic mapping remained frozen. Both configurations executed the old 16-case envelope. A separate accelerating-target challenge (20 km, 20°, initial closing speed 150 m/s, closing acceleration 15 m/s²) tested whether the algorithm selections were behaviorally distinguishable. The carry-forward decision was based on change class and evidence dependencies rather than old-envelope similarity alone.

## 4. Results

### 4.1 RQ1 — A stable capability boundary supported heterogeneous implementations and an FMI execution route

BP-01 passed all 16 frozen cases. Direct and wrapped OpenEaagles traces were byte-identical; all cases produced behavior-bearing tracks; the 16 baseline traces were distinct; and the negative control was rejected.

MS-01 passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic behind the same frozen upper trial. The trial specification, orchestrator, and capability contract were unchanged, and substitution was isolated to binding selection. Cross-implementation canonical traces differed in all 16 matched cases, consistent with distinct internal implementations.

FMI-01 validated and executed the FMI 3.0 Co-Simulation FMU and produced 101 output rows over 0–1 s. The machine-readable model description identified eight model variables, the `Position`, `Velocity`, and `Acceleration` declared types, and the `m`, `m/s`, and `m/s2` unit definitions. Both canonical variables were resolved from FMI metadata, and all four preregistered M3 Native criteria passed. The T&E sidecar carried capability identity, reference-frame/sign semantics, intended-use boundary, evidence state, and provenance/evidence policy that were outside the frozen FMI mapping.

These results support a bounded architectural interpretation. The primary `sensor.tws.track` experiments demonstrate heterogeneous implementation organization behind a stable trial-facing boundary. FMI-01 establishes an executable standards-based binding mechanism under a separate micro-demonstration scope; it does not establish broad motion-model fidelity or multi-capability generalization.

### 4.2 RQ2 — Substitution remained separate from semantic compatibility and fitness

All seven SP-01 cases passed structural validation. Semantic evaluation rejected all five injected mismatches, accepted the positive control, and returned `UNKNOWN` for the real RadarSimPublic RF relation.

```text
structural PASS != semantic COMPATIBLE
```

EQ-01 produced all four preregistered decisions: the bounded kinematic research use was `QUALIFIED_WITHIN_EVIDENCE`; the RF-performance use was `UNKNOWN`; the 50 km use was `UNKNOWN`; and the explicit unit conflict was `NOT_QUALIFIED`.

```text
model substitutability
!= semantic compatibility
!= intended-use fitness
```

The RF `UNKNOWN` records a defined evidence gap. Subsequent positive execution and lifecycle evidence did not alter that unrelated semantic state.

### 4.3 RQ3 — The plain-façade baseline isolated software modularity from the TMSU governance increment

BL-01 passed its functional-equivalence gate. Direct coupling, plain façade, and SAL/TMSU each executed all 16 cases, and all 16 matched canonical traces were byte-identical across the three arms.

Executable concrete-model references in the shared upper core were nine for direct coupling and zero for both the plain façade and SAL/TMSU. The plain-façade boundary contained 71 nonblank lines and the SAL/TMSU adapter-plus-binding boundary contained 199 nonblank lines. These counts describe the tested change surface only; they do not measure engineering burden or total lifecycle cost.

The five T&E governance controls were absent from the deliberately plain façade and present in the SAL/TMSU arm: semantic profile, explicit `UNKNOWN`, intended-use gate, typed evidence dependencies, and lifecycle rule. The stronger baseline therefore narrows the architectural claim: ordinary competent software engineering can provide model isolation, while the tested TMSU increment resides in the T&E governance attached to the capability boundary.

EA-01 retained prior evidence records while recomputing current applicability under controlled changes. Historical records were not deleted, and the RF semantic `UNKNOWN` persisted through unrelated positive evidence.

The resulting lifecycle distinction remained:

```text
Evidence history is provenance-monotonic.
Current qualification is not monotonic.
```

### 4.4 RQ4 — Typed delta evidence supported two bounded carry-forward cases and rejected an algorithm-change inheritance

VU-01a's exact cross-run byte criterion failed: 8/16 traces retained exact SHA identity. VU-01b matched 16/16 historical/current traces under the corrected representation rule and rejected the `+1e-6 m` negative control. This supported selective carry-forward for the tested provenance-only revision while preserving the unrelated RF `UNKNOWN`.

ENV-01 changed only the recorded fmusim runtime version and runtime-binary identity among the frozen environment fields: `fmusim 0.9.0` to `fmusim 0.10.0`. The FMU hash, FMI interface, Linux operating system, kernel, x86_64 architecture, and hosted runner were identical within the workflow job. The ten source-runtime traces were byte-identical to one another, and the ten changed-runtime traces were byte-identical to one another. Every changed-runtime trace matched the source reference under the preregistered numerical comparator; the observed maximum absolute time and state differences were both zero, and the source and changed reference traces were also byte-identical. The `+1e-6` state perturbation was rejected.

The typed dependency intersection for the source execution evidence was exactly `{EXECUTION_ENVIRONMENT}`. Its lifecycle state therefore changed from `ACTIVE` to `STALE` for the changed environment while historical provenance was retained. The semantic-control record had no dependency intersection and remained `ACTIVE`. Repeat/equivalence and negative-control evidence restored the affected current execution/conformance claim to `ACTIVE` with decision `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`. This restoration did not extend to broader intended-use fitness.

LC-01 crossed this tested carry-forward envelope. CV and CA configurations both executed all 16 old cases; 12/16 were equal at the frozen normalized criterion and four differed. The maneuver challenge further separated the algorithms, with maximum absolute CV–CA differences of 109.0755 m in range and 67.6108 m/s in range rate. These values are discrimination controls and carry no operational-validity or general CA-superiority interpretation.

Automatic implementation-specific qualification inheritance was rejected after the CV→CA algorithm and `Implementation_ID` change. Unaffected BP-01 and SP-01 evidence remained active. Prior CV-specific MS/EQ/EB/VU evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution established `PASS_FRESH_EXECUTION`; CA kinematic intended-use fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`, and the RF states remained `UNKNOWN`.

Within the tested scope, RQ4 is supported by a three-point lifecycle pattern: a provenance-only change permitted typed delta carry-forward, an execution-runtime change triggered selective staleness followed by claim-bounded restoration, and a substantive algorithm/identity change invoked the stopping rule.

## 5. Discussion

### 5.1 Capability abstraction can coexist with standard execution mechanisms

The primary unification result concerns the trial-facing boundary. OpenEaagles and RadarSimPublic retained distinct internal architectures, languages, model logic, and implementation identities while the frozen upper trial addressed the same capability contract. The architecture therefore organizes heterogeneity without requiring internal convergence between model implementations.

FMI-01 clarifies the role of standards in this architecture. FMI supplied an executable Co-Simulation interface and machine-readable model metadata for the micro-demonstration. TMSU supplied the T&E-specific identity and evidence context used by the study: capability identity, domain/reference-frame semantics, intended-use boundary, qualification state, and typed evidence/provenance dependencies. The two layers address different concerns. Standards-based execution can therefore be placed under a capability/evidence boundary without creating a second middleware runtime.

The FMI result has a deliberately restricted inference range. A simple Reference FMU established the execution and metadata mechanism. It does not provide evidence that arbitrary FMI models have sufficient semantics for T&E, nor does it validate a second operational capability class. The primary heterogeneous-model evidence remains the `sensor.tws.track` OpenEaagles/RadarSimPublic thread.

### 5.2 The stronger baseline narrows the novelty claim

BL-01 materially changes the interpretation of the earlier direct-integration comparison. A competent plain façade removed executable concrete-model coupling from the upper core just as the SAL/TMSU arm did, and the three arms produced identical outputs in the frozen experiment. Generic adapter isolation and upper-layer modularity are therefore insufficient as claims of distinctive TMSU value.

The ablation identifies a narrower increment that is directly relevant to digital T&E. The plain façade intentionally lacked the semantic profile, explicit uncertainty state, intended-use gate, typed evidence dependencies, and lifecycle rule; SAL/TMSU carried all five while preserving the same functional output. This result locates the contribution in governed capability reuse rather than ordinary software encapsulation.

The boundary-line counts reinforce the need for this narrower interpretation. The tested SAL/TMSU boundary contained more nonblank lines than the plain façade. The evidence therefore supports no claim of lower source volume, reduced engineer time, or lower integration cost. Program-scale economic effects remain outside the empirical scope.

### 5.3 Test-grade unification requires layered qualification

SP-01 and EQ-01 show why successful execution cannot serve as the final T&E gate. Structural conformance, semantic qualification, execution evidence, intended-use fitness, and authoritative accreditation remain distinct layers:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

The persistent RF `UNKNOWN` demonstrates the practical role of an explicit evidence-insufficiency state. The mapping is structurally legal and executable, yet current evidence does not establish the physical relation required for the RF-performance use. Later successful substitution, runtime execution, or lifecycle maintenance leaves that separate claim unresolved.

FMI-01 points to the same boundary from a standards perspective. Machine-readable unit, type, and causality metadata can reduce manual binding work when the required concepts align with the contract. T&E-specific concept identity and intended-use evidence still require explicit declarations or further evidence when the standardized model metadata does not establish them.

### 5.4 Typed dependencies make staleness selective

EA-01 established the general rule that evidence history and current applicability evolve differently. ENV-01 exercises that rule on an actual execution-environment change. The prior FMI execution evidence depended on `EXECUTION_ENVIRONMENT`; changing the runtime therefore made that evidence stale for the new configuration before any behavior comparison was considered. A semantic-control record whose dependencies excluded the environment remained active.

The ENV-01 result also separates lifecycle logic from observed numerical change. The two fmusim versions produced byte-identical traces in this deterministic micro-demonstration. The prior execution evidence still became stale because its declared environment dependency changed. The subsequent repeat/equivalence result supplied new evidence that restored the affected execution/conformance claim. This ordering prevents unchanged output from silently bypassing provenance and configuration control.

The same-machine ten-repeat design closes the attribution gap relevant to this specific test: each runtime was internally byte-stable on one runner, and the changed-runtime comparison was therefore not confounded by observed within-runner repeat variation. The result remains limited to the tested FMI/runtime combination. Cross-OS, cross-hardware, compiler, stochastic-model, and HLA-runtime changes require claim-appropriate criteria.

### 5.5 Carry-forward requires both a positive envelope and a stop rule

VU-01b, ENV-01, and LC-01 define complementary points on the tested lifecycle. VU-01b shows a provenance-only revision for which evidence-type-aware comparison can restore the affected current path. ENV-01 shows an execution-runtime revision for which typed dependency intersection first makes prior execution evidence stale and delta evidence subsequently restores that bounded claim. LC-01 shows a substantive model-algorithm and implementation-identity change for which automatic implementation-specific qualification inheritance is rejected.

LC-01 is informative because both algorithms executed the old 16-case envelope and most normalized traces matched. Regression survival alone therefore cannot determine evidence inheritance. The dependency and change-class rules require fresh affected fitness evidence once the model algorithm and implementation identity change materially. Historical evidence remains useful for provenance and unaffected claims, so the stopping rule does not require a total evidence reset.

The combined lifecycle principle is:

> **Preserve evidence history monotonically; recompute current applicability from typed dependencies; restore affected claims only with claim-appropriate delta evidence; require fresh affected qualification when substantive model change crosses the tested carry-forward boundary.**

### 5.6 Implications for digital T&E modernization

The experiments support a layered modernization pattern. Existing legacy models can remain internally intact behind implementation-specific bindings. Newer models can use conventional façades or standards such as FMI where appropriate. A stable capability boundary then carries the T&E information required to decide what the model represents, where it may be used, which evidence supports that use, and which changes invalidate that evidence.

This organization is compatible with incremental modernization because it does not require a universal model representation or a universal simulation runtime. Its empirical support is nevertheless bounded. The present study establishes mechanisms in one primary tracking capability, one standards-execution micro-demonstration, and a small set of controlled lifecycle changes. Enterprise deployment would require additional capability-specific contracts, stochastic evidence rules, runtime/federation profiles, governance ownership, and program-level cost evaluation.

## 6. Limitations

The primary empirical study evaluates one capability class, two public heterogeneous tracking codebases, and one algorithm change within RadarSimPublic. FMI-01 adds a standards-execution micro-demonstration using a simple deterministic Reference FMU; it is not a second full capability validation. Scenario envelopes are deliberately small. The work does not establish universal plug-and-play interchangeability, equal model fidelity, universal contract optimality, automatic semantic inference, authoritative accreditation, organization-wide time/cost savings, or enterprise-scale evidence-store performance.

BL-01 uses a deliberately competent plain façade as a controlled software-engineering baseline rather than an empirical sample of industrial integration practices. Its boundary LOC measures describe only the tested code paths. ENV-01 changes one FMI runtime version on one Linux x86_64 hosted runner; operating-system, hardware, compiler, HLA, stochastic-model, and broader numerical-stack portability remain untested.

The RadarSimPublic RF relation remains `UNKNOWN`. The LC-01 maneuver challenge was constructed to distinguish CV and CA behavior and does not validate either against operational data; CA intended-use fitness remains unresolved. The evidence dependency graph is a research profile rather than a universal M&S change taxonomy. Other capability classes and stochastic simulations require claim-appropriate evidence criteria.

## 7. Conclusion

This study proposes and empirically evaluates a capability-based method for heterogeneous simulation-model organization in digital T&E and couples that method to a configuration-aware evidence lifecycle. A stable TMSU boundary preserved a real legacy implementation and supported an independent heterogeneous implementation without upper-trial rewriting. FMI-01 further showed that a standard FMI 3 execution path can supply machine-readable execution/model metadata while T&E-specific capability, semantics, intended-use, and evidence declarations remain attached to the governed boundary.

The stronger plain-façade baseline constrains the architectural claim. Software isolation alone is achievable with ordinary competent encapsulation. The tested TMSU increment consists of semantic qualification, explicit uncertainty, intended-use gating, typed evidence dependencies, and lifecycle rules linked to the same capability boundary.

The lifecycle experiments demonstrate selective inheritance across different change classes. Historical evidence remains retained; current applicability changes with configuration. Provenance-only and execution-runtime revisions supported bounded restoration after claim-appropriate delta evidence, whereas a substantive tracker algorithm and `Implementation_ID` change crossed the automatic carry-forward boundary and required fresh affected qualification.

> **Unify heterogeneous model capabilities at a stable trial-facing boundary, and manage qualification evidence as a versioned, dependency-aware lifecycle asset.**

## Acknowledgements

**Author completion required before submission.** Include non-author contributions only if applicable and with contributor consent where required.

## Author contributions

**Author completion required before submission.** Confirm author order and contribution statements for all listed authors before upload.

## Generative AI use disclosure

OpenAI ChatGPT was used during research-software prototyping/checking, literature and source organization, figure drafting, and manuscript language/structure development. Generative-AI outputs are not treated as evidence sources or authorship contributions. **Before submission, the authors must confirm that all code, citations, quantitative values, figures, and manuscript claims have been checked against the frozen repository evidence and original sources.**

## Statements and Declarations

### Ethical considerations

Not applicable. The study used publicly available software/model code and computational evidence and did not involve human participants, human data, human tissue, animals, or personally identifiable information.

### Consent to participate

Not applicable.

### Consent for publication

Not applicable.

### Declaration of conflicting interest

**Author completion required before submission.** If no conflict exists, use: “The author(s) declared no potential conflicts of interest with respect to the research, authorship, and/or publication of this article.”

### Funding statement

**Author completion required before submission.** Insert all relevant funder names and grant/award numbers, or the journal-prescribed no-funding statement.

### Data and code availability

The research code, machine-readable evidence profiles, frozen evidence reports, figure masters, and evidence artifacts are maintained in the public DTEP repository (`https://github.com/qiangruhuang/DTEP`). The v2.5 experimental revision is maintained on branch `v2.5-experimental-freeze`. `research/CLAIM_EVIDENCE_MATRIX_v2_5.md`, `tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_3.md`, the experiment-specific frozen reports, and GitHub Actions artifact `v25-fmi-bl-env-experimental-freeze-evidence` identify the evidence supporting the revised claims. The external submission version should be tagged and archived after author review to provide an immutable citation target.

## Figure captions

**Figure 1. Capability-based heterogeneous-model organization over native, adapted, and standards-based execution paths.** The frozen upper trial addresses a capability/contract/semantic boundary. OpenEaagles and RadarSimPublic retain distinct implementation identities and bindings in the primary tracking experiments, while FMI-01 demonstrates an FMI 3 Co-Simulation execution path under a separate bounded micro-demonstration. TMSU carries T&E capability/evidence context and does not replace execution middleware or interchange standards.

**Figure 2. Machine-readable FMI metadata and the T&E-specific governance increment.** FMI-01 resolves canonical height and vertical-velocity variables from `modelDescription.xml` and executes them through FMI 3 Co-Simulation. Program capability identity, domain/reference-frame semantics, intended use, qualification state, and typed evidence/provenance dependencies are supplied by the TMSU/T&E sidecar. The figure separates standard model/execution metadata from T&E governance without implying broad second-capability validation.

**Figure 3. Three-arm baseline ablation of direct coupling, a competent plain façade, and SAL/TMSU.** All three arms produce byte-identical canonical outputs in 16/16 matched cases. Direct coupling retains nine executable concrete-model references in the shared upper core; both the plain façade and SAL/TMSU reduce this count to zero. The five tested T&E governance controls are present only in SAL/TMSU, locating the incremental contribution beyond generic software isolation.

**Figure 4. Cumulative evidence with typed selective staleness.** Evidence history remains append-only while current applicability changes with typed configuration dependencies. ENV-01 illustrates an `EXECUTION_ENVIRONMENT` dependency hit: source execution evidence becomes stale after the runtime revision, unaffected semantic evidence remains active, and delta repeat/equivalence evidence restores only the affected current execution/conformance claim.

**Figure 5. Tested carry-forward envelope and stopping rule.** VU-01b permits selective carry-forward after a provenance-only revision and an evidence-type-aware comparator; ENV-01 permits bounded restoration after an execution-runtime revision; LC-01 rejects automatic implementation-specific inheritance after a CV→CA algorithm and `Implementation_ID` change. Successful execution or an unchanged external contract therefore does not determine qualification inheritance.

## Main tables

### Table 1. Capability, implementation, and current evidence identity

| Trial-facing capability | Implementation | Implementation_ID / execution identity | Migration/change class | Evidence anchors | Current bounded state |
|---|---|---|---|---|---|
| `sensor.tws.track` | OpenEaagles TWS + AirTrkMgr | `openeaagles.tws.airtrkmgr@b3d7e74` | M1 Wrap | BP-01, MS-01 | Behavior-preserved within BP envelope; architecturally substitutable within MS-01 |
| `sensor.tws.track` | RadarSimPublic radar + CV KF | `radarsimpublic.radar-kf@8b63f82` | M2 Adapt | MS/SP/EQ/BL/EA/VU | Kinematic research use `QUALIFIED_WITHIN_EVIDENCE`; RF-performance use `UNKNOWN` |
| `sensor.tws.track` | RadarSimPublic radar + CA KF | `radarsimpublic.radar-ca-kf@8b63f82` | `MODEL_ALGORITHM` + `Implementation_ID` change | LC-01 | Architecture `PASS_FRESH_EXECUTION`; kinematic fitness `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`; RF `UNKNOWN` |
| `platform.motion.vertical_state` | Reference-FMUs v0.0.40 BouncingBall | FMI 3.0 FMU; fmusim runtime recorded separately | M3 Native micro-demonstration | FMI-01, ENV-01 | Execution/conformance mechanism demonstrated; no motion-model fitness claim |

### Table 2. Frozen experiment chain and inference boundaries

| Experiment | Decision | Quantitative anchor | Supported inference | Explicit boundary |
|---|---|---|---|---|
| BP-01 | PASS | 16/16 exact; negative control rejected | wrapper transparency in frozen deterministic observation envelope | no universal/hidden-state equivalence |
| MS-01 | PASS | 16/16 + 16/16; upper-trial edits 0 | bounded architectural/contract substitution | no equal fidelity or universal plug-and-play |
| FMI-01 | PASS | FMI 3.0 Co-Simulation; 101 rows; M3 criteria 4/4 | standards-based execution and metadata-to-TMSU mapping mechanism | no model-fidelity or broad second-capability validation |
| SP-01 | PASS | 5/5 semantic mismatches rejected; RF `UNKNOWN` | structural conformance separable from semantic qualification | no automatic semantic inference |
| EQ-01 | PASS | 4/4 preregistered decisions | qualification depends on intended use and evidence | not accreditation |
| BL-01 | PASS | 16/16 three-arm byte identity; upper-core refs 9/0/0 | competent façade provides isolation; TMSU adds tested T&E governance | LOC is not time/cost; no universal façade comparison |
| EA-01 | PASS | append-only history retained under change replay | provenance-monotonic history with selective applicability | no enterprise-scale repository claim |
| VU-01a | **FAIL** | exact identity 8/16 | strict byte rule unsuitable for tested cross-run numerical evidence | not universal numerical reproducibility claim |
| VU-01b | PASS | normalized 16/16; `+1e-6 m` control rejected | selective carry-forward for tested provenance revision | not universal delta-requalification rule |
| ENV-01 | PASS | 10+10 internally byte-stable repeats; cross-runtime max difference 0; control rejected | environment dependency causes staleness; typed delta evidence can restore affected execution claim | one deterministic FMI runtime transition only |
| LC-01 | PASS (stop-rule test) | CV 16/16; CA 16/16; 12/16 equal; maneuver max differences 109.0755 m and 67.6108 m/s | substantive algorithm/identity change crosses automatic inheritance boundary | discrimination control, not operational validation |

### Table 3. Lifecycle change–evidence action matrix

| Change class | Default evidence consequence | Required action | Empirical anchor |
|---|---|---|---|
| documentation/display metadata | evidence remains applicable when dependencies exclude display metadata | reuse | EA-01 |
| adapter/binding provenance only | affected current path may require renewed applicability evidence | typed delta reassessment | VU-01a/b |
| execution environment | affected execution evidence becomes stale when dependency intersects | repeat/reproducibility or claim-appropriate equivalence evidence before carry-forward | ENV-01 |
| semantic mapping | semantic and dependent use claims affected | semantic reassessment; preserve unresolved states | SP/EQ/EA |
| model algorithm / `Implementation_ID` | implementation-specific evidence stale for new configuration | reject automatic inheritance; obtain fresh affected evidence | LC-01 |
| upper-trial specification | trial-specific evidence affected | reassess dependent trial/use claims | EA-01 dependency replay |
| capability contract | broad dependency intersection | broad affected-claim reassessment | EA-01 dependency replay |

## References

1. Hargrove H, Conley T, Allendorf E, et al. A modernized enterprise Army modeling and simulation concept. Report RRA3261-1, RAND Corporation, 2025.
2. Office of the Under Secretary of Defense for Research and Engineering. Modular open systems approach, https://www.cto.mil/sea/mosa/ (accessed 6 September 2026).
3. Office of the Under Secretary of Defense for Research and Engineering. Implementing a modular open systems approach in DoD programs. Guidebook, 27 February 2025, https://www.cto.mil/wp-content/uploads/2025/03/MOSA-Implementation-Guidebook-27Feb2025-Cleared.pdf (accessed 6 September 2026).
4. MIL-STD-3022. Documentation of verification, validation, and accreditation (VV&A) for models and simulations. 28 January 2008, as amended.
5. Department of Defense. DoD Manual 5000.102: Modeling and simulation verification, validation, and accreditation for operational test and evaluation and live fire test and evaluation. 9 December 2024.
6. Tolk A, Diallo SY, Padilla JJ, et al. Reference modelling in support of M&S—foundations and applications. J Simul 2013; 7: 69–82. DOI: 10.1057/jos.2013.3.
7. Winton JR, Colombi JM, Jacques DR, et al. Validation of digital system models: a framework and SysML profile for model-based systems engineering. INCOSE Int Symp 2023; 33: 569–583. DOI: 10.1002/iis2.13039.
8. Hill JH. Transforming modeling and simulation verification, validation & accreditation with a model-based and standards-based framework. In: Vertical Flight Society 81st Annual Forum and Technology Display, 2025. DOI: 10.4050/F-0081-2025-0104.
9. Fonseca i Casas P. A continuous process for validation, verification, and accreditation of simulation models. Mathematics 2023; 11: 845. DOI: 10.3390/math11040845.
10. Noguchi RA. Standards gaps for enabling model interoperability for MBSE in a digital engineering context. INCOSE Int Symp 2025; 35: 427–443. DOI: 10.1002/iis2.70030.
11. Owen KR and Chakrabortty RK. Verification, validation, and accreditation for models and simulations in the Australian defence context: a review. J Def Model Simul 2024; 21: 205–227. DOI: 10.1177/15485129221134632.
12. Eichenseer F, Heinkel H-M, Benedikt M, et al. Modeling & Simulation SPICE: assessing the capability of credible simulation processes. INCOSE Int Symp 2023; 33: 399–415. DOI: 10.1002/iis2.13029.
13. Erdemir A, Mulugeta L, Ku JP, et al. Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective. J Transl Med 2020; 18: 369. DOI: 10.1186/s12967-020-02540-4.
14. Zschaler S, Mustafee N, Harper A, et al. On simulation reuse in healthcare applications. Simulation 2026; 102: 149–165. DOI: 10.1177/00375497251383912.

## Repository-hosted supporting evidence

`research/CLAIM_EVIDENCE_MATRIX_v2_5.md`, `research/FIGURE_BLUEPRINT_v2_5.md`, `research/ENV01_EXECUTION_ENVIRONMENT_EVIDENCE_v1.md`, `tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_3.md`, and the experiment-specific frozen reports provide the claim-level reproducibility anchors for this revision. The main manuscript does not require acceptance of a separate supplemental file.
