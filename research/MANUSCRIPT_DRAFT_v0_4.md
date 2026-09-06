# Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Cumulative Evidence and Bounded Qualification Inheritance

**Manuscript draft v0.4 — paper-production draft; WP1 evidence locked**

## Abstract

Modernizing heterogeneous modeling and simulation (M&S) environments for acquisition and test and evaluation (T&E) requires more than making legacy and alternative models executable behind common interfaces. A model replacement or update also changes the evidentiary basis on which that model may be used for a particular test purpose. We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned **Test Model Service Unit (TMSU)**, defined as a logical capability/conformance package rather than a new simulation runtime. TMSU separates a stable trial-facing `Capability_ID` from concrete `Implementation_ID` values and links each implementation to a capability contract, semantic declarations, executable binding, provenance and evidence records. Using a real legacy OpenEaagles track-while-scan radar capability and an independent public RadarSimPublic radar/tracking implementation, we evaluated an evidence chain spanning behavior preservation, heterogeneous substitution, semantic precheck, intended-use qualification, change isolation, cumulative evidence, version carry-forward and an explicit inheritance stop rule. The OpenEaagles wrapper preserved the declared observable behavior in 16/16 frozen cases. OpenEaagles and RadarSimPublic each executed 16/16 cases behind the same frozen upper trial with no upper-trial modification. Five of five structurally valid semantic mismatches were rejected, while a real RF concept remained `UNKNOWN`; the same RadarSimPublic implementation was consequently `QUALIFIED_WITHIN_EVIDENCE` for a bounded kinematic research use but remained `UNKNOWN` for an RF-performance use. Evidence records accumulated without deleting history while current applicability changed selectively. A strict byte-level cross-run carry-forward rule failed on repeated numerical execution (8/16 exact traces), whereas an evidence-type-aware numerical rule supported one controlled provenance-only revision (16/16 normalized equivalence with a sensitivity control). Finally, changing the selected RadarSimPublic tracker from a constant-velocity to a constant-acceleration Kalman filter changed `Implementation_ID`, crossed the tested carry-forward boundary and prevented automatic inheritance of implementation-specific qualification even though both configurations executed all 16 legacy cases. These results support a bounded digital-T&E principle: **evidence history can be provenance-monotonic while current qualification remains configuration-, intended-use- and evidence-dependent**. The demonstrated value is evidence manageability and bounded inheritance, not universal model equivalence, automated accreditation or measured reduction in engineering time.

**Keywords:** modeling and simulation; digital test and evaluation; model interoperability; VV&A; evidence reuse; model lifecycle; modular open systems; legacy modernization

## 1. Introduction

Modeling and simulation are used throughout defense acquisition, experimentation and T&E, yet operationally useful capabilities frequently remain embedded in long-lived software environments in which model logic, data structures, semantic assumptions and local integration have evolved together. RAND's enterprise Army M&S modernization concept identifies aging infrastructure, model/data silos and limited capture, curation and reuse of M&S-generated information as persistent modernization problems [1]. DoD Modular Open Systems Approach (MOSA) guidance similarly emphasizes modular design, open key interfaces, verifiable conformance and the ability to add, modify or replace components throughout the lifecycle [2,3].

These directions address an essential architecture question: **can one model implementation be replaced by another without rebuilding the trial around it?** For T&E, however, successful replacement creates a second problem: **what happens to the evidence that justified use of the preceding model for a particular test purpose?** Two implementations may satisfy one structural interface while differing in algorithms, physics or assumptions. A small adapter revision may leave model behavior unchanged. A semantic mapping may change the meaning of otherwise valid data. A numerical model may produce last-bit differences across runners without a meaningful behavioral change. Conversely, a model may continue to pass a familiar regression envelope after an internal algorithm changes materially. Treating every change as a complete validation reset discards reusable knowledge; treating interface compatibility or regression similarity as permission to inherit prior qualification risks unjustified trust.

