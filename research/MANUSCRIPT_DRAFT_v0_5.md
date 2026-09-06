# Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction, Cumulative Evidence, and Bounded Qualification Inheritance

**Manuscript draft v0.5 — dual-contribution production draft; WP1 evidence locked**

## Abstract

Modernizing heterogeneous modeling and simulation (M&S) environments for acquisition and test and evaluation (T&E) requires two capabilities that are often treated separately: the ability to organize and substitute heterogeneous model implementations behind stable trial-facing interfaces, and the ability to manage what happens to qualification evidence when those implementations evolve. We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned **Test Model Service Unit (TMSU)**, defined as a logical capability/conformance package rather than a new simulation runtime. TMSU separates stable `Capability_ID` from concrete `Implementation_ID` and associates each implementation with a capability contract, semantic profile, executable binding, provenance and evidence records. Using a real legacy OpenEaagles track-while-scan radar capability and an independent public RadarSimPublic radar/tracking implementation, we evaluated a frozen evidence chain. The OpenEaagles wrapper preserved declared observable behavior in 16/16 cases. OpenEaagles and RadarSimPublic each executed 16/16 cases behind the same frozen upper trial with no upper-trial edits for model substitution, establishing bounded heterogeneous-model unification at the architectural/contract level. A semantic precheck then rejected 5/5 structurally valid injected mismatches while preserving a real unresolved RF concept as `UNKNOWN`; the same RadarSimPublic implementation was consequently `QUALIFIED_WITHIN_EVIDENCE` for a bounded kinematic research use but remained `UNKNOWN` for an RF-performance use. Evidence records accumulated without deleting history while current applicability changed selectively. A strict byte-level cross-run carry-forward rule failed on repeated numerical execution (8/16 exact traces), whereas an evidence-type-aware numerical rule supported one controlled provenance-only revision (16/16 normalized equivalence plus a sensitivity control). Finally, changing the selected RadarSimPublic tracker from a constant-velocity to a constant-acceleration Kalman filter changed `Implementation_ID`, crossed the tested carry-forward boundary and prevented automatic inheritance of implementation-specific qualification even though both configurations executed all 16 legacy cases. These results support two linked conclusions for digital T&E: heterogeneous model implementations can be organized behind a stable capability boundary without forcing code convergence, but test-grade unification must also govern evidence lifecycle. **Evidence history can be provenance-monotonic while current qualification remains configuration-, intended-use- and evidence-dependent.**

**Keywords:** modeling and simulation; digital test and evaluation; heterogeneous model unification; model interoperability; VV&A; evidence reuse; model lifecycle; modular open systems; legacy modernization

## 1. Introduction

Modeling and simulation are embedded throughout defense acquisition, experimentation and T&E, yet useful capabilities frequently remain tied to long-lived software environments in which model logic, local data structures, semantic assumptions and integration code have evolved together. Enterprise modernization initiatives have therefore emphasized modularity, open interfaces, reusable data and incremental migration. RAND's enterprise Army M&S modernization concept describes aging infrastructure, model/data silos and limited capture, curation and reuse of information across acquisition activities [1]. DoD Modular Open Systems Approach (MOSA) guidance likewise emphasizes modular, loosely coupled systems, open key interfaces, verifiable conformance and the ability to add, modify or replace components over the lifecycle [2,3].

For digital T&E, however, modernization creates two coupled problems rather than one. The first is architectural: **can heterogeneous model implementations be organized behind a stable trial-facing boundary so that one implementation may replace another without rewriting upper trial logic?** The second is evidentiary: **when an implementation is replaced or evolves, what happens to the evidence that justified its use for a particular test purpose?**

The distinction matters because interface compatibility is not model validity. Two models may satisfy the same schema while representing different physical quantities, algorithms or assumptions. A small adapter revision may leave model behavior intact, whereas a model-algorithm change may alter behavior even if the capability contract is unchanged. A numerical model may also exhibit last-bit cross-run differences that are irrelevant to the scientific claim being assessed. A lifecycle policy that resets all evidence after every change discards accumulated knowledge. A policy that inherits all prior evidence whenever interfaces remain compatible creates the opposite risk: unjustified trust.

