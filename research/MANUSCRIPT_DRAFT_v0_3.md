# Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Cumulative Evidence and Bounded Qualification Inheritance

**Manuscript draft v0.3 — central-question refocus; WP1 evidence locked**

## Abstract

Heterogeneous modeling and simulation (M&S) environments used in acquisition and test and evaluation (T&E) often combine long-lived legacy software, implementation-specific data structures, local semantic assumptions and locally accumulated verification/validation evidence. Modernization initiatives emphasize modular open architectures and replaceable components, but interface-level replaceability leaves a T&E-specific question unresolved: when a model implementation is replaced or evolves, which prior evidence remains applicable to the changed configuration? We developed and empirically evaluated a Simulation Abstraction Layer (SAL)-aligned **Test Model Service Unit (TMSU)**, defined as a logical capability/conformance package rather than a new simulation runtime. TMSU separates stable trial-facing `Capability_ID` from concrete `Implementation_ID` and links capability contracts, semantic declarations, implementation bindings and evidence provenance to each implementation. Using a real legacy OpenEaagles track-while-scan radar capability and an independent public RadarSimPublic radar/tracking implementation, we evaluated an evidence chain spanning behavior preservation, heterogeneous substitution, semantic precheck, intended-use qualification, change isolation, evidence accumulation, version carry-forward and an explicit inheritance stop rule. The wrapper preserved OpenEaagles observable behavior in 16/16 frozen cases. OpenEaagles and RadarSimPublic each executed 16/16 cases behind the same frozen upper trial without trial edits. Five of five structurally valid semantic mismatches were rejected, while a real RF concept remained `UNKNOWN`; the same RadarSimPublic implementation was consequently qualified only for a bounded kinematic research use, not an RF-performance use. Evidence records then accumulated without deleting history while current applicability changed selectively. A strict byte-level carry-forward rule failed on repeated numerical execution (8/16 exact traces), whereas an evidence-type-aware criterion supported one controlled provenance-only revision (16/16 normalized equivalence plus a sensitivity control). Finally, changing the selected RadarSimPublic tracking algorithm from constant velocity to constant acceleration changed `Implementation_ID`, crossed the tested carry-forward boundary and correctly prevented automatic inheritance of implementation-specific qualification even though both algorithms executed the old 16-case envelope. These results support a bounded digital-T&E principle: **evidence history can be provenance-monotonic while qualification remains configuration-, intended-use- and evidence-dependent**. The demonstrated value is evidence manageability and bounded inheritance, not universal model equivalence or measured reduction in engineering time.

## 1. Introduction

Modeling and simulation are embedded throughout defense acquisition, experimentation and T&E, but many operationally useful capabilities remain bound to long-lived software environments in which model logic, data representations, semantic assumptions and application-specific integration have evolved together. RAND's 2025 enterprise Army M&S concept characterizes a broader modernization problem that includes aging infrastructure, model and data silos and limited capture, curation and reuse of information generated across acquisition activities [1]. DoD Modular Open Systems Approach (MOSA) policy likewise emphasizes modularity, open key interfaces, conformance and the ability to add, modify or replace components across a system lifecycle [2,3].

These directions address a necessary software-architecture problem: **can one component be replaced by another?** For T&E, however, replacement creates a second problem: **what happens to the evidence that justified use of the preceding model for a particular test purpose?** Two implementations can satisfy one interface while differing in algorithm, physics or assumptions. A small adapter revision may leave model behavior unchanged. A semantic mapping can change the meaning of structurally valid data. A model can continue to pass an old regression envelope even after an internal algorithm changes. Conversely, a numerical model can produce last-bit cross-run differences without a scientifically meaningful behavioral change. Treating every modification as a complete validation reset discards reusable knowledge; treating interface compatibility or regression similarity as permission to inherit prior qualification risks blind trust.

