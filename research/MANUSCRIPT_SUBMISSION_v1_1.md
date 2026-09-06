# Unifying Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance

**Submission candidate v1.1 — WP1 evidence locked**

## Abstract

**Purpose:** Digital test and evaluation (T&E) requires both heterogeneous-model substitution and defensible management of qualification evidence as models evolve. We evaluate a Simulation Abstraction Layer (SAL)-aligned Test Model Service Unit (TMSU) that separates stable trial-facing capability identity from concrete model implementation identity.

**Methods:** Using OpenEaagles TWS/AirTrkMgr and an independent RadarSimPublic radar/tracking implementation, we tested behavior preservation, binding-only substitution, semantic precheck, intended-use qualification, cumulative evidence, controlled version carry-forward, and an algorithm-change stop rule.

**Results:** OpenEaagles wrapper behavior was preserved in 16/16 cases; OpenEaagles and RadarSimPublic each executed 16/16 cases behind one frozen upper trial without trial edits. Semantic precheck rejected 5/5 injected mismatches and retained a real RF relation as `UNKNOWN`. Evidence accumulated without deleting history. A strict byte-level carry-forward rule failed (8/16 exact traces), whereas a typed numerical rule supported a controlled provenance revision (16/16 normalized equivalence). Changing the tracker from constant-velocity to constant-acceleration prevented automatic inheritance of implementation-specific qualification despite both configurations executing all legacy cases.

**Conclusions:** TMSU provides bounded heterogeneous-model unification, but test-grade unification also requires versioned, dependency-aware evidence lifecycle management. Historical evidence may accumulate monotonically while current qualification remains conditional.

**Keywords:** modeling and simulation; digital test and evaluation; heterogeneous model unification; model interoperability; verification validation and accreditation; evidence reuse; model lifecycle; modular open systems

## 1. Introduction

Long-lived modeling and simulation (M&S) environments often bind useful model logic to implementation-specific data structures, semantic assumptions and local integration code. Enterprise modernization therefore emphasizes modularity, open interfaces and incremental migration. RAND's enterprise Army M&S concept identifies aging infrastructure, model/data silos and limited capture, curation and reuse of M&S-generated information as persistent modernization problems [1]. DoD Modular Open Systems Approach (MOSA) guidance similarly emphasizes modular, loosely coupled systems, verifiable conformance and lifecycle component replacement [2,3].

For digital T&E, modernization creates two coupled problems. The first is architectural: **can heterogeneous model implementations be organized behind a stable trial-facing boundary so that one implementation can replace another without rewriting upper trial logic?** The second is evidentiary: **when an implementation changes, which evidence supporting its use remains applicable?**

These questions cannot be collapsed. Interface compatibility is not model validity. Two implementations may satisfy one schema while representing different physical quantities, assumptions or algorithms. A small adapter revision may leave behavior unchanged; a model-algorithm change may be substantive even when the external contract survives. A numerical model may also exhibit last-bit cross-run differences without a meaningful behavioral change. Resetting all evidence after every change discards reusable knowledge, whereas inheriting all prior evidence whenever interfaces remain compatible creates unjustified trust.

Existing VV&A guidance already treats intended use, model version, assumptions, limitations, uncertainty and evidence documentation as central [4,5]. Reference-modeling and digital-engineering research likewise links model reuse to conceptual boundaries, validation use cases and lifecycle credibility [6–9]. Interoperability and simulation-reuse research emphasizes standards, composability and reusable components [10,14]. The narrower problem addressed here is how **heterogeneous-model organization and evidence applicability should evolve together**.

We address this through a SAL-aligned **Test Model Service Unit (TMSU)**. TMSU is a logical packaging/conformance unit rather than a simulation runtime, broker or replacement for HLA, DIS or FMI. Its central identity rule is:

```text
Capability_ID != Implementation_ID
```

A capability identifies what the trial requests; an implementation identifies what software/model instance generated evidence. TMSU associates capability contract, semantic declarations, executable binding, provenance and evidence with that boundary.