Existing VV&A policy already treats intended use, version control, assumptions, limitations, uncertainty and evidence documentation as central. MIL-STD-3022 provides common structures for documenting verification, validation and accreditation products and supports information sharing across VV&A activities [4]. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, model version, capabilities, assumptions, limitations, uncertainty and validation response variables [5]. Research on reference modelling, digital-model validation and continuous VV&A similarly emphasizes explicit use cases, model credibility and lifecycle processes [6–9]. Work on interoperability and model reuse emphasizes standards, composability and reusable model components [10,14].

The unresolved implementation-level problem is therefore not whether reuse or evidence matters, but how **heterogeneous-model organization and evidence applicability should evolve together**. We address this through a SAL-aligned **Test Model Service Unit (TMSU)**. TMSU is not another simulation bus, broker or replacement for HLA, DIS or FMI. It is a logical packaging and conformance unit that stabilizes the trial-facing capability boundary while allowing concrete implementations to remain heterogeneous internally.

The central identity relation is:

```text
Capability_ID != Implementation_ID
```

A capability identifies what the trial requests; an implementation identifies what software/model instance actually produced the evidence. Around this distinction, TMSU binds contract, semantics, executable binding, provenance and evidence.

This paper therefore makes two linked contributions. First, it proposes and empirically instantiates a method for **heterogeneous model unification** that preserves model heterogeneity while stabilizing upper trial logic. Second, it extends that unification into an **evidence lifecycle** that records when historical evidence remains applicable, when it becomes stale, when delta evidence can restore a claim and when automatic inheritance must be refused.

We address four research questions:

**RQ1. Heterogeneous model unification.** Can a stable capability boundary preserve a real legacy implementation and support a genuinely heterogeneous alternative without rewriting upper trial logic?

**RQ2. Qualification layers.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3. Cumulative evidence.** Can historical evidence accumulate without deletion while current applicability changes selectively as model configurations evolve?

**RQ4. Bounded inheritance.** Can the lifecycle distinguish changes that permit selective evidence carry-forward from substantive implementation changes that require fresh affected qualification?

## 2. Related work and study positioning

### 2.1 Modular modernization and model reuse

MOSA and enterprise M&S modernization establish the architectural motivation for replaceable, modular components [1–3]. Tolk et al. connect requirements capture, conceptual modelling, V&V and composable model development [6]. Noguchi identifies standards gaps that limit broader interoperability and reuse of models developed in local contexts [10]. Zschaler et al. distinguish reusable conceptual models, open/reproducible assets and black-box or distributed component reuse [14].

These streams motivate model modularity and reuse but do not by themselves determine whether qualification evidence from one implementation remains applicable after the implementation changes.

### 2.2 Credibility, intended use and lifecycle VV&A

Winton et al. emphasize validation use cases that capture both why a digital model is used and what evidence supports that use [7]. Hill describes model-based and standards-based VV&A artifacts in a digital-engineering ecosystem [8]. Fonseca i Casas frames VV&A as a continuous process across a model lifecycle [9]. Owen and Chakrabortty review defense VV&A practice and emphasize executable comparison evidence [11]. M&S SPICE relates required credibility to the criticality of the simulation task [12]. Cross-domain credible-practice guidance also converges on context definition, version control, documentation, comparison of implementations and conformance to standards [13].

The present work does not replace these credibility or accreditation frameworks. It operationalizes a narrower, executable configuration-management question: **after a concrete heterogeneous model change, which existing evidence is still applicable?**

### 2.3 Specific gap addressed

The paper integrates two usually separated concerns:

```text
heterogeneous model unification
        +
qualification-evidence lifecycle
```

The key distinction is:

```text
component/model replaceability != qualification-evidence inheritance
```

## 3. Methods

### 3.1 TMSU as a heterogeneous-model unification method

The frozen logical formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the components represent the capability/contract, service/execution contract, semantic profile, evidence bundle, test profile and provenance package defined in the research protocol. The formulation is logical rather than deployment-specific; a TMSU need not correspond to one container, process or transport.

All WP1 experiments used the common trial-facing identity:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values.

### 3.2 Evidence record and lifecycle states

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

Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

For configuration change `Delta(C)`, evidence remains directly active only when its declared dependencies do not intersect the change:

```text
Dep(E) ∩ Delta(C) = ∅
```

Otherwise the record remains historically retained but becomes stale for the changed configuration unless justified new evidence restores the affected claim.

### 3.3 RQ1 experiments: preservation and heterogeneous substitution