Existing VV&A guidance already makes intended use, assumptions, limitations, version control and evidence documentation central. MIL-STD-3022 provides common structures for documenting V&V and accreditation information and is intended to support consistent information sharing and reuse [4]. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, model version, capabilities, assumptions, limitations, uncertainty and validation response variables [5]. Continuous and model-based VV&A research similarly emphasizes lifecycle-wide credibility rather than code verification alone [8,9]. Work on model reuse and interoperability stresses composability, reusable interfaces, standards and broader federation [6,10,14]. The unresolved implementation-level issue is not whether evidence matters, but how its applicability should change when a reusable model component itself changes.

We study that narrower question using a SAL-aligned Test Model Service Unit (TMSU). TMSU is not another simulation bus, broker or middleware layer. It is a logical packaging and conformance construct that separates an abstract test capability from concrete model implementations and binds implementation identity to semantic declarations, executable bindings, provenance and evidence records. The central identity relation is:

```text
Capability_ID != Implementation_ID
```

This separation makes heterogeneous substitution possible without implying that evidence belongs globally to the abstract capability. Evidence remains tied to what was actually tested: the implementation, configuration, domain, intended use and method that produced it.

The study asks four questions.

**RQ1.** Can a stable capability boundary support a real legacy implementation and a real heterogeneous alternative without rewriting upper trial logic?

**RQ2.** Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

**RQ3.** Can evidence history accumulate while current applicability changes selectively as model configurations evolve?

**RQ4.** Can the lifecycle distinguish a change that permits bounded evidence carry-forward from a substantive model change that requires fresh affected qualification?

We answer these questions through a frozen chain of experiments using OpenEaagles TWS radar/AirTrkMgr and the independent public RadarSimPublic radar/tracking implementation. The chain deliberately includes both successful and failed evidence operations: a transparent wrapper, real heterogeneous substitution, semantic mismatch detection, use-relative qualification, cumulative evidence, a failed exact-byte reuse criterion, a corrected numerical carry-forward criterion and a model-algorithm change that explicitly rejects automatic qualification inheritance.

The resulting contribution is therefore not generic reuse. It is **controlled evidence inheritance**: historical evidence remains auditable, unaffected evidence can remain active, affected evidence can become stale, an unresolved `UNKNOWN` remains unresolved until relevant evidence addresses it, and substantive implementation change can cross an explicit carry-forward boundary even when the upper interface remains stable.

## 2. Related work and positioning

### 2.1 Modular architectures, model reuse and interoperability

MOSA and enterprise M&S modernization motivate modular component replacement and reduced coupling [1–3]. Reference-model and composability research has long emphasized requirements, conceptual models and V&V as part of reusable M&S systems [6]. Recent digital-engineering work identifies persistent standards gaps when models developed for local contexts are reused or federated more broadly [10]. Cross-domain reviews of simulation reuse similarly distinguish multiple reuse modes, including reusable conceptual models, open/reproducible model assets and black-box/distributed components [14].

The present study builds on rather than replaces this work. Its distinct question is whether **qualification evidence can evolve coherently with a replaceable executable component**. Architectural substitution is therefore treated as the beginning rather than the end of the T&E problem.

### 2.2 Credibility, intended use and lifecycle VV&A

Model validity is not a global binary property independent of use. Winton et al. emphasize validation use cases that pair model intent with evidence [7]. Fonseca i Casas proposes a continuous VV&A process spanning the model lifecycle [9]. Hill argues for model-based and standards-based VV&A artifacts integrated into digital-engineering ecosystems [8]. Defense-oriented reviews similarly emphasize disciplined V&V, referent comparisons and objective evidence when models support consequential decisions [11]. Process-oriented credibility frameworks relate required credibility to simulation-task criticality [12].

Cross-domain credible-practice guidance converges on several of the same requirements: define context, evaluate within context, use version control, document limitations, test competing implementations and conform to standards [13]. These principles support the study's conservative treatment of `UNKNOWN` and versioned evidence, but prior conceptual guidance does not by itself establish how evidence should be selectively retained or invalidated after a concrete implementation change.

### 2.3 Specific gap addressed

The paper therefore does not claim a new theory of VV&A or a new interoperability standard. It operationalizes a narrower lifecycle mechanism:

```text
heterogeneous substitution
-> semantic qualification
-> intended-use evidence
-> versioned evidence accumulation
-> selective carry-forward when justified
-> explicit refusal when implementation change crosses the evidence boundary
```

The key distinction is:

```text
component replaceability
!=
qualification-evidence inheritance
```

## 3. Methods

### 3.1 TMSU as a SAL-aligned evidence-bearing capability unit

The frozen research formulation is:

```text
TMSU = CP + SC + SP + EB + TP + PP
```

where the components represent the capability/contract, service or execution contract, semantic profile, evidence bundle, test profile and provenance package defined in the research protocol. The equation denotes a logical composition; one TMSU need not correspond to one process, container or transport.

The trial-facing identity used throughout WP1 was:

```text
Capability_ID:        sensor.tws.track
Contract_ID:          tmsu.sensor.tws.track.v1
Semantic_Profile_ID:  tmsu.sensor.tws.track.semantic.v1
```

OpenEaagles and RadarSimPublic retained distinct `Implementation_ID` values. The TMSU boundary does not replace HLA, DIS, FMI or another execution transport; such mechanisms may remain below or alongside the capability/evidence layer.

### 3.2 Evidence representation and lifecycle state

An evidence item is represented conceptually as:

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

Qualification is defined conditionally:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE,
     UNKNOWN,
     NOT_QUALIFIED}
```

where `I` denotes implementation, `U` intended use, `C` current configuration and `E_t` the evidence available at lifecycle time `t`.

Evidence history is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

but current applicability is recomputed after change. If the declared dependencies of evidence `E` do not intersect configuration change `Delta(C)`, the evidence can remain directly active:

```text
Dep(E) ∩ Delta(C) = ∅
```

When they intersect, the old record is retained historically but becomes stale for the changed configuration unless fresh or allowed delta evidence restores the affected claim.

The lifecycle therefore distinguishes at least:

```text
ACTIVE_FROM_ORIGINAL_EVIDENCE
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE
PASS_FRESH_EXECUTION
QUALIFIED_WITHIN_EVIDENCE
HISTORICAL / STALE
UNKNOWN
NOT_QUALIFIED
```

### 3.3 BP-01: behavior preservation of a real legacy capability

We selected the public OpenEaagles TWS radar plus AirTrkMgr implementation at frozen commit `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`. A headless native probe directly observed track count, track ID, range, range rate, relative azimuth, elevation, track quality and average RF signal from the native track manager. The M1 wrapper executed the same native probe externally and applied no transformation to the behavior-bearing stdout trace.

The frozen envelope was a complete 2×2×2×2 design over target distance (10 or 20 km), azimuth (0° or 20°), RCS (1 or 4 m²) and motion (static or closing at 150 m/s), yielding 16 cases. The preregistered deterministic criterion required exact direct-versus-wrapper trace identity and successful rejection of a deliberately altered negative-control trace.

### 3.4 MS-01: real heterogeneous substitution

The second implementation came from the independent public repository `Murmur-ops/RadarSimPublic` at frozen commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`. Its adapter called upstream radar/SNR, constant-velocity Kalman and track-quality components without modifying upstream source.

The E2 upper trial specification, orchestrator and capability contract were frozen. Model selection changed only the implementation binding. Both OpenEaagles and RadarSimPublic executed the same 16 cases. MS-01 required successful execution and conformance to the shared canonical contract; cross-implementation numerical equality was explicitly not required.

### 3.5 SP-01: structural-versus-semantic precheck

SP-01 compared structural validation alone with structural validation plus semantic checks over concept, datatype, unit, reference frame, time basis and sign convention. Five structurally valid negative cases changed one semantic dimension: range unit, azimuth unit, range-rate sign, reference frame or time basis. A positive control preserved the declarations.

A real ambiguity control retained the RadarSimPublic mapping of `Radar.snr(range, rcs)` to canonical `average_signal_db`. Because available evidence did not establish equivalence between RF signal-to-noise ratio and the OpenEaagles/canonical track-average-signal concept, the preregistered safe state was `UNKNOWN` rather than asserted compatibility.

