# Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction, Cumulative Evidence, and Bounded Qualification Inheritance

**Submission-ready Markdown v1.0 — WP1 evidence locked**

## Abstract

Modernizing heterogeneous modeling and simulation (M&S) environments for acquisition and test and evaluation (T&E) requires more than placing legacy and alternative models behind common interfaces. It requires both a stable method for organizing heterogeneous implementations and a defensible rule for what happens to qualification evidence when those implementations evolve. We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned **Test Model Service Unit (TMSU)**, defined as a logical capability/conformance package rather than a new simulation runtime. TMSU separates a stable trial-facing `Capability_ID` from concrete `Implementation_ID` values and associates each implementation with a capability contract, semantic profile, executable binding, provenance and evidence records. Using a real legacy OpenEaagles track-while-scan radar capability and an independent public RadarSimPublic radar/tracking implementation, we evaluated four linked questions. First, an OpenEaagles wrapper preserved declared observable behavior in 16/16 frozen cases, and OpenEaagles and RadarSimPublic each executed 16/16 cases behind the same frozen upper trial with no upper-trial edits for model substitution. Second, a semantic precheck rejected 5/5 structurally valid injected mismatches while retaining a real unresolved RF concept as `UNKNOWN`; the same RadarSimPublic implementation was consequently `QUALIFIED_WITHIN_EVIDENCE` for a bounded kinematic research use but remained `UNKNOWN` for an RF-performance use. Third, evidence records accumulated without deleting history while current applicability changed selectively; a paired integration benchmark showed zero upper-core churn for the TMSU route versus 160 changed upper-core lines for direct point-to-point integration, while the TMSU boundary itself contained more physical lines and therefore did not support a lower-total-code claim. Fourth, a strict byte-level cross-run carry-forward rule failed on repeated numerical execution (8/16 exact traces), whereas an evidence-type-aware numerical rule supported one controlled provenance-only revision (16/16 normalized equivalence plus a sensitivity control). Changing the selected RadarSimPublic tracker from a constant-velocity to a constant-acceleration Kalman filter then changed `Implementation_ID`, crossed the tested carry-forward boundary and prevented automatic inheritance of implementation-specific qualification even though both configurations executed all 16 legacy cases. These results support two linked conclusions for digital T&E: heterogeneous model implementations can be unified behind a stable capability boundary without forcing internal code convergence, but test-grade unification must also govern evidence lifecycle. **Evidence history can be provenance-monotonic while current qualification remains configuration-, intended-use- and evidence-dependent.**

**Keywords:** modeling and simulation; digital test and evaluation; heterogeneous model unification; model interoperability; verification validation and accreditation; evidence reuse; model lifecycle; modular open systems; legacy modernization

## 1. Introduction

Modeling and simulation are embedded throughout defense acquisition, experimentation and T&E, yet many useful capabilities remain tied to long-lived software environments in which model logic, local data structures, semantic assumptions and application-specific integration have evolved together. Enterprise modernization efforts therefore emphasize modularity, reusable data, open interfaces and incremental migration. RAND's enterprise Army M&S modernization concept identifies aging infrastructure, model/data silos and limited capture, curation and reuse of M&S-generated information as persistent modernization problems [1]. DoD Modular Open Systems Approach (MOSA) guidance similarly emphasizes modular, loosely coupled systems, open key interfaces, verifiable conformance and the ability to add, modify or replace components across the lifecycle [2,3].

For digital T&E, however, modernization creates two coupled problems. The first is architectural: **can heterogeneous model implementations be organized behind a stable trial-facing boundary so that one implementation can replace another without rewriting upper trial logic?** The second is evidentiary: **when a model implementation is replaced or evolves, what happens to the evidence that justified its use for a particular test purpose?**

The distinction matters because interface compatibility is not model validity. Two implementations may satisfy the same schema while representing different physical quantities, algorithms or assumptions. A small adapter revision may leave model behavior unchanged, whereas a model-algorithm change may alter behavior even when the capability contract is unchanged. A numerical model may produce last-bit cross-run differences that are irrelevant to the scientific claim being assessed. Conversely, a model may continue to pass a familiar regression envelope after an internal algorithm changes materially. A lifecycle policy that resets all evidence after every change discards accumulated knowledge; a policy that inherits all prior evidence whenever interfaces remain compatible creates the opposite risk—unjustified trust.