BP-01 used the public OpenEaagles TWS radar plus AirTrkMgr capability at frozen commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A deterministic native probe observed track count, track identity, range, range rate, relative azimuth, elevation, quality and RF signal. A TMSU M1 wrapper executed the same native probe without transforming the evidence trace.

The frozen matrix was 2×2×2×2 over range (10/20 km), azimuth (0°/20°), RCS (1/4 m²) and motion (static/closing 150 m/s), yielding 16 cases. Preservation required successful execution and exact direct-versus-wrapper trace identity, with a deliberately altered trace as a negative control.

MS-01 added the independent public `Murmur-ops/RadarSimPublic` implementation at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. The adapter invoked upstream radar/SNR, Kalman filtering and track-quality components without modifying upstream source. The upper trial, orchestrator, capability contract and semantic-profile identifier were frozen. Model substitution changed only the implementation binding.

### 3.4 RQ2 experiments: semantic and intended-use qualification

SP-01 compared structural validation alone with structural validation plus semantic precheck. Five structurally valid negative cases changed range unit, azimuth unit, range-rate sign convention, reference frame or time basis. A positive control preserved the declarations. A real ambiguity control retained RadarSimPublic `Radar.snr(range, rcs)` mapped to canonical `average_signal_db`, because available evidence did not establish equivalence between the RF SNR concept and the OpenEaagles track-average-signal concept.

EQ-01 then evaluated four intended-use cases: a bounded kinematic research/conformance use, an RF-performance use, a 50 km use outside the executed domain and a use with an explicit range-unit conflict.

### 3.5 RQ3 experiments: change isolation and cumulative evidence

EB-01 compared the TMSU binding route with a controlled point-to-point integration of the same RadarSimPublic implementation. Both arms executed the same 16 cases and were required to produce identical canonical outputs. We measured shared upper-orchestrator change, direct model dependencies and reassessment propagation for a semantic-mapping update.

EA-01 registered BP-01 through EB-01 in a machine-readable evidence graph and replayed evidence accumulation and controlled configuration changes. Historical retention and current applicability were tracked separately.

### 3.6 RQ4 experiments: positive carry-forward and stop rule

VU-01 introduced a real adapter/binding provenance revision while keeping the RadarSimPublic model commit, `Implementation_ID`, upper trial, capability contract and semantic mapping unchanged. VU-01a initially required exact cross-run SHA identity for floating traces. After this failed on a full branch-head rerun, VU-01b used exact discrete record structure plus nine-decimal normalization of floating fields and added a +1e-6 m negative-control perturbation.

LC-01 deliberately crossed that provenance-only envelope by changing the selected RadarSimPublic tracking algorithm from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter. `Implementation_ID` changed while the upstream repository commit, upper trial, capability contract and declared semantic mapping remained unchanged. Both configurations executed the old 16-case envelope. A separate accelerating-target challenge was used only to verify that the algorithm selections were behaviorally discriminable.

## 4. Results

### 4.1 RQ1 — TMSU provided a stable boundary for a real legacy model and a real heterogeneous alternative

BP-01 passed all 16 frozen cases. Direct OpenEaagles execution and the TMSU-wrapped execution were byte-identical in every case, all cases produced behavior-bearing tracks, all 16 scenario traces were distinct and the negative-control mutation was rejected.

MS-01 then passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic. The frozen trial specification, orchestrator and capability contract were unchanged; substitution was isolated to binding selection. Cross-implementation traces differed in all 16 matched cases, which is expected because MS-01 tested architectural/contract substitutability rather than model equivalence.

RQ1 therefore receives a bounded positive answer: one real legacy implementation and one independent heterogeneous implementation were organized behind a stable trial-facing capability boundary without rewriting upper trial logic.

### 4.2 RQ2 — Successful substitution did not establish semantic compatibility or intended-use fitness

All seven SP-01 cases passed structural validation. Semantic evaluation rejected all five injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RadarSimPublic RF relation.

Thus:

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

### 4.3 RQ3 — Evidence could accumulate while applicability remained selective

In EB-01, both TMSU and direct integration arms passed 16/16 cases with byte-identical canonical outputs. The TMSU path changed zero upper-orchestrator lines and introduced zero direct RadarSimPublic references in the shared core; the direct path changed 160 upper-core lines and introduced nine direct model references. The TMSU boundary itself contained 224 physical lines, so the experiment does not support a lower-total-LOC claim. For the controlled semantic-mapping update, 1/4 declared reassessment scopes were affected under TMSU versus 3/4 under the direct integration.