### 3.6 EQ-01: intended-use qualification

Four use cases exercised the evidence-aware screen. U1 requested a bounded kinematic research/conformance use requiring range, range rate and azimuth within the executed 10–20 km / 0–20° / 1–4 m² evidence domain. U2 requested an RF-performance decision using `average_signal_db` and comparative model-validity evidence. U3 requested use at 50 km, outside the executed domain. U4 introduced an explicit conflicting range-unit declaration.

The allowed outcomes were `QUALIFIED_WITHIN_EVIDENCE`, `UNKNOWN` and `NOT_QUALIFIED`; the screen was explicitly not an accreditation authority.

### 3.7 EB-01: change surface and reassessment radius

We compared the TMSU route with a competent point-to-point integration of the same frozen RadarSimPublic implementation. Both arms executed the same 16 cases and had to produce identical canonical outputs. The TMSU route left the generic upper orchestrator unchanged and isolated model-specific integration in an adapter and binding. The direct route placed imports, parameterization, execution and semantic projection inside the upper orchestrator.

We measured shared-core line churn, direct concrete-model references and the number of declared evidence/retest scopes affected by a controlled semantic-mapping-only update. We did not treat source LOC as a measure of human engineering time.

### 3.8 EA-01: cumulative evidence and selective staleness

BP-01 through EB-01 were registered as an immutable evidence graph with explicit dependencies. Stage replay tested whether the evidence set could grow without removing previous records and whether final decisions could be reconstructed from their evidence paths. Controlled lifecycle changes tested documentation metadata, semantic mapping, adapter, upper trial and capability contract changes. A stale record remained historically available but was not considered directly applicable to the changed configuration.

### 3.9 VU-01a/b: a real provenance-only revision and comparator correction

A real RadarSimPublic adapter/binding provenance revision changed the adapter artifact and binding version while keeping the upstream model commit, implementation identity, trial, capability contract, semantic profile and declared semantic mapping unchanged.

VU-01a initially used exact cross-run SHA-256 identity of floating-point canonical traces. A final-head repeated execution failed this criterion in 8/16 cases. Artifact comparison showed machine-precision-scale floating differences rather than a declared stochastic model change.

VU-01b retained the failure and changed the comparison to exact discrete record structure plus normalization of floating fields to nine decimal places. A +1e-6 m perturbation served as a sensitivity control and had to be rejected. The nine-decimal rule was treated as a representation-comparison rule, not a model-validity tolerance.

### 3.10 LC-01: model-algorithm change and the inheritance boundary

LC-01 deliberately exceeded the VU-01b provenance-only envelope. The selected RadarSimPublic tracker changed from the upstream constant-velocity Kalman helper to the upstream constant-acceleration helper, and `Implementation_ID` changed accordingly. The upstream repository commit, upper trial, contract, semantic-profile identity and declared field mappings remained unchanged.

Both configurations executed the same 16 old E2 cases. Their canonical behavior was compared using the frozen discrete/9-decimal numerical criterion. A separate maneuvering-target sensitivity challenge—20 km initial range, 20° azimuth, 150 m/s initial closing speed and 15 m/s² closing acceleration—tested whether the algorithms were genuinely distinguishable outside the original E2 envelope.

Crucially, the lifecycle decision was not defined only by old-envelope numerical similarity. A declared `MODEL_ALGORITHM` plus `Implementation_ID` change was preregistered to reject automatic implementation-specific qualification inheritance. Unaffected evidence could remain active; affected behavior/fitness claims required fresh support.

## 4. Results

### 4.1 RQ1: the stable capability boundary supported both preservation and real heterogeneous substitution

BP-01 passed all 16 frozen cases. Every case produced native tracks, direct and wrapped behavior traces were byte-identical, the blocking Station warning was absent and the deliberately altered negative-control trace was rejected. The 16 baseline traces were themselves distinct across the scenario matrix, ruling out a trivial repeated-output explanation.