Existing verification, validation and accreditation (VV&A) policy already treats intended use, version control, assumptions, limitations, uncertainty and evidence documentation as central. MIL-STD-3022 provides common structures for documenting V&V and accreditation products and supports information sharing across VV&A activities [4]. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, model version, capabilities, assumptions, limitations, uncertainty and validation response variables [5]. Reference-modeling, digital-model validation and continuous-VV&A research likewise emphasizes explicit use cases, model credibility and lifecycle processes [6–9]. Work on interoperability and model reuse emphasizes standards, composability and reusable model components [10,14].

The unresolved implementation-level problem is therefore not whether reuse or evidence matters, but how **heterogeneous-model organization and evidence applicability should evolve together**. We address this through a SAL-aligned **Test Model Service Unit (TMSU)**. TMSU is not another simulation bus, broker or replacement for HLA, DIS or FMI. It is a logical packaging and conformance unit that stabilizes the trial-facing capability boundary while allowing concrete implementations to remain heterogeneous internally.

The central identity relation is:

```text
Capability_ID != Implementation_ID
```

A capability identifies what the trial requests; an implementation identifies what software/model instance actually produced the evidence. Around this distinction, TMSU binds contract, semantics, executable binding, provenance and evidence.

This paper makes two linked contributions. First, it proposes and empirically instantiates a method for **heterogeneous model unification** that preserves implementation heterogeneity while stabilizing upper trial logic. Second, it extends that unification into an **evidence lifecycle** that records when historical evidence remains applicable, when it becomes stale, when delta evidence can restore a claim and when automatic inheritance must be refused.

We address four research questions:

**RQ1 — Heterogeneous model unification.** Can a stable capability boundary preserve a real legacy implementation and support a genuinely heterogeneous alternative without rewriting upper trial logic?

**RQ2 — Qualification layers.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3 — Cumulative evidence.** Can historical evidence accumulate without deletion while current applicability changes selectively as model configurations evolve?

**RQ4 — Bounded inheritance.** Can the lifecycle distinguish changes that permit selective evidence carry-forward from substantive implementation changes that require fresh affected qualification?

Figure 1 summarizes the TMSU capability boundary and the relationship between stable trial intent and heterogeneous implementation identity.

## 2. Related work and study positioning

### 2.1 Modular modernization, model reuse and interoperability

MOSA and enterprise M&S modernization establish the architectural motivation for replaceable modular components [1–3]. Tolk et al. connect requirements capture, conceptual modeling, V&V and composable model development [6]. Noguchi identifies standards gaps that limit broader interoperability and reuse of models developed in local contexts [10]. Recent reuse research distinguishes reusable conceptual models, open/reproducible assets and black-box or distributed component reuse [14].

These streams motivate model modularity and reuse but do not by themselves determine whether qualification evidence from one implementation remains applicable after the implementation changes. The present work therefore treats model unification as necessary but insufficient for test-grade reuse.

### 2.2 Credibility, intended use and lifecycle VV&A

Winton et al. emphasize validation use cases that capture both why a digital model is used and what evidence supports that use [7]. Hill describes model-based and standards-based VV&A artifacts in a digital-engineering ecosystem [8]. Fonseca i Casas frames VV&A as a continuous process across a model lifecycle [9]. Owen and Chakrabortty review defense VV&A practice and emphasize executable comparison evidence [11]. M&S SPICE relates required credibility to the criticality of the simulation task [12]. Cross-domain credible-practice guidance also converges on context definition, version control, documentation, comparison of implementations and conformance to standards [13].

The present study does not replace these credibility or accreditation frameworks. It operationalizes a narrower configuration-management question: **after a concrete heterogeneous-model change, which existing evidence is still applicable?**

### 2.3 Specific gap addressed

The study integrates two concerns that are often treated separately:

```text
heterogeneous model unification
        +
qualification-evidence lifecycle
```

The key separation is:

```text
component/model replaceability != qualification-evidence inheritance
```