The paper makes two linked contributions. First, it proposes and empirically instantiates a method for **heterogeneous model unification** that preserves implementation heterogeneity while stabilizing upper trial logic. Second, it extends that organization into a **configuration-aware evidence lifecycle** that distinguishes historical retention, current applicability, delta reassessment and refusal of automatic inheritance.

We ask four questions:

**RQ1 — Heterogeneous model unification.** Can a stable capability boundary preserve a real legacy implementation and support a genuinely heterogeneous alternative without rewriting upper trial logic?

**RQ2 — Qualification layers.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3 — Cumulative evidence.** Can evidence history accumulate while current applicability changes selectively as configurations evolve?

**RQ4 — Bounded inheritance.** Can the lifecycle distinguish changes that permit selective carry-forward from substantive implementation changes that require fresh affected qualification?

## 2. Related work and study positioning

### 2.1 Modular modernization and reuse

MOSA and enterprise M&S modernization motivate replaceable modular components [1–3]. Tolk et al. connect requirements capture, conceptual modeling, V&V and composable M&S development [6]. Noguchi identifies standards gaps that limit broader interoperability of models developed in local contexts [10]. Recent simulation-reuse work distinguishes conceptual, open/reproducible and black-box/component reuse [14]. These streams motivate modularity and reuse but do not determine whether qualification evidence from one configuration remains applicable after the implementation changes.

### 2.2 Credibility and lifecycle VV&A

Winton et al. emphasize validation use cases connecting intended purpose and evidence [7]. Hill describes model-based and standards-based VV&A artifacts in digital-engineering ecosystems [8]. Fonseca i Casas frames VV&A as a continuous lifecycle process [9]. Owen and Chakrabortty review defense VV&A practice and emphasize executable comparison evidence [11], while M&S SPICE relates required credibility to task criticality [12]. Cross-domain credible-practice guidance similarly emphasizes context, version control, documentation, competing implementations and standards [13].

The present work does not replace these frameworks or issue accreditation. It operationalizes a narrower question at the executable model boundary:

```text
model replaceability != qualification-evidence inheritance
```

## 3. Methods

### 3.1 TMSU capability and evidence model

The frozen logical formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the elements denote the capability/contract package, service/execution contract, semantic profile, evidence bundle, test profile and provenance package defined in the research protocol. All experiments used:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values.

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

Evidence history is append-only:

```text
E_(t+1) = E_t ∪ DeltaE
```

For configuration change `Delta(C)`, existing evidence remains directly active when:

```text
Dep(E) ∩ Delta(C) = ∅
```

Otherwise it is retained historically but becomes stale for the changed configuration until appropriate affected evidence is supplied. `QUALIFIED_WITHIN_EVIDENCE` denotes support for the declared bounded research use only; it is not authoritative accreditation.

### 3.2 RQ1 — Behavior preservation and heterogeneous substitution

BP-01 used OpenEaagles TWS radar plus AirTrkMgr at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A native probe recorded track count, identity, range, range rate, relative azimuth, elevation, quality and RF signal. A TMSU M1 wrapper executed the same native probe without transforming its evidence trace.

The frozen full-factorial envelope contained 16 combinations of range (10/20 km), azimuth (0°/20°), RCS (1/4 m²) and motion (static/closing 150 m/s). Preservation required successful execution and exact direct-versus-wrapper trace identity; a deliberately altered trace served as a comparator negative control.

MS-01 introduced the independent public `Murmur-ops/RadarSimPublic` implementation at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. Its adapter invoked upstream radar/SNR, Kalman-filter and track-quality components without upstream source changes. Upper trial, orchestrator and capability contract were frozen. Substitution changed implementation binding only. MS-01 tested architectural/contract substitutability, not equal behavior or fidelity.

### 3.3 RQ2 — Semantic and intended-use qualification