MS-01 v2 then replaced the earlier synthetic reference model with independent RadarSimPublic. OpenEaagles passed 16/16 cases and RadarSimPublic passed 16/16; every output passed the same canonical validator. The frozen trial specification, orchestrator and capability contract were unchanged, so:

```text
upper_trial_artifacts_modified_for_swap = 0
binding_selections_changed = 1
```

The cross-implementation canonical traces differed in all 16 matched scenarios. This is expected: the result establishes architectural/contract-level substitutability, not numerical equivalence.

Together BP-01 and MS-01 answer RQ1 positively within the frozen TWS capability: a real legacy implementation can be transparently wrapped in its declared envelope and a real heterogeneous alternative can be selected without rewriting upper trial logic.

### 4.2 RQ2: structural interoperability was separated from semantics and intended-use fitness

All seven SP-01 cases passed structural validation. Semantic evaluation then rejected all five injected mismatches, accepted the positive control and returned `UNKNOWN` for the real RF concept relation:

```text
rf.signal_to_noise_ratio
?=
rf.track_average_signal
```

Thus:

```text
structural PASS != semantic COMPATIBLE
```

EQ-01 produced all four preregistered decisions. U1, the bounded kinematic research/conformance use, was `QUALIFIED_WITHIN_EVIDENCE`. U2, the RF-performance use, was `UNKNOWN` because the RF semantic relation and comparative model-validity evidence were unresolved. U3 was `UNKNOWN` because 50 km lay outside the executed evidence domain. U4 was `NOT_QUALIFIED` because the range-unit declaration was explicitly incompatible.

The same RadarSimPublic implementation therefore received different decisions under different intended uses. RQ2 is supported in the bounded sense that schema/interface conformance was prevented from being silently promoted to semantic compatibility or general model fitness.

### 4.3 RQ3: evidence history accumulated while applicability remained conditional

The EB-01 functional-equivalence control passed 16/16 cases for both the TMSU and direct integration routes with byte-identical canonical outputs. The TMSU route modified zero upper-orchestrator lines and introduced zero direct RadarSimPublic references into the shared core. The direct route changed 160 upper-core lines and introduced nine direct RadarSimPublic references. However, the isolated TMSU boundary itself contained 224 physical lines. The experiment therefore does not support a lower-total-LOC claim.

For the controlled semantic-mapping update, the TMSU route required reassessment of 1/4 declared scopes compared with 3/4 in the direct route. The measurable advantage was change locality and smaller evidence invalidation radius, not a measured reduction in engineer-hours.

EA-01 then accumulated five existing evidence records in order:

```text
1 -> 2 -> 3 -> 4 -> 5
```

Every previous record remained present at each later stage. Six final decision states were reconstructed from explicit evidence provenance. Under all five controlled lifecycle change cases, all five historical records were retained even when some became stale for the changed configuration.

The unresolved RF `UNKNOWN` persisted after later EQ-01 and EB-01 evidence were added. Consequently:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

This is the central answer to RQ3: accumulation and applicability are different properties.

### 4.4 RQ4, part 1: a naive carry-forward criterion failed and was corrected

VU-01a's exact-byte criterion failed on a repeated final-head execution:

```text
exact trace identity = 8 / 16
VU-01a = FAIL
```

The maximum observed differences between previous and repeated traces were approximately `3.64e-12 m` in range, `5.68e-14 m/s` in range rate, `2.22e-16` in quality and `7.11e-15 dB` in signal representation. These last-bit differences exposed a problem with the evidence rule rather than establishing a stochastic-model change.

The failure was retained. VU-01b then applied the frozen typed comparison:

```text
META / S / frame / track ID: exact
floating T fields: normalized to 9 decimal places
```

All 16 updated traces matched the prior traces under that representation rule, and the +1e-6 m negative-control perturbation was rejected. BP-01 and SP-01 were reused without re-execution; architectural substitution and the kinematic intended-use path were restored with delta evidence; EB-01 remained historical for the revised configuration; and the RF semantic/use states remained `UNKNOWN`.

Thus a controlled provenance-only change admitted bounded carry-forward, but only after the comparator itself was made appropriate to the numerical evidence.