The paper therefore focuses on a bounded empirical chain: preserve a real legacy capability, substitute a genuinely heterogeneous implementation, prevent structural compatibility from being overinterpreted as semantic or use fitness, accumulate evidence without deleting history, permit selective carry-forward for one controlled revision, and reject carry-forward after a substantive algorithm/implementation-identity change.

## 3. Methods

### 3.1 TMSU as a heterogeneous-model unification method

The frozen logical formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the components denote the capability/contract package, service/execution contract, semantic profile, evidence bundle, test profile and provenance package defined in the research protocol. The formulation is logical rather than deployment-specific; a TMSU need not correspond to one process, one container or one transport.

All WP1 experiments used the common trial-facing identity:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values. OpenEaagles and RadarSimPublic therefore shared a stable capability contract while remaining distinct codebases and model implementations.

### 3.2 Evidence model and lifecycle states

An evidence record is represented conceptually as:

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

Current qualification is conditional:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE,
     UNKNOWN,
     NOT_QUALIFIED}
```

where `I` is implementation, `U` intended use, `C` current configuration and `E_t` the accumulated evidence available at time `t`.

Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

For a configuration change `Delta(C)`, evidence remains directly active only when its declared dependencies do not intersect the change:

```text
Dep(E) ∩ Delta(C) = ∅
```

Otherwise the record remains historically retained but becomes stale for the changed configuration unless justified new evidence restores the affected claim. `UNKNOWN` is treated as evidence insufficiency rather than implicit compatibility or invalidity.

### 3.3 RQ1 experiments: behavior preservation and heterogeneous substitution

BP-01 used the public OpenEaagles TWS radar plus AirTrkMgr capability at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A deterministic native probe observed track count, track identity, range, range rate, relative azimuth, elevation, quality and average RF signal. A TMSU M1 wrapper executed the same native probe without transforming the evidence trace.

The frozen matrix was a full 2×2×2×2 design over target range (10 or 20 km), azimuth (0° or 20°), RCS (1 or 4 m²) and motion (static or closing at 150 m/s), yielding 16 cases. Preservation required successful execution and exact direct-versus-wrapper trace identity. A deliberately altered trace served as a comparator negative control.

MS-01 then introduced the independent public `Murmur-ops/RadarSimPublic` implementation at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. The adapter invoked upstream radar/SNR, Kalman filtering and track-quality components without modifying upstream source. The upper trial, orchestrator, capability contract and semantic-profile identifier were frozen. Model substitution changed only implementation binding selection. MS-01 evaluated architectural/contract substitutability, not numerical equivalence or model fidelity.

### 3.4 RQ2 experiments: semantic and intended-use qualification

SP-01 compared structural validation alone with structural validation plus semantic precheck. Five structurally valid negative cases changed range unit, azimuth unit, range-rate sign convention, reference frame or time basis. A positive control preserved all declarations. A real ambiguity control retained RadarSimPublic `Radar.snr(range, rcs)` mapped to canonical `average_signal_db`, because available evidence did not establish equivalence between the RF SNR concept and the OpenEaagles track-average-signal concept.

Semantic decisions were `COMPATIBLE`, `INCOMPATIBLE` or `UNKNOWN`.

EQ-01 then evaluated four intended-use cases. A bounded kinematic research/conformance use required range, range rate and relative azimuth within the executed 10–20 km E2 evidence envelope. An RF-performance use additionally required the unresolved RF quantity and comparative validity evidence. A 50 km use lay outside the executed domain. A fourth case included an explicit range-unit conflict.

EQ-01 was a machine-assisted evidence screen, not authoritative accreditation.

### 3.5 RQ3 experiments: change isolation and cumulative evidence

EB-01 compared the TMSU binding route with a controlled point-to-point integration of the same RadarSimPublic implementation. Both arms executed the same 16 cases and were required to produce identical canonical outputs. We measured upper-orchestrator changes, direct concrete-model dependencies and reassessment propagation for a controlled semantic-mapping update. Total lines of code were not treated as a proxy for engineer time.

EA-01 registered BP-01 through EB-01 in a machine-readable, closed, acyclic evidence graph without modifying their frozen reports. Sequential replay tested append-only evidence accumulation, current-decision reconstruction, persistence of `UNKNOWN` and selective staleness under controlled metadata, semantic, adapter, upper-trial and contract changes.

### 3.6 RQ4 experiments: positive carry-forward and stop rule

VU-01 introduced a real adapter/binding provenance revision while keeping the RadarSimPublic upstream model commit, `Implementation_ID`, upper trial, capability contract and semantic mapping unchanged.

VU-01a initially required exact cross-run SHA identity for floating-point traces. A later full branch-head rerun failed this rule in 8/16 cases due to machine-precision-scale representation differences. The failure was retained.

VU-01b then used an evidence-type-aware criterion: exact discrete record structure plus normalization of floating fields to nine decimal places. A `+1e-6 m` perturbation of one range value served as a sensitivity control that the comparator had to reject. The normalization criterion was a numerical-representation rule for evidence carry-forward, not a radar-validity tolerance.

LC-01 deliberately crossed the provenance-only VU envelope by changing the selected RadarSimPublic tracking algorithm from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter. `Implementation_ID` changed while the repository commit, upper trial, capability contract and declared semantic mapping remained unchanged. Both configurations executed the old 16-case envelope. A separate accelerating-target challenge—20 km initial range, 20° azimuth, 150 m/s initial closing speed and 15 m/s² closing acceleration—was used only to verify that the algorithm selections were behaviorally discriminable outside the original envelope.

The lifecycle decision was specified independently of old-envelope similarity: a substantive `MODEL_ALGORITHM` or implementation-identity change must not automatically inherit prior implementation-specific intended-use qualification.

## 4. Results

### 4.1 RQ1 — A stable capability boundary supported a real legacy implementation and a real heterogeneous alternative

BP-01 passed all 16 frozen cases. Direct OpenEaagles execution and TMSU-wrapped execution were byte-identical in every case, all cases produced behavior-bearing tracks, all 16 scenario traces were distinct, and the deliberately modified negative-control trace was rejected.

MS-01 then passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic. The frozen trial specification, orchestrator and capability contract were unchanged; model substitution was isolated to binding selection. Cross-implementation canonical traces differed in all 16 matched scenarios, as expected for distinct implementations.

RQ1 therefore receives a bounded positive answer: one real legacy implementation and one independent heterogeneous implementation were organized behind a stable trial-facing capability boundary without rewriting upper trial logic. The result establishes architectural/contract-level unification, not equal behavior or fidelity.

### 4.2 RQ2 — Successful substitution did not establish semantic compatibility or intended-use fitness

All seven SP-01 cases passed structural validation. Semantic evaluation rejected all five injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RadarSimPublic RF relation. Thus:

```text
structural PASS != semantic COMPATIBLE
```

EQ-01 then produced all four preregistered decisions. The bounded kinematic research/conformance use was `QUALIFIED_WITHIN_EVIDENCE`; the RF-performance use remained `UNKNOWN`; the 50 km use outside the executed evidence domain remained `UNKNOWN`; and the explicit unit conflict was `NOT_QUALIFIED`.

Therefore:

```text
model substitutability
!= semantic compatibility
!= intended-use fitness
```

The real RF `UNKNOWN` is important because it shows that a structurally successful integration can remain evidentially unresolved rather than being forced into a binary pass/fail state.

### 4.3 RQ3 — Evidence could accumulate while applicability remained selective

In EB-01, both TMSU and direct integration arms passed 16/16 cases with byte-identical canonical outputs. The TMSU route changed zero upper-orchestrator lines and introduced zero direct RadarSimPublic references in the shared core; the direct route changed 160 upper-core lines and introduced nine direct model references. The isolated TMSU boundary itself contained 224 physical lines, so the experiment does not support a lower-total-LOC claim. For the controlled semantic-mapping update, 1/4 declared reassessment scopes were affected under TMSU versus 3/4 under direct integration.

The supported engineering benefit is therefore change locality and a smaller declared reassessment radius, not measured reduction in coding time or total implementation size.

EA-01 accumulated the frozen evidence set from one to five records without deleting prior evidence. Six final decision queries were reconstructed from explicit provenance. Controlled changes retained all historical records while selectively changing current applicability. The RF semantic `UNKNOWN` introduced by SP-01 persisted through subsequent positive evidence.

The lifecycle result is:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

Figure 3 shows the distinction between append-only history and configuration-dependent current qualification.

### 4.4 RQ4 — Evidence inheritance required both a positive rule and a stop rule

VU-01a's exact cross-run byte criterion failed on repeated numerical execution: only 8/16 traces retained exact SHA identity. Artifact comparison showed only machine-precision-scale differences in the tested moving-target floating fields. The failure was retained as a methodological result rather than reclassified as model failure.

VU-01b then applied the evidence-type-aware rule. All 16 historical/current traces matched after the frozen numerical normalization, and the `+1e-6 m` negative-control perturbation was correctly rejected. BP-01 and SP-01 were reused without re-execution; affected architectural and intended-use claims were restored with delta evidence; the unrelated RF `UNKNOWN` remained unresolved.

LC-01 then changed the selected tracking algorithm and `Implementation_ID`. Both CV and CA configurations executed all 16 old cases, but only 12/16 were equal at the frozen normalized behavior criterion and 4/16 differed. The accelerating-target sensitivity challenge materially separated the algorithms: the maximum absolute CV–CA range difference was 109.0755 m and the maximum absolute range-rate difference was 67.6108 m/s. These values demonstrate discrimination under the constructed challenge only; they do not establish operational superiority of the CA filter.

Automatic implementation-specific qualification inheritance was therefore rejected. Unaffected BP-01 and SP-01 evidence remained active. CV-specific MS/EQ/EB/VU evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was re-established as `PASS_FRESH_EXECUTION`, while CA kinematic intended-use fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`. The RF semantic and RF-performance states also remained `UNKNOWN`.