EA-01 accumulated the frozen evidence set from one to five records without deleting prior evidence. Controlled changes retained all historical records while selectively changing applicability. The RF semantic `UNKNOWN` introduced by SP-01 persisted through subsequent positive evidence.

The lifecycle result is:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

### 4.4 RQ4 — Evidence inheritance required both a positive rule and a stop rule

VU-01a's exact cross-run byte criterion failed on repeated numerical execution: only 8/16 traces retained exact SHA identity. The observed differences were at machine-precision scale. This result was preserved as a methodological failure rather than discarded.

VU-01b then applied an evidence-type-aware rule: exact discrete record structure plus nine-decimal normalization of floating fields. All 16 historical/current traces matched under the frozen criterion, and the +1e-6 m negative-control perturbation was correctly rejected. This supported selective carry-forward for the tested provenance-only revision while leaving the unrelated RF `UNKNOWN` unresolved.

LC-01 changed the selected tracking algorithm and `Implementation_ID`. Both CV and CA configurations executed all 16 old cases, but only 12/16 were equal at the frozen normalized behavior criterion. The accelerating-target sensitivity challenge materially separated the algorithms, with maximum CV–CA differences of 109.0755 m in range and 67.6108 m/s in range rate. These values demonstrate algorithm discrimination in the constructed challenge; they do not establish operational superiority of CA.