SP-01 compared structural validation with structural plus semantic precheck across concept, datatype, unit, reference frame, time basis and sign convention. Five structurally valid negative cases changed range unit, azimuth unit, range-rate sign, reference frame or time basis; a positive control preserved all declarations. A real ambiguity control retained RadarSimPublic `Radar.snr(range, rcs)` mapped to canonical `average_signal_db`, because available evidence did not establish equivalence between SNR and the canonical track-average-signal concept. Semantic decisions were `COMPATIBLE`, `INCOMPATIBLE` or `UNKNOWN`.

EQ-01 then evaluated four use cases: a bounded kinematic research/conformance use; an RF-performance use requiring the unresolved RF concept and comparative validity evidence; a 50 km use outside the executed evidence domain; and an explicit range-unit conflict.

### 3.4 RQ3 — Change isolation and cumulative evidence

EB-01 compared the TMSU binding route with a controlled direct point-to-point integration of the same RadarSimPublic implementation. Both arms executed the same 16 cases and had to produce identical canonical outputs before change-surface comparison. We measured upper-orchestrator modifications, direct concrete-model dependencies and declared reassessment propagation for a semantic-mapping update. Total source lines were not treated as engineer time.

EA-01 registered BP-01 through EB-01 in a machine-readable acyclic evidence graph. Sequential replay tested append-only accumulation, current-decision reconstruction, persistence of `UNKNOWN` and selective staleness under controlled configuration changes.

### 3.5 RQ4 — Positive carry-forward and stopping rule

VU-01 changed adapter/binding provenance while keeping the RadarSimPublic model commit, `Implementation_ID`, upper trial, contract and semantic mapping unchanged. VU-01a initially required exact cross-run SHA identity for floating-point traces. A later full rerun failed this rule in 8/16 cases because of machine-precision-scale representation differences. The failure was retained.

VU-01b corrected the evidence comparator: discrete record structure remained exact, while floating fields were normalized to nine decimal places for cross-run representation comparison. A `+1e-6 m` range perturbation served as a sensitivity control that had to be rejected. This normalization is an evidence-representation rule, not a radar-validity tolerance.

LC-01 then changed the selected RadarSimPublic tracker from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter. `Implementation_ID` changed while repository commit, upper trial, contract and semantic mapping remained frozen. Both configurations executed the old 16-case envelope. A separate accelerating-target challenge (20 km, 20°, initial closing speed 150 m/s, closing acceleration 15 m/s²) tested only whether the algorithm selections were behaviorally distinguishable. The carry-forward decision was based on change class and evidence dependencies, not on old-envelope similarity alone.

## 4. Results

### 4.1 RQ1 — Stable capability boundary enabled bounded heterogeneous-model unification

BP-01 passed all 16 frozen cases. Direct and wrapped OpenEaagles traces were byte-identical; all cases produced behavior-bearing tracks; the 16 baseline traces were distinct; and the negative control was rejected.

MS-01 then passed 16/16 cases for OpenEaagles and 16/16 for RadarSimPublic behind the same frozen upper trial. The trial specification, orchestrator and capability contract were unchanged, and substitution was isolated to binding selection. Cross-implementation canonical traces differed in all 16 matched cases, consistent with distinct implementations.

Thus RQ1 receives a bounded positive answer: a real legacy implementation and an independent heterogeneous implementation were organized behind a stable trial-facing capability boundary without upper-trial rewriting. The result is architectural/contract-level unification, not model equivalence.

### 4.2 RQ2 — Substitution did not establish semantic compatibility or fitness

All seven SP-01 cases passed structural validation. Semantic evaluation rejected all five injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RadarSimPublic RF relation.

```text
structural PASS != semantic COMPATIBLE
```

EQ-01 produced all four preregistered decisions: the bounded kinematic research use was `QUALIFIED_WITHIN_EVIDENCE`; the RF-performance use was `UNKNOWN`; the 50 km use was `UNKNOWN`; and the explicit unit conflict was `NOT_QUALIFIED`.

```text
model substitutability
!= semantic compatibility
!= intended-use fitness
```

The RF `UNKNOWN` is not a failed integration. It records a specific evidence gap that later unrelated PASS results are not permitted to overwrite.

### 4.3 RQ3 — Evidence accumulated while applicability remained selective