RQ4 therefore receives a bounded positive answer: the evidence lifecycle supported selective carry-forward for a controlled provenance-only revision but enforced a stop rule when a substantive algorithm/implementation-identity change crossed the tested evidence boundary.

Figure 4 presents these two lifecycle cases side by side.

## 5. Discussion

### 5.1 Heterogeneous model unification is a capability-boundary problem, not a code-convergence problem

The first contribution of this study is the TMSU unification method itself. The experiments do not suggest that OpenEaagles and RadarSimPublic should be refactored into one codebase or forced onto a common internal architecture. Instead, the trial-facing capability, contract and declared semantics are stabilized while implementation identity, executable binding and provenance remain explicit.

This interpretation is consistent with modular-open-system principles but narrower in scope. TMSU is not another runtime middleware layer and does not replace HLA, DIS, FMI or other exchange mechanisms. It is a test-facing packaging/conformance construct for organizing heterogeneous model capabilities and the evidence attached to them.

MS-01 is therefore an architectural result: two real heterogeneous implementations can satisfy the same trial-facing contract without upper-trial rewriting. It does not imply equal fidelity or automatic interchangeability for all test purposes.

### 5.2 Test-grade unification requires layered qualification

SP-01 and EQ-01 show why architectural substitution cannot be the final gate. Structural validity, semantic compatibility, executable behavior, intended-use fitness and authoritative accreditation are distinct layers. A useful hierarchy is:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