Automatic implementation-specific qualification inheritance was therefore rejected. Unaffected BP-01 and SP-01 evidence remained active. CV-specific evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was re-established as `PASS_FRESH_EXECUTION`, while CA kinematic intended-use fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`.

RQ4 therefore receives a bounded positive answer: the lifecycle distinguished a controlled change for which typed delta evidence was sufficient from a substantive implementation change for which automatic qualification inheritance was not permitted.

## 5. Discussion

### 5.1 Heterogeneous model unification is a first-class contribution

The study does not propose convergence of model internals into one codebase. Instead, TMSU stabilizes what the trial sees while allowing implementations to remain heterogeneous. BP-01 and MS-01 show that this is not merely an architecture diagram: a real legacy OpenEaagles capability was preserved behind a wrapper boundary, and an independent RadarSimPublic implementation was substituted without changing upper trial logic.

This form of unification is deliberately narrower than enterprise platform replacement. It is a capability/conformance method that can coexist with existing simulation transports and runtimes. The important abstraction is that the trial depends on `Capability_ID`, contract and semantic declarations, while evidence remains attached to the concrete `Implementation_ID` that generated it.

### 5.2 Successful unification creates an evidence-governance obligation

Once substitution becomes easy, the risk of unjustified evidence inheritance becomes more important rather than less. MS-01 alone could be misread as a plug-and-play result. SP-01 and EQ-01 show why that interpretation is unsafe: structural conformance neither proves semantic equivalence nor intended-use fitness.

The persistent RF `UNKNOWN` is therefore a substantive result. It shows that a conservative system should be able to express evidence insufficiency without collapsing it into either PASS or FAIL.

### 5.3 The relevant digital-T&E asset is not only the model but the model–evidence relationship

EA-01 demonstrates that historical evidence and current qualification must be managed as different objects. Evidence should not disappear when it becomes stale, because that destroys provenance and auditability. Yet historical existence does not imply current applicability.

This leads to the central lifecycle principle:

```text
historical retention != current applicability
current applicability != intended-use qualification
```

VU-01a/b adds another distinction:

```text
numerical equivalence != byte identity
```

LC-01 adds:

```text
contract compatibility != qualification inheritance
```

### 5.4 Bounded inheritance requires both permission and refusal

The paired VU/LC result is central. VU-01b demonstrates that a small, controlled provenance-only change can support selective carry-forward when model identity, semantics and intended behavior remain stable and the evidence comparator is appropriate to the numerical claim. LC-01 demonstrates that unchanged interface declarations and successful legacy regression execution are insufficient after a substantive algorithm/implementation change.

The correct lifecycle rule is therefore not “revalidate everything” and not “reuse everything.” It is:

```text
change
-> identify affected evidence dependencies
-> retain historical evidence
-> reuse unaffected evidence
-> mark affected evidence stale
-> apply typed delta evidence where justified
-> require fresh affected qualification when the change crosses the inheritance boundary
```

### 5.5 The engineering value is governability, not less code

EB-01 deliberately weakens a simplistic efficiency narrative. TMSU did not contain fewer total lines than the direct benchmark, and engineer-hours were not measured. The supported benefit is change locality: upper trial logic remains stable, model-specific knowledge is isolated, and the evidence graph makes reassessment propagation explicit.

For T&E, this is important because every model change is simultaneously a software change and an evidence-admissibility event.

### 5.6 Relationship to VV&A and accreditation

TMSU does not issue accreditation decisions. It structures the evidence and configuration relationships that a later trial-specific VV&A/accreditation process can use. The distinction between registration conformance, trial-specific qualification and authoritative accreditation must therefore remain explicit.

## 6. Limitations

The study evaluates one principal capability class, two public heterogeneous implementations and one algorithm variant within RadarSimPublic. The scenario envelopes are intentionally small. The results do not establish enterprise-wide interoperability, equal physical fidelity between OpenEaagles and RadarSimPublic, automatic ontology inference, operational radar validity, organization-wide cost savings or enterprise-scale evidence-store performance.

The LC-01 maneuver challenge was designed to discriminate two tracker configurations, not to validate either against operational data. The RadarSimPublic RF mapping remains `UNKNOWN` because the study does not establish equivalence between the relevant physical concepts.

The evidence dependency model is a research profile, not a universal taxonomy. Stochastic models will require preregistered seeded or distributional evidence criteria rather than deterministic trace comparison.

## 7. Conclusion

This study begins with a practical heterogeneous-model problem and ends with a digital-T&E evidence problem. A SAL-aligned TMSU provided a stable capability/conformance boundary through which a real legacy OpenEaagles capability could be preserved and an independent RadarSimPublic implementation substituted without rewriting upper trial logic. That result establishes heterogeneous-model unification as a viable bounded mechanism.

However, model unification is not sufficient for test-grade reuse. Structural compatibility did not ensure semantic compatibility, the same implementation received different qualification decisions for different intended uses, and historical evidence remained auditable while its current applicability changed. A controlled provenance-only revision could be carried forward using evidence-type-appropriate delta evidence, whereas a substantive algorithm/`Implementation_ID` change crossed the tested inheritance boundary and correctly prevented automatic transfer of prior implementation-specific qualification.

The combined principle is:

> **Unify heterogeneous model capabilities at a stable trial-facing boundary, but manage qualification evidence as a versioned, dependency-aware lifecycle asset. Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are restored by appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the qualification boundary.**

For digital T&E, the modernization target is therefore not simply reusable simulation code. It is a manageable relationship among capability identity, implementation identity, semantics, intended use, configuration change and accumulated evidence.

## Working references

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, OUSD(R&E). *Modular Open Systems Approach*.
3. OUSD(R&E). *Implementing a Modular Open Systems Approach in DoD Programs*. 27 Feb 2025.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 9 Dec 2024.
6. Tolk A, Diallo SY, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7(2):69–82. doi:10.1057/jos.2013.3.
7. Winton JR, Colombi JM, Jacques DR, Johnson KE. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33(1):569–583. doi:10.1002/iis2.13039.
8. Hill JH. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Vertical Flight Society 81st Annual Forum and Technology Display*. 2025. doi:10.4050/F-0081-2025-0104.
9. Fonseca i Casas P. A Continuous Process for Validation, Verification, and Accreditation of Simulation Models. *Mathematics*. 2023;11(4):845. doi:10.3390/math11040845.
10. Noguchi RA. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025. doi:10.1002/iis2.70030.
11. Owen KR, Chakrabortty RK. Verification, validation, and accreditation for models and simulations in the Australian defence context: a review. *The Journal of Defense Modeling and Simulation*. 2024;21(2):205–227. doi:10.1177/15485129221134632.
12. Eichenseer F, Heinkel H-M, Benedikt M, Ahmann M, Holzner M, Stadler C. Modeling & Simulation SPICE: Assessing the Capability of Credible Simulation Processes. *INCOSE International Symposium*. 2023;33(1):399–415. doi:10.1002/iis2.13029.
13. Erdemir A, Mulugeta L, Ku JP, et al. Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective. *Journal of Translational Medicine*. 2020;18:369. doi:10.1186/s12967-020-02540-4.
14. Zschaler S, Mustafee N, Harper A, et al. On simulation reuse in healthcare applications. *Simulation*. 2026;102(2):149–165. doi:10.1177/00375497251383912.

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