Both EB-01 arms passed 16/16 cases with byte-identical paired outputs. The TMSU route changed zero upper-orchestrator lines and introduced zero direct RadarSimPublic references in the shared core; the direct route changed 160 upper-core lines and introduced nine direct model references. The TMSU boundary itself contained 224 physical lines, so lower total code was not supported. For the controlled semantic-mapping update, 1/4 declared reassessment scopes were affected under TMSU versus 3/4 under direct integration.

EA-01 accumulated the frozen evidence set from one to five records without deleting prior evidence. Controlled changes retained all historical records while selectively changing current applicability. The RF semantic `UNKNOWN` persisted through subsequent positive evidence.

The lifecycle distinction is therefore:

```text
Evidence history is provenance-monotonic.
Current qualification is not monotonic.
```

### 4.4 RQ4 — Inheritance required both a positive rule and a stop rule

VU-01a's exact cross-run byte criterion failed: only 8/16 traces retained exact SHA identity. VU-01b then matched 16/16 historical/current traces under the corrected representation rule and rejected the `+1e-6 m` negative control. This supported selective carry-forward for the tested provenance-only revision while leaving the unrelated RF `UNKNOWN` unresolved.

LC-01 changed tracker algorithm and `Implementation_ID`. CV and CA both executed all 16 old cases; 12/16 were equal at the frozen normalized criterion and four differed. The constructed maneuver challenge further separated the algorithms, with maximum absolute CV–CA differences of 109.0755 m in range and 67.6108 m/s in range rate. These are discrimination controls, not operational validation or evidence of general CA superiority.