Existing VV&A policy and literature already make intended use, configuration, assumptions, limitations and documented evidence central. MIL-STD-3022 provides common structures for documenting verification, validation and accreditation products and facilitates information sharing across VV&A activities [4]. DoDM 5000.102 requires M&S V&V planning for operational and live-fire T&E to address intended use, version control, capabilities, assumptions, limitations, uncertainty and validation response variables [5]. Reference-model and composability research links requirements, conceptual models and V&V to model reuse [6]. Digital-engineering work emphasizes validation use cases that connect model intent with evidence [7], structured lifecycle-visible VV&A [8], continuous VV&A across model development [9], and standards needed for broader model interoperability [10]. Defense VV&A reviews likewise emphasize disciplined validation and objective comparison evidence [11]. Process-oriented credibility frameworks relate required credibility to simulation-task criticality [12], while cross-domain credible-practice guidance converges on context definition, version control, documentation, competing implementations and standards [13]. Recent simulation-reuse work further distinguishes multiple reuse modes spanning open/reproducible assets, conceptual reuse and component reuse [14].

The unresolved implementation-level problem is therefore not whether evidence matters. It is how **evidence applicability should evolve together with a reusable model component**. We study that problem through a SAL-aligned Test Model Service Unit (TMSU). TMSU is not a simulation bus, broker or replacement for HLA, DIS or FMI. It is a logical packaging and conformance construct that separates an abstract trial-facing capability from concrete model implementations and associates implementation identity with semantic declarations, executable bindings, provenance and evidence records.

The central identity relation is:

```text
Capability_ID != Implementation_ID
```

The distinction is essential because the capability identifies what the trial requests, whereas the implementation identifies what actually generated the evidence.

We address four research questions:

**RQ1.** Can a stable capability boundary support a real legacy implementation and a real heterogeneous alternative without rewriting upper trial logic?

**RQ2.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3.** Can evidence history accumulate while current applicability changes selectively as model configurations evolve?

**RQ4.** Can the lifecycle distinguish a change that permits bounded evidence carry-forward from a substantive model change that requires fresh affected qualification?

We evaluate these questions with a frozen evidence chain built around OpenEaagles TWS radar/AirTrkMgr and the independent public RadarSimPublic radar/tracking implementation. The chain intentionally contains both positive and negative results: legacy behavior preservation, real heterogeneous substitution, semantic mismatch detection, use-relative qualification, change isolation, append-only evidence accumulation, a failed exact-byte reuse criterion, a corrected numerical carry-forward criterion and a model-algorithm change that explicitly rejects automatic qualification inheritance.

The resulting contribution is **controlled evidence inheritance** rather than generic model reuse. Historical evidence remains auditable; unaffected evidence may remain active; affected evidence may become stale; unresolved `UNKNOWN` states remain unresolved until relevant evidence is supplied; and substantive implementation change can cross an explicit carry-forward boundary even when the upper capability contract is unchanged.

## 2. Related work and study positioning

### 2.1 Model modularity, reuse and interoperability

MOSA and enterprise M&S modernization motivate modular interfaces, reduced coupling and lifecycle replaceability [1–3]. Tolk et al. linked requirements capture, conceptual modeling, V&V and composability in a reference-modeling framework for M&S [6]. More recent digital-engineering work has emphasized standards gaps that limit broader use, federation and interoperability of models developed in local contexts [10]. Zschaler et al. distinguished complementary reuse modes involving open/reproducible models, conceptual simulation domains and black-box or distributed components [14].

These streams establish that architecture, standards and explicit conceptual boundaries matter for reuse. The present study does not claim otherwise. Its narrower contribution is to connect executable model substitution to the **lifecycle status of qualification evidence**.

### 2.2 Credibility, intended use and lifecycle VV&A

Winton et al. emphasize validation use cases that capture both the reason for using a digital model and the evidence required to support that use [7]. Hill describes model-based and standards-based M&S VV&A artifacts within digital-engineering ecosystems [8]. Fonseca i Casas extends VV&A across the model lifecycle and emphasizes assumptions and correct use rather than code alone [9]. Owen and Chakrabortty review defense VV&A practice and highlight executable comparison against physical or comparative referents and the value of objective comparators [11]. M&S SPICE similarly relates the credibility required of a simulation process to the criticality of the task [12]. Erdemir et al., in a cross-domain credible-practice framework, include context definition, contextual evaluation, version control, documentation, competing implementations and standards among core practices [13].

These sources support use-relative and lifecycle-aware credibility. The present experiments add a more specific configuration-management question: after a concrete implementation change, which evidence remains directly applicable, which becomes stale, and when is delta evidence insufficient to inherit a prior claim?

### 2.3 Specific gap addressed

The study therefore operationalizes a T&E-facing chain that prior architectural or VV&A principles do not by themselves execute:

```text
heterogeneous substitution
-> semantic qualification
-> intended-use evidence
-> cumulative evidence history
-> selective carry-forward when justified
-> explicit refusal when implementation change crosses the evidence boundary
```

The key separation is:

```text
component replaceability != qualification-evidence inheritance
```

## 3. Methods

### 3.1 TMSU as an evidence-bearing capability boundary

The frozen research formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

The terms denote the capability/contract, service/execution contract, semantic profile, evidence bundle, test profile and provenance package defined in the research protocol. The formulation is logical rather than deployment-specific; a TMSU need not correspond to one process, one container or one transport.

All WP1 experiments used the same trial-facing identity:

```text
Capability_ID:        sensor.tws.track
Contract_ID:          tmsu.sensor.tws.track.v1
Semantic_Profile_ID:  tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retained distinct `Implementation_ID` values. Transport mechanisms remain orthogonal to the TMSU evidence boundary.

### 3.2 Evidence model and lifecycle state

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

Current qualification is conditional rather than a permanent label attached to a model:

```text
Q(I,U,C | E_t)
  in {QUALIFIED_WITHIN_EVIDENCE,
      UNKNOWN,
      NOT_QUALIFIED}
```

where `I` is implementation, `U` intended use, `C` current configuration and `E_t` the available evidence at lifecycle time `t`.

Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t union DeltaE
```

but current applicability is recomputed after declared configuration change. Evidence remains directly active when its dependencies do not intersect the change:

```text
Dep(E) intersection Delta(C) = empty
```

If dependencies intersect, the prior record remains historically retained but is stale for the changed configuration unless fresh evidence or an allowed delta reassessment restores the affected claim.

The research lifecycle therefore distinguishes historical retention from current states such as `ACTIVE_FROM_ORIGINAL_EVIDENCE`, `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`, `PASS_FRESH_EXECUTION`, `QUALIFIED_WITHIN_EVIDENCE`, `UNKNOWN` and `NOT_QUALIFIED`.

`QUALIFIED_WITHIN_EVIDENCE` is deliberately narrower than formal accreditation. It means only that the preregistered evidence required for the specified research use, configuration and domain is present and contains no blocking incompatibility.

### 3.3 BP-01: legacy behavior preservation

We selected OpenEaagles TWS radar plus AirTrkMgr at frozen upstream commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A deterministic headless native probe observed track count, track ID, range, range rate, relative azimuth, elevation, quality and average RF signal directly from the native track manager. The M1 TMSU wrapper executed the same native probe externally and applied no transformation to the behavior-bearing stdout trace.

The frozen envelope was a complete 2x2x2x2 design over target distance (10 or 20 km), azimuth (0 or 20 degrees), radar cross section (1 or 4 m2) and motion (static or closing at 150 m/s), giving 16 cases. Preservation required successful execution, native track production, absence of the blocking Station warning, exact direct-versus-wrapper trace identity and rejection of a deliberately altered negative-control trace.

### 3.4 MS-01: real heterogeneous substitution

The second implementation came from `Murmur-ops/RadarSimPublic` at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. The adapter invoked upstream radar/SNR, constant-velocity Kalman and track-quality components without modifying upstream source.

The E2 trial specification, orchestrator and capability contract were frozen. Model selection changed only the implementation binding. Each implementation executed the same 16 cases. MS-01 required successful execution and conformance to the common canonical structural contract; numerical equality between implementations was not required.

### 3.5 SP-01: semantic precheck

SP-01 compared structural validation alone with structural validation plus semantic checks over concept, datatype, unit, reference frame, time basis and sign convention. Five structurally valid negative cases changed one semantic dimension: range unit, azimuth unit, range-rate sign, reference frame or time basis. A positive control preserved all declarations.

A real ambiguity control retained the RadarSimPublic mapping of `Radar.snr(range, rcs)` to canonical `average_signal_db`. Available evidence did not establish equivalence between RF signal-to-noise ratio and the canonical/OpenEaagles track-average-signal concept. The preregistered state was therefore `UNKNOWN` rather than asserted compatibility.

### 3.6 EQ-01: intended-use qualification

Four preregistered use cases were evaluated. U1 requested a bounded kinematic research/conformance use requiring range, range rate and azimuth within the executed 10–20 km, 0–20 degree and 1–4 m2 evidence domain. U2 requested an RF-performance decision using `average_signal_db` and comparative model-validity evidence. U3 requested use at 50 km, outside the executed domain. U4 introduced an explicit conflicting range-unit declaration.