### 4.5 RQ4, part 2: a substantive model-algorithm change crossed the inheritance boundary

LC-01 changed the selected RadarSimPublic tracking algorithm and `Implementation_ID` while keeping the same upstream repository commit, upper trial, contract and declared semantic mapping.

Both configurations executed all 16 old E2 cases:

```text
CV valid = 16 / 16
CA valid = 16 / 16
```

At the frozen normalized behavior criterion:

```text
CV vs CA equal = 12 / 16
CV vs CA different = 4 / 16
```

The old envelope was therefore only partly discriminating. The separate maneuver challenge materially separated the algorithms:

```text
max |range_CA - range_CV| = 109.0754918963 m
max |range-rate_CA - range-rate_CV| = 67.6107619584 m/s
```

Within that constructed challenge, CA also showed smaller range and range-rate RMSE than CV, but those values are used only to confirm sensitivity to accelerated motion and are not interpreted as general operational superiority.

The lifecycle decision was:

```text
automatic carry-forward
= REJECTED_FRESH_IMPLEMENTATION_QUALIFICATION_REQUIRED
```

BP-01 and SP-01 remained active because their declared dependencies were unchanged. CV-specific MS-01, EQ-01, EB-01 and VU-01b evidence remained historically retained but stale for the CA configuration. Fresh CA architectural execution was re-established:

```text
MS-01 architectural execution for CA
= PASS_FRESH_EXECUTION
```

but the kinematic intended-use state remained:

```text
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

The RF semantic and RF-performance states likewise remained `UNKNOWN`.

This gives RQ4 a paired answer. A controlled provenance-only revision can use typed delta evidence, whereas a substantive model-algorithm/implementation-identity change crosses the tested automatic inheritance boundary.

## 5. Discussion

### 5.1 Heterogeneous-model unification is necessary but not sufficient for digital T&E

The initial modernization problem is architectural: legacy and alternative models need a stable trial-facing capability boundary. BP-01 and MS-01 show that such a boundary can preserve a real legacy capability and support a real heterogeneous alternative without rewriting the frozen upper trial. This is the basic value expected from modular architectures.

For T&E, however, the more consequential question appears after substitution succeeds. A model that can execute behind the interface is not automatically semantically compatible, valid for the requested use or entitled to inherit evidence created for another implementation or configuration. The TMSU construct therefore treats capability unification as an **evidence-bearing boundary**, not as evidence of common validity.

### 5.2 Replaceability must be separated from qualification inheritance

MOSA-style replaceability concerns whether a component can be added, modified or replaced through controlled interfaces [2,3]. The experimental chain adds a T&E-specific separation:

```text
replaceability
!=
qualification inheritance
```

MS-01 provides the positive replaceability result. SP-01 and EQ-01 then show that structural success can coexist with semantic uncertainty and intended-use restrictions. LC-01 goes further: even when the same contract and semantic declaration remain stable, a substantive implementation change can invalidate the direct applicability of earlier implementation-specific fitness evidence.

This is why `Capability_ID` and `Implementation_ID` must remain distinct. The capability identifies what the trial asks for; the implementation identifies what generated the evidence.

### 5.3 `UNKNOWN` is a useful, durable scientific state

The real RF ambiguity provides a longitudinal control throughout the study. It first appears as `UNKNOWN` in SP-01, blocks the RF-performance use in EQ-01, remains unresolved as additional evidence accumulates in EA-01, survives the successful VU-01b maintenance revision and remains unresolved after LC-01.

LC-01 creates a second form of uncertainty: the new CA implementation is architecturally executable, yet its intended-use fitness is not inherited. The state `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE` explicitly records that gap.

These cases are important because many software-oriented workflows implicitly collapse "no detected integration error" into "acceptable to use." The evidence-lifecycle model instead permits successful integration and unresolved qualification to coexist.

### 5.4 Evidence accumulation and trust accumulation are different

EA-01 supports a simple but important distinction:

```text
historical evidence count can only grow
```

while:

```text
current claim applicability can increase, decrease or remain unknown
```

A changed configuration does not erase what was previously learned; the old record remains part of the audit trail. But retention does not make it applicable to the new configuration. This avoids two opposite failure modes:

```text
evidentiary amnesia:
change -> discard all old evidence
```

and:

```text
blind inheritance:
change -> assume all old evidence still applies
```

The operational alternative is selective staleness based on explicit dependencies.

### 5.5 The evidence rule itself is part of the evidence system

VU-01a is deliberately retained because it prevents an overly clean reuse story. The exact-byte rule seemed reasonable for a deterministic numerical model but was not stable across independent repeated execution. Had the failed run been discarded, the resulting lifecycle mechanism would have encoded an unjustified portability assumption.

VU-01b shows the correct response: revise the evidence criterion transparently, preserve the negative result, state what the new criterion means, and test its sensitivity. The nine-decimal normalization is not a radar-validity tolerance; it is a representation-comparison rule appropriate to the observed numerical behavior. This distinction is broadly relevant to long-lived digital evidence archives replayed across different execution environments.

### 5.6 Evidence inheritance requires both a positive rule and a stop rule

The strongest paper-level result is the pairing of VU-01b and LC-01.

For the controlled provenance-only revision:

```text
same model/algorithm identity
same contract and semantic mapping
successful re-execution
appropriate numerical comparison
sensitive negative control
-> affected current claim can be restored by delta evidence
```

For the substantive algorithm revision:

```text
MODEL_ALGORITHM changes
Implementation_ID changes
-> automatic implementation-specific qualification inheritance rejected
```

The stop rule is not equivalent to "rerun everything." BP-01 and SP-01 remained directly reusable. What changed was the size of the affected evidence radius. This suggests a more useful lifecycle concept than minor/major version labels alone: the relevant question is **which claim dependencies intersect the declared change?**

### 5.7 Passing an old regression envelope is not a validity-inheritance rule

LC-01 is particularly informative because both algorithms executed all 16 old cases and most matched at the frozen normalized criterion. A lifecycle system that used only contract conformance or legacy-regression success would therefore have weak grounds for distinguishing the change.

The maneuver challenge verified that the selected algorithms could diverge materially under different target dynamics. Importantly, the challenge does not validate CA as the better operational model; it demonstrates why the changed algorithm must earn fresh evidence appropriate to the intended use. The broader principle is that **regression similarity is evidence about one observation envelope, not a universal transfer certificate for model validity**.

### 5.8 The engineering value is manageability, traceability and change locality

EB-01 prevents the paper from making a simplistic efficiency claim. The TMSU boundary did not contain fewer total physical lines than the direct integration benchmark, and no engineer-hour study was performed. The objective benefit was that the shared upper trial did not change and a later semantic-mapping modification affected fewer declared reassessment scopes.

This matters in T&E because the engineering cost of modification includes both changing software and determining what evidence must be repeated. The present work directly addresses the second problem. Whether this evidence locality produces calendar-time or cost savings at organizational scale remains an empirical question for future deployment studies.

### 5.9 Relationship to VV&A and accreditation

The study does not automate or replace accreditation. Existing standards and policy require use-specific credibility evidence, assumptions, limitations, uncertainty and governance [4,5]. TMSU provides a way to keep lower-level evidence and its configuration dependencies machine-manageable so that later VV&A/accreditation decisions can determine what remains applicable.

The hierarchy used throughout the study is therefore:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

A PASS at a lower layer does not imply a PASS at a higher one.

## 6. Limitations

The empirical study concerns one primary capability class, two public heterogeneous software/model codebases and one algorithm variant inside RadarSimPublic. The trial envelopes are intentionally compact. The results therefore do not establish enterprise-wide contract optimality, universal model composability, equal fidelity across implementations or enterprise-scale evidence-repository performance.

The OpenEaagles behavior-preservation result is bounded to its declared observable trace and frozen deterministic envelope; it does not establish hidden-state equivalence. The MS-01 substitution result establishes execution behind one common structural contract but not physical validity equivalence.

The semantic precheck operates over declared metadata and preregistered mutations; it does not infer arbitrary semantics from source code and does not resolve the RF concept relationship. That relation remains `UNKNOWN`.

The LC-01 maneuver challenge was deliberately constructed to discriminate CV and CA tracking behavior and is not an operational radar-validation study. CA kinematic intended-use fitness therefore remains unresolved pending fresh evidence. The challenge metrics must not be interpreted as proof of general CA superiority.

The evidence dependency graph and change classes are a research profile, not a universal VV&A taxonomy. Stochastic, adaptive or high-fidelity physics models may require different evidence types, seeded or distributional comparisons and different carry-forward thresholds. Human governance, security classification, proprietary-model restrictions and authoritative accreditation workflows are outside the current prototype.

Finally, EB-01 does not measure human engineering time or cost. Claims about organization-wide schedule savings require instrumented replication across multiple model classes and teams.

## 7. Conclusion

Heterogeneous simulation-model modernization for digital T&E cannot end at interface standardization. A replaceable implementation also carries a history of evidence whose applicability may change when the implementation, semantics, trial or environment changes.

In the bounded TWS study, a SAL-aligned TMSU preserved a real legacy capability, enabled real heterogeneous substitution without rewriting the upper trial, detected semantic mismatch and unresolved meaning, conditioned qualification on intended use, isolated model-specific change and maintained a cumulative evidence history. More importantly, the lifecycle exercised both sides of evidence reuse: a controlled provenance-only revision was restored using an evidence-type-aware delta check, while a substantive tracking-algorithm/`Implementation_ID` change was prevented from automatically inheriting prior implementation-specific qualification.

The resulting principle is:

> **Preserve evidence history monotonically; inherit current claims only when their dependencies remain valid or are explicitly restored by appropriate delta evidence; refuse automatic inheritance when substantive implementation change crosses the tested qualification boundary.**

This reframes heterogeneous-model unification from a software integration problem into an evidence-governance problem for continuously evolving digital T&E model portfolios.

## Working references

1. Hargrove H, Conley T, Allendorf E, Whitehead NP, Willcox J. *A Modernized Enterprise Army Modeling and Simulation Concept*. RAND Corporation; 2025. RRA3261-1.
2. U.S. Department of Defense, Office of the Under Secretary of Defense for Research and Engineering. *Modular Open Systems Approach*. Systems Engineering and Architecture guidance.
3. U.S. Department of Defense. *SD-28: Standardization Decisions for a Modular Open Systems Approach (MOSA)*. 2026.
4. U.S. Department of Defense. *MIL-STD-3022: Documentation of Verification, Validation, and Accreditation (VV&A) for Models and Simulations*.
5. U.S. Department of Defense. *DoDM 5000.102: Modeling and Simulation Verification, Validation, and Accreditation for Operational Test and Evaluation and Live Fire Test and Evaluation*. 2024.
6. Tolk A, Diallo S, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7:69–82.
7. Winton JR, Colombi J, Jacques D, Johnson K. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33.
8. Hill JH. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Proceedings of the Vertical Flight Society 81st Annual Forum and Technology Display*. 2025.
9. Fonseca i Casas P. A Continuous Process for Validation, Verification, and Accreditation of Simulation Models. *Mathematics*. 2023.
10. Noguchi RA. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025;35.
11. Owen KR, Chakrabortty R. Verification, validation, and accreditation for models and simulations in the Australian defence context: a review. *The Journal of Defense Modeling and Simulation*. 2022/2024 issue;21:205–227.
12. Eichenseer F, Heinkel H-M, Benedikt M, Ahmann M, Holzner M, Stadler C. Modeling & Simulation SPICE: Assessing the Capability of Credible Simulation Processes. *INCOSE International Symposium*. 2023;33.
13. Erdemir A, Mulugeta L, Ku J, et al. Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective. *Journal of Translational Medicine*. 2020;18.
14. Zschaler S, Mustafee N, Harper A, Monks T, Onggo B, Currie C, Polack FAC. On simulation reuse in healthcare applications. *Simulation*. 2025;102:149–165.

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