TMSU organizes evidence for the lower and intermediate layers. It does not issue authoritative accreditation.

The persistent RF `UNKNOWN` is particularly informative. The mapping is structurally legal and the model executes, yet available evidence does not establish physical concept equivalence for the RF quantity. The correct state is therefore neither automatic compatibility nor demonstrated invalidity. `UNKNOWN` records evidence insufficiency.

### 5.3 Historical evidence should accumulate, but current qualification should not be inherited monotonically

EA-01 demonstrates the distinction between historical retention and present applicability. Deleting old evidence after every change destroys auditability; carrying all old evidence forward destroys validity. A long-lived digital-T&E environment requires both properties:

```text
historical retention != current applicability
current applicability != intended-use qualification
```

The append-only evidence history is valuable precisely because later changes do not overwrite prior decisions. A reviewer can reconstruct what was known for each configuration, why a claim became stale and what evidence restored or failed to restore it.

This reframes reuse. The objective is not simply maximizing the amount of inherited evidence. It is maximizing **justified reuse while preserving refusal when evidence dependencies no longer hold**.

### 5.4 Evidence criteria themselves must match the numerical and execution properties of the claim

VU-01a is a useful negative result. Exact byte identity had worked in the frozen OpenEaagles wrapper experiment because that environment and observation path supported that criterion. Reusing the same criterion across separate numerical executions of RadarSimPublic proved brittle. The failure of 8/16 exact hashes did not by itself establish meaningful model change.