The allowed outcomes were `QUALIFIED_WITHIN_EVIDENCE`, `UNKNOWN` and `NOT_QUALIFIED`.

### 3.7 EB-01: paired change-surface benchmark

We compared the TMSU path with a competent point-to-point integration of the same frozen RadarSimPublic implementation. Both arms executed the same 16 cases and were required to produce identical canonical outputs. The TMSU path left the generic upper orchestrator unchanged and isolated model-specific logic in a binding and adapter. The direct path placed concrete-model imports, parameterization, execution and semantic projection inside the upper orchestrator.

We measured shared-core line churn, direct concrete-model references and the number of declared evidence/retest scopes affected by a controlled semantic-mapping-only update. Source-code volume was not treated as a proxy for engineer time.

### 3.8 EA-01: cumulative evidence and selective staleness

BP-01 through EB-01 were registered as immutable evidence records with explicit dependencies. Sequential replay tested append-only accumulation and decision reconstruction from evidence provenance. Controlled lifecycle changes tested documentation metadata, semantic mapping, adapter, upper trial and capability contract changes. A stale record remained available historically but was excluded from current applicability until restored by relevant evidence.

### 3.9 VU-01a/b: real provenance revision and comparator correction

A real RadarSimPublic adapter/binding provenance revision changed the adapter artifact and binding version while keeping the upstream model commit, `Implementation_ID`, trial, capability contract, semantic profile and declared semantic mapping unchanged.

VU-01a initially required exact SHA-256 identity of cross-run floating-point canonical traces. A full repeated execution failed this criterion in 8/16 cases. Artifact comparison localized the differences to machine-precision-scale floating representation.

VU-01b retained this failure and used an evidence-type-aware representation criterion: exact discrete record structure and track identity, with floating fields normalized to nine decimal places. A +1e-6 m range perturbation served as a sensitivity control and had to be rejected. The nine-decimal rule was used only for cross-run representation comparison; it was not interpreted as a radar-validity tolerance.

### 3.10 LC-01: algorithm change and inheritance stop rule

LC-01 deliberately crossed the provenance-only VU envelope. The selected RadarSimPublic tracker changed from the upstream constant-velocity Kalman helper to the upstream constant-acceleration helper, and `Implementation_ID` changed accordingly. The upstream repository commit, upper trial, capability contract, semantic profile and declared field mappings remained unchanged.

Both configurations executed the same 16 old E2 cases. Canonical behavior was compared with the frozen discrete/9-decimal numerical criterion. A separate maneuvering-target sensitivity challenge used a 20 km initial range, 20 degree azimuth, 150 m/s initial closing speed and 15 m/s2 closing acceleration to verify that the algorithm choices were behaviorally distinguishable outside the original E2 envelope.

The lifecycle decision was specified independently of old-envelope similarity: a declared `MODEL_ALGORITHM` plus `Implementation_ID` change was not permitted to inherit prior implementation-specific intended-use qualification automatically. Unaffected evidence could remain active; affected behavior and fitness claims required fresh support.

## 4. Results

### 4.1 RQ1: legacy preservation and heterogeneous substitution

BP-01 passed all 16 frozen cases. Every case produced native tracks, direct and wrapped traces were byte-identical, the blocking Station warning was absent and the altered negative-control trace was rejected. The 16 baseline traces were themselves distinct across the scenario matrix, excluding a trivial repeated-output explanation.

MS-01 then tested OpenEaagles against the independent RadarSimPublic implementation under the same frozen upper trial. OpenEaagles passed 16/16 cases and RadarSimPublic passed 16/16, and all outputs passed the common canonical validator. The trial specification, orchestrator and capability contract remained unchanged:

```text
upper_trial_artifacts_modified_for_swap = 0
binding_selections_changed = 1
```

Cross-implementation canonical traces differed in all 16 matched cases. This is consistent with the experiment's objective: the common boundary established architectural/contract-level substitutability, not numerical or fidelity equivalence.

RQ1 therefore receives a bounded positive answer: the stable capability boundary preserved a real legacy implementation in its declared envelope and supported a real heterogeneous alternative without rewriting upper trial logic.

### 4.2 RQ2: structural conformance did not collapse semantics and fitness