Automatic implementation-specific qualification inheritance was rejected. Unaffected BP-01 and SP-01 evidence remained active. Prior CV-specific MS/EQ/EB/VU evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was established as `PASS_FRESH_EXECUTION`, while CA kinematic intended-use fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`; the RF states also remained `UNKNOWN`.

RQ4 therefore receives a bounded positive answer: the lifecycle permitted carry-forward for one controlled provenance revision and enforced a stop rule for a substantive algorithm/implementation-identity change.

## 5. Discussion

### 5.1 Heterogeneous-model unification is a capability-boundary problem

The first contribution is the TMSU unification method. The experiments do not imply that OpenEaagles and RadarSimPublic should converge internally. Instead, a stable trial-facing capability and contract coexist with explicit implementation identity, binding, semantics, provenance and evidence. MS-01 therefore establishes bounded architectural substitution without claiming equal model fidelity.

This distinction is important for modernization of strongly coupled legacy software: the integration boundary can be standardized while validated or otherwise valuable internal model logic remains intact. TMSU is consequently complementary to, rather than a replacement for, existing runtime and exchange mechanisms.

### 5.2 Test-grade unification requires layered qualification

SP-01 and EQ-01 show why successful substitution cannot be the final gate. Structural conformance, semantic qualification, execution evidence, intended-use fitness and authoritative accreditation are distinct layers:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

The persistent RF `UNKNOWN` demonstrates the value of a non-binary state. The mapping is structurally legal and executable, but current evidence does not establish the physical concept relation needed for the RF-performance use. The system therefore preserves insufficiency instead of converting absence of contradiction into trust.

### 5.3 Cumulative evidence requires selective staleness

EA-01 separates historical retention from present applicability. Deleting old evidence after a change destroys auditability; applying all old evidence to a changed configuration destroys validity. A long-lived digital-T&E environment needs both append-only provenance and configuration-aware applicability.

EB-01 shows the corresponding engineering property. The demonstrated benefit is not fewer lines or measured time; it is **change locality**. Model-specific integration is isolated from shared upper-trial logic, and evidence dependencies make the reassessment radius explicit.

### 5.4 Bounded inheritance needs a permissive rule and a refusal rule

VU-01b and LC-01 form the central paired lifecycle result. The VU revision preserved model identity and semantics, so a tested evidence-type-aware delta comparator could restore affected current claims. The LC change altered the selected model algorithm and `Implementation_ID`; prior implementation-specific qualification therefore could not be inherited merely because the external contract and legacy execution set remained usable.

LC-01 is especially informative because both configurations survived the old 16-case set and most normalized traces matched. Regression survival alone would therefore be an unsafe inheritance rule. At the same time, the correct response was not total evidence reset: unchanged evidence remained active, changed implementation-specific evidence became stale, and fresh affected evidence was required.

The resulting principle is:

> **Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are restored by evidence-type-appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the qualification boundary.**

## 6. Limitations

The study evaluates one primary capability class, two public heterogeneous codebases and one algorithm change within RadarSimPublic. Scenario envelopes are deliberately small. The work does not establish universal plug-and-play interchangeability, equal model fidelity, universal contract optimality, automatic semantic inference, authoritative accreditation, organization-wide time/cost savings or enterprise-scale evidence-store performance.

The RadarSimPublic RF relation remains `UNKNOWN`. The LC-01 maneuver challenge was constructed to distinguish CV and CA behavior, not to validate either against operational data; CA intended-use fitness therefore remains unresolved. The evidence dependency graph is a research profile rather than a universal M&S change taxonomy. Other capability classes and stochastic simulations require claim-appropriate evidence criteria.

## 7. Conclusion

This study proposes and empirically evaluates a method for heterogeneous simulation-model unification in digital T&E and extends it into a configuration-aware evidence lifecycle. A stable TMSU capability boundary preserved a real legacy implementation, supported an independent heterogeneous implementation without upper-trial rewriting, and prevented architectural substitution from being conflated with semantic or intended-use qualification.

The lifecycle results show why unification alone is insufficient. Historical evidence can accumulate without deletion, but current qualification must remain conditional on implementation identity, intended use, configuration and applicable evidence. A controlled provenance revision supported selective carry-forward; a substantive model-algorithm and implementation-identity change crossed the carry-forward boundary and required fresh affected qualification.

> **Unify heterogeneous model capabilities at a stable trial-facing boundary, but manage qualification evidence as a versioned, dependency-aware lifecycle asset.**

## Statements and Declarations

### Ethical considerations

Not applicable. The study used publicly available software/model code and computational evidence and did not involve human participants, human data, human tissue, animals or personally identifiable information.

### Consent to participate

Not applicable.

### Consent for publication

Not applicable.

### Declaration of conflicting interest

**Author completion required before submission.** All authors must confirm the final declaration. If no conflict exists, use the journal-prescribed no-conflict statement.

### Funding statement

**Author completion required before submission.** Insert all relevant funder names and award numbers, or the journal-prescribed no-funding statement.

### Data and code availability

The research code, machine-readable evidence profiles, frozen evidence reports, figure masters and evidence manifest are maintained in the public DTEP repository (`https://github.com/qiangruhuang/DTEP`). The submission candidate is based on branch `lc01-algorithm-change-boundary`; `tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json` and the experiment-specific frozen reports identify the evidence used for each claim. Before external submission, the authors should archive or tag the final submission commit to provide an immutable citation target.

## Figure captions

**Figure 1. TMSU heterogeneous-model unification.** The upper trial addresses a stable capability/contract boundary while OpenEaagles and RadarSimPublic retain distinct implementation identities, bindings and provenance. BP-01 and MS-01 provide bounded empirical evidence for behavior-preserving wrapping and binding-only heterogeneous substitution.

**Figure 2. Evidence ladder and durable uncertainty.** Successive experiments constrain stronger interpretations, while the unresolved RF relation remains `UNKNOWN` through later positive results. The retained VU-01a failure shows that the evidence comparator itself required correction.

**Figure 3. Cumulative evidence with configuration-dependent qualification.** Evidence history grows append-only across the baseline, provenance revision and algorithm change, while current applicability and intended-use qualification are recomputed. Historical evidence remains visible even when stale for the current configuration.

**Figure 4. Selective carry-forward versus the stopping rule.** VU-01b permits selective carry-forward for a controlled provenance-only revision after a typed comparator and negative control pass; LC-01 rejects automatic inheritance after a substantive model-algorithm/`Implementation_ID` change despite survival of the old execution envelope.