VU-01b corrected the evidence rule rather than weakening it indiscriminately. Discrete identities remained exact; floating fields used a preregistered normalized representation; and a deliberate perturbation had to be rejected. The lesson is not that numerical tolerance should always replace exact comparison. It is that the evidence comparator must be appropriate to the claim and must itself be tested for sensitivity.

### 5.5 Evidence inheritance needs a positive rule and a stop rule

VU-01b and LC-01 form the central paired lifecycle result. A controlled provenance-only revision, with model identity, semantics and trial contract unchanged, could restore affected current claims using typed delta evidence. A substantive tracking-algorithm and `Implementation_ID` change crossed that envelope.

The LC-01 result is important because both algorithms still executed all 16 old cases and most normalized traces were equal in the legacy envelope. A policy based only on interface compatibility or regression survival would therefore risk inheriting prior qualification too easily. The separate maneuver challenge demonstrated that the algorithms were genuinely behaviorally distinguishable under changed dynamics.

The appropriate response was not to delete every historical artifact. BP-01 and SP-01 remained active because their declared dependencies were unaffected. Prior CV-specific evidence remained available historically but stale for the CA configuration. Fresh affected evidence was required before intended-use fitness could be re-established.

This yields the core lifecycle principle:

> Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are restored by evidence-type-appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the qualification boundary.

### 5.6 The demonstrated engineering value is manageability, not less code or measured time

EB-01 deliberately prevents an efficiency-overclaim. The TMSU boundary contained more physical lines than the direct upper-core churn benchmark. Engineer-hours and calendar time were not measured. The evidence supports a different value proposition: model-specific change was isolated outside shared upper trial logic, and a subsequent semantic change affected a smaller declared reassessment radius.

For T&E, this is consequential because modifying a model creates both an implementation task and an evidence-admissibility task. The present study addresses the latter directly. A model portfolio becomes more manageable when changes can be localized not only in code but also in the evidence graph.

## 6. Limitations

The study evaluates one primary capability class, two public heterogeneous codebases and one algorithm variant within RadarSimPublic. The scenario envelopes are deliberately small. The work does not establish enterprise-wide interchangeability, universal contract optimality, automatic ontology inference, equal model fidelity, authoritative accreditation, organization-wide time/cost savings or enterprise-scale evidence-store performance.

The RadarSimPublic RF relation remains `UNKNOWN`; the study does not resolve physical equivalence between its SNR quantity and the canonical track-average-signal concept. The LC-01 maneuver challenge was constructed to discriminate CV and CA tracking behavior, not to validate either implementation against operational data. CA kinematic intended-use fitness therefore remains unresolved pending fresh evidence.

The evidence dependency graph is a research profile rather than a universal taxonomy. Other capability classes and stochastic simulations will require evidence criteria appropriate to their execution and uncertainty properties. The current results demonstrate one bounded method and one bounded inheritance rule, not a universal automated VV&A system.

## 7. Conclusion

This study proposes and empirically evaluates a method for heterogeneous simulation-model unification in digital T&E and extends it into a configuration-aware evidence lifecycle. A stable TMSU capability boundary preserved a real legacy model, supported an independent heterogeneous implementation without upper-trial rewriting, prevented structural compatibility from being conflated with semantic or intended-use qualification, and maintained explicit provenance for accumulated evidence.

The lifecycle experiments then showed why unification alone is insufficient. Historical evidence can accumulate without deletion, but current qualification must remain conditional on model identity, intended use, configuration and applicable evidence. A controlled provenance revision supported selective carry-forward when assessed with an evidence-type-appropriate comparator; a substantive model-algorithm and implementation-identity change crossed the carry-forward boundary and correctly prevented automatic inheritance of implementation-specific qualification.

The resulting digital-T&E principle is:

> **Unify heterogeneous model capabilities at a stable trial-facing boundary, but manage qualification evidence as a versioned, dependency-aware lifecycle asset. Evidence should accumulate historically; current qualification should be inherited only when its evidence dependencies remain valid.**

## Figure captions

**Figure 1. TMSU heterogeneous-model unification.** A stable trial-facing capability, contract and semantic profile are separated from concrete implementation identities. OpenEaagles and RadarSimPublic remain internally heterogeneous; substitution changes implementation binding rather than upper trial logic.

**Figure 2. Evidence ladder and durable uncertainty.** BP-01 through LC-01 progressively constrain stronger interpretations. The RF `UNKNOWN` persists across later positive results, demonstrating that unrelated evidence does not silently resolve an evidentiary gap.

**Figure 3. Cumulative evidence and non-monotonic qualification.** Evidence history is append-only across lifecycle configurations, while current applicability and qualification are recomputed after changes. Historical evidence remains visible even when stale for the current configuration.

**Figure 4. Positive carry-forward rule versus stop rule.** VU-01b supports selective carry-forward for a controlled provenance-only revision after a typed comparator passes; LC-01 rejects automatic inheritance after a model-algorithm and `Implementation_ID` change despite survival of the old execution envelope.

## Main tables

See `research/MAIN_TABLES_v1_0.md` for Tables 1–3.

## References

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Modular Open Systems Approach*. Systems Engineering and Architecture guidance.
3. Office of the Under Secretary of Defense for Research and Engineering. *Implementing a Modular Open Systems Approach in DoD Programs*. 27 February 2025.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 9 December 2024.
6. Tolk A, Diallo SY, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7(2):69–82. doi:10.1057/jos.2013.3.
7. Winton JR, Colombi JM, Jacques DR, Johnson KE. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33(1):569–583. doi:10.1002/iis2.13039.
8. Hill JH. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Vertical Flight Society 81st Annual Forum and Technology Display*. 2025. doi:10.4050/F-0081-2025-0104.
9. Fonseca i Casas P. A Continuous Process for Validation, Verification, and Accreditation of Simulation Models. *Mathematics*. 2023;11(4):845. doi:10.3390/math11040845.
10. Noguchi RA. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025;35. doi:10.1002/iis2.70030.
11. Owen KR, Chakrabortty RK. Verification, validation, and accreditation for models and simulations in the Australian defence context: a review. *The Journal of Defense Modeling and Simulation*. 2024;21(2):205–227. doi:10.1177/15485129221134632.
12. Eichenseer F, Heinkel H-M, Benedikt M, Ahmann M, Holzner M, Stadler C. Modeling & Simulation SPICE: Assessing the Capability of Credible Simulation Processes. *INCOSE International Symposium*. 2023;33(1):399–415. doi:10.1002/iis2.13029.
13. Erdemir A, Mulugeta L, Ku JP, Drach A, Horner M, Morrison TM, Peng GCY, Vadigepalli R, Lytton WW, Myers JG Jr. Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective. *Journal of Translational Medicine*. 2020;18(1):369. doi:10.1186/s12967-020-02540-4.
14. Zschaler S, Mustafee N, Harper A, Monks T, Onggo BS, Currie CSM, Polack FAC. On simulation reuse in healthcare applications. *Simulation*. 2026;102(2):149–165. doi:10.1177/00375497251383912.

## Frozen internal evidence sources

- `mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md`
- `mre2/model_substitution/E2_MODEL_SUBSTITUTION_REAL_EVIDENCE_v2.md`
- `research/SP01_SEMANTIC_PRECHECK_EVIDENCE_v1.md`
- `research/EQ01_EVIDENCE_AWARE_QUALIFICATION_EVIDENCE_v1.md`
- `research/EB01_ENGINEERING_BURDEN_EVIDENCE_v1.md`
- `research/EA01_EVIDENCE_ACCUMULATION_EVIDENCE_v1.md`
- `research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md`
- `research/LC01_ALGORITHM_CHANGE_CARRY_FORWARD_BOUNDARY_EVIDENCE_v1.md`
- `research/CLAIM_EVIDENCE_MATRIX_v1_2.md`
- `research/METHOD_RESULT_CLAIM_AUDIT_v1_0.md`
- `tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json`
- `tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_2.md`