All seven SP-01 cases passed structural validation. Semantic evaluation rejected all five injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RF concept relation:

```text
rf.signal_to_noise_ratio ?= rf.track_average_signal
```

Thus:

```text
structural PASS != semantic COMPATIBLE
```

EQ-01 produced all four preregistered decisions. U1 was `QUALIFIED_WITHIN_EVIDENCE` for the bounded kinematic research/conformance use. U2 was `UNKNOWN` because the RF semantic relation and comparative validity evidence were unresolved. U3 was `UNKNOWN` because 50 km lay outside the evidence domain. U4 was `NOT_QUALIFIED` because the range-unit declaration was explicitly incompatible.

The same implementation therefore received different decisions for different intended uses. RQ2 is supported in the bounded sense that successful interface execution was not silently promoted to semantic compatibility or general model fitness.

### 4.3 RQ3: evidence accumulated while current applicability remained conditional

The EB-01 functional-equivalence control passed 16/16 cases for both the TMSU and direct integration routes with byte-identical canonical outputs. The TMSU path modified zero upper-orchestrator lines and introduced zero direct RadarSimPublic references into the shared core. The direct route changed 160 upper-core lines and introduced nine direct RadarSimPublic references. However, the isolated TMSU boundary itself contained 224 physical lines. EB-01 therefore does not support a lower-total-LOC claim.

For a controlled semantic-mapping update, the TMSU path required reassessment of 1/4 declared scopes versus 3/4 for the direct route. The measured advantage was change locality and smaller evidence invalidation radius rather than demonstrated engineer-time reduction.

EA-01 then replayed cumulative evidence from one to five records:

```text
1 -> 2 -> 3 -> 4 -> 5
```

Every earlier record remained available at each later stage. Six final decision states were reconstructed from explicit evidence provenance. Across five controlled lifecycle-change cases, all 5/5 historical records were retained even when some became stale for the changed configuration.

The RF semantic `UNKNOWN` persisted after subsequent evidence was added. The empirical distinction is therefore:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

RQ3 receives a bounded positive answer: cumulative historical evidence and selective current applicability can coexist.

### 4.4 RQ4a: a naive carry-forward rule failed

VU-01a required exact cross-run byte identity and failed on a repeated full execution:

```text
exact trace identity = 8 / 16
VU-01a = FAIL
```

The largest observed absolute differences were approximately `3.64e-12 m` in range, `5.68e-14 m/s` in range rate, `2.22e-16` in quality and `7.11e-15 dB` in signal representation. The failure therefore exposed a portability problem in the evidence rule rather than demonstrating a declared stochastic change in model logic.

VU-01b replaced exact floating-byte identity with the frozen typed criterion. All 16 prior/current traces were equivalent after nine-decimal normalization, and the +1e-6 m negative-control perturbation was rejected. BP-01 and SP-01 were reused without re-execution; the affected architectural/intended-use path was restored with delta evidence; and the unrelated RF `UNKNOWN` remained unchanged.

The result establishes bounded carry-forward for one controlled provenance-only revision and demonstrates that the comparator itself is part of the evidence system.

### 4.5 RQ4b: a substantive algorithm change crossed the inheritance boundary

LC-01 changed the selected RadarSimPublic tracking algorithm and `Implementation_ID` while preserving the same upstream repository commit, upper trial, contract and declared semantic mapping.

Both configurations executed all 16 old cases:

```text
CV valid = 16 / 16
CA valid = 16 / 16
```

At the frozen normalized behavior criterion:

```text
CV vs CA equal = 12 / 16
CV vs CA different = 4 / 16
```

The old envelope was therefore only partly discriminating. The separate maneuver sensitivity challenge produced:

```text
max |range_CA - range_CV| = 109.0754918963 m
max |range-rate_CA - range-rate_CV| = 67.6107619584 m/s
```

Within that constructed scenario, CA also produced smaller range and range-rate RMSE than CV; those values are treated only as challenge-specific discrimination evidence and not as evidence of general operational superiority.

The lifecycle decision rejected automatic implementation-specific carry-forward:

```text
REJECTED_FRESH_IMPLEMENTATION_QUALIFICATION_REQUIRED
```

BP-01 and SP-01 remained active because their declared dependencies were unchanged. CV-specific MS-01, EQ-01, EB-01 and VU-01b evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was re-established as:

```text
PASS_FRESH_EXECUTION
```

but CA kinematic intended-use fitness remained:

```text
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

The RF semantic and RF-performance states also remained `UNKNOWN`.

Together, VU-01b and LC-01 provide the decisive RQ4 result: the evidence lifecycle can both carry forward a justified claim and explicitly stop inheritance when implementation change crosses the tested qualification boundary.

## 5. Discussion

### 5.1 Heterogeneous-model unification is only the substrate

BP-01 and MS-01 establish the basic modernization mechanism: a real legacy capability can be wrapped transparently within a bounded observation envelope, and an independent heterogeneous implementation can execute behind the same frozen trial-facing contract without rewriting upper trial logic. This is necessary for modular model portfolios, but it is not sufficient for T&E.

The remaining experiments show why. The ability to execute behind one contract does not establish shared semantics, equal fidelity, or fitness for all uses. More importantly, it does not determine whether evidence generated for one implementation remains applicable after that implementation changes.

### 5.2 Replaceability and qualification inheritance are separate lifecycle decisions

MOSA-style replaceability concerns whether components can be added, modified or replaced through controlled interfaces [2,3]. The T&E extension demonstrated here is:

```text
replaceability != qualification inheritance
```

`Capability_ID` identifies the trial-facing need; `Implementation_ID` identifies the concrete model/configuration that generated evidence. Keeping the identities separate allows a stable capability to support multiple implementations without making evidence globally transferable among them.

### 5.3 `UNKNOWN` is a durable evidence state, not an integration failure

The real RF ambiguity provides a longitudinal control. It first appears as `UNKNOWN` in SP-01, blocks the RF-performance use in EQ-01, persists through EA-01 evidence accumulation, survives the successful VU-01b revision and remains unresolved after LC-01. Later PASS results do not overwrite it because they address different claims.

LC-01 produces another legitimate uncertainty state: the CA configuration executes successfully, but intended-use fitness is not inherited. `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE` records that the architecture works while the relevant fitness evidence is absent.

This distinction is operationally useful. Successful integration and unresolved qualification can coexist without forcing the system to report either false confidence or false failure.

### 5.4 Historical accumulation and current applicability must be separated

EA-01 shows that historical evidence can remain append-only even while current claim applicability changes. This prevents two opposite lifecycle errors:

```text
change -> delete all old evidence
```

and

```text
change -> assume all old evidence still applies
```

The alternative is selective staleness. A record remains historically auditable, but direct current applicability depends on whether the evidence's declared dependencies intersect the change.

This yields the core distinction:

```text
historical retention != current applicability
current applicability != intended-use qualification
```

### 5.5 Evidence criteria must themselves be qualified

VU-01a is methodologically important because it demonstrates that an apparently strict criterion can be wrong for the evidence type. Exact byte identity was not stable across repeated numerical executions even though the observed differences were at machine-precision scale. VU-01b did not simply weaken the threshold until the test passed; it made the representation rule explicit and added a negative perturbation that the comparator had to reject.

The broader implication is that long-lived digital evidence archives should distinguish bitwise reproducibility from numerical equivalence and should validate the comparison method used to support carry-forward.

### 5.6 Evidence inheritance requires a positive rule and a stop rule

The paired VU-01b/LC-01 result is the strongest contribution of the study.

For a controlled provenance-only revision:

```text
same model/algorithm identity
same contract and semantic mapping
successful re-execution
appropriate numerical comparison
comparator sensitivity control
-> affected current claim restored by delta evidence
```

For a substantive algorithm/implementation-identity revision:

```text
MODEL_ALGORITHM changes
Implementation_ID changes
-> automatic implementation-specific qualification inheritance rejected
```

The second rule does not mean that all evidence is discarded. BP-01 and SP-01 remain reusable because the change does not intersect their declared dependencies. What expands is the affected reassessment radius. This is more precise than using generic major/minor version labels alone.

### 5.7 Passing an old regression envelope is not a validity-transfer certificate

Both CV and CA configurations executed all 16 old E2 cases, and 12/16 matched at the normalized criterion. A lifecycle rule based only on interface conformance or old regression success would therefore provide weak protection against evidence over-inheritance. The maneuver challenge showed that the two selected algorithms can diverge materially under accelerated motion.

The challenge does not prove that CA is the correct operational model. It demonstrates why the changed implementation must earn fresh evidence appropriate to its intended use. Regression similarity is evidence about a particular observation envelope, not a universal transfer certificate for model validity.

### 5.8 The demonstrated engineering value is manageability, not less code

EB-01 deliberately constrains the efficiency narrative. The TMSU boundary did not contain fewer total physical lines than the direct benchmark, and the study did not measure engineer-hours or calendar time. The objective advantage was change locality: the shared upper trial remained stable and a subsequent semantic update affected fewer declared reassessment scopes.

For T&E, a modification creates two burdens: implementing the software change and determining which evidence must be repeated. The present study addresses the second burden directly. Whether evidence locality translates into organization-wide schedule or cost reduction remains a separate empirical question.

### 5.9 Relationship to VV&A and accreditation

The study does not automate or replace accreditation. Existing policy requires use-specific evidence, assumptions, limitations, uncertainty and formal governance [4,5]. TMSU organizes lower-level conformance, semantic, provenance and execution evidence so that later VV&A/accreditation processes can determine what remains applicable after change.

The hierarchy retained throughout the study is:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

No lower-layer PASS implies a higher-layer PASS.

## 6. Limitations

The empirical study addresses one primary capability class, two public heterogeneous codebases and one algorithm variant within RadarSimPublic. Scenario envelopes are intentionally compact. The results therefore do not establish enterprise-wide contract optimality, universal composability, equal fidelity, enterprise-scale evidence-store performance or a universal change taxonomy.

The OpenEaagles behavior result is limited to the declared observable trace and frozen deterministic envelope; it does not establish hidden-state equivalence. The MS-01 result establishes structural/architectural substitution, not physical validity equivalence between the models.

The semantic precheck evaluates declared metadata and preregistered mutations. It does not infer arbitrary semantics from source code, and the real RF concept relationship remains `UNKNOWN`.

The LC-01 maneuver challenge was constructed to distinguish CV and CA behavior and is not an operational radar validation. CA kinematic intended-use fitness therefore remains unresolved. Challenge-specific RMSE values must not be interpreted as evidence of general CA superiority.

The evidence dependency graph and change classes are a research profile. Stochastic, adaptive or high-fidelity physics models may require seeded or distributional comparisons, uncertainty quantification and other carry-forward rules. Human governance, security classification, proprietary restrictions and authoritative accreditation are outside the prototype.

Finally, EB-01 does not measure engineering labor or cost. Organizational benefit requires instrumented replication across additional model classes and teams.

## 7. Conclusion

Heterogeneous simulation-model modernization for digital T&E cannot end at interface standardization. A replaceable model implementation also carries a history of evidence whose current applicability may change when the implementation, semantics, trial or environment changes.

In the bounded TWS study, a SAL-aligned TMSU preserved a real legacy capability, enabled real heterogeneous substitution without rewriting the upper trial, detected semantic mismatch and unresolved meaning, conditioned qualification on intended use, isolated model-specific change and maintained cumulative evidence history. More importantly, the lifecycle exercised both sides of evidence reuse: a controlled provenance-only revision was restored with an evidence-type-aware delta check, while a substantive tracking-algorithm/`Implementation_ID` change was prevented from automatically inheriting prior implementation-specific qualification.

The resulting principle is:

> **Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are explicitly restored by appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the tested qualification boundary.**

This reframes heterogeneous-model unification from a software-integration task into an evidence-governance problem for continuously evolving digital-T&E model portfolios.

## References

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Modular Open Systems Approach*. Systems Engineering and Architecture guidance.
3. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Implementing a Modular Open Systems Approach in DoD Programs*. 27 February 2025.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 9 December 2024.
6. Tolk A, Diallo SY, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7(2):69–82. doi:10.1057/jos.2013.3.
7. Winton JR, Colombi JM, Jacques DR, Johnson KE. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33(1):569–583. doi:10.1002/iis2.13039.
8. Hill J. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Vertical Flight Society 81st Annual Forum and Technology Display*. 2025. doi:10.4050/F-0081-2025-0104.
9. Fonseca i Casas P. A Continuous Process for Validation, Verification, and Accreditation of Simulation Models. *Mathematics*. 2023;11(4):845. doi:10.3390/math11040845.
10. Noguchi R. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025;35(1):427–443. doi:10.1002/iis2.70030.
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
- `tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json`
- `tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_2.md`