## Main tables

### Table 1. Capability, implementation and current evidence identity

| Trial-facing capability | Implementation | Implementation_ID | Migration/change class | Evidence anchors | Current bounded state |
|---|---|---|---|---|---|
| `sensor.tws.track` | OpenEaagles TWS + AirTrkMgr | `openeaagles.tws.airtrkmgr@b3d7e74` | M1 Wrap | BP-01, MS-01 | Behavior-preserved within BP envelope; architecturally substitutable within MS-01 |
| `sensor.tws.track` | RadarSimPublic radar + CV KF | `radarsimpublic.radar-kf@8b63f82` | M2 Adapt | MS/SP/EQ/EB/EA/VU | Kinematic research use `QUALIFIED_WITHIN_EVIDENCE`; RF-performance use `UNKNOWN` |
| `sensor.tws.track` | RadarSimPublic radar + CA KF | `radarsimpublic.radar-ca-kf@8b63f82` | `MODEL_ALGORITHM` + `Implementation_ID` change | LC-01 | Architecture `PASS_FRESH_EXECUTION`; kinematic fitness `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`; RF `UNKNOWN` |

### Table 2. Frozen experiment chain and allowed inference

| Experiment | Frozen result | Quantitative anchor | Supported inference | Explicit boundary |
|---|---|---|---|---|
| BP-01 | PASS | 16/16 exact; negative control rejected | Wrapper transparency in frozen deterministic observation envelope | no universal/hidden-state equivalence |
| MS-01 | PASS | 16/16 + 16/16; upper-trial edits 0 | bounded architectural/contract substitution | no equal fidelity or semantic-qualified substitution |
| SP-01 | PASS | 5/5 semantic mismatches rejected; RF `UNKNOWN` | structural conformance separable from semantic qualification | no automatic semantic inference |
| EQ-01 | PASS | 4/4 decisions matched | qualification depends on intended use and evidence | not accreditation |
| EB-01 | PASS | upper-core churn 0 vs 160; reassessment 1/4 vs 3/4 | change locality and narrower declared reassessment radius | no lower total LOC/time/cost claim |
| EA-01 | PASS | evidence records 1→2→3→4→5; history retained | provenance-monotonic history with selective applicability | no enterprise-scale repository claim |
| VU-01a | **FAIL** | exact identity 8/16 | strict byte rule unsuitable for tested cross-run evidence | not a universal statement about numerical reproducibility |
| VU-01b | PASS | normalized 16/16; `+1e-6 m` control rejected | selective carry-forward for tested provenance revision | not universal delta-requalification |
| LC-01 | PASS stop-rule test | CV 16/16; CA 16/16; 12/16 equal; max differences 109.0755 m and 67.6108 m/s | substantive algorithm/identity change crosses inheritance boundary | discrimination control, not operational validation |

### Table 3. Lifecycle change–evidence action matrix

| Change class | Default consequence | Required action | Empirical anchor |
|---|---|---|---|
| documentation/display metadata | evidence remains applicable | reuse | EA-01 |
| adapter/binding provenance only | affected current claims may become stale | typed delta reassessment | VU-01a/b |
| numerical representation/environment | byte identity may be inappropriate | preregistered claim-appropriate comparator + sensitivity control | VU-01a/b |
| semantic mapping | semantic and dependent use claims affected | semantic reassessment; preserve `UNKNOWN` | SP/EQ/EA |
| model algorithm / `Implementation_ID` | implementation-specific evidence stale for new configuration | reject automatic inheritance; obtain fresh affected evidence | LC-01 |
| upper trial specification | trial-specific evidence affected | reassess dependent trial/use claims | EA-01 dependency replay |
| capability contract | broad dependency intersection | broad affected-claim reassessment | EA-01 dependency replay |

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

## Repository-hosted supporting evidence

`research/SUPPORTING_EVIDENCE_PACKAGE_v1_1.md` organizes detailed Supplementary Methods, Figures and Tables for reproducibility. No main-paper claim depends on its acceptance as a separate JDMS supplemental file.