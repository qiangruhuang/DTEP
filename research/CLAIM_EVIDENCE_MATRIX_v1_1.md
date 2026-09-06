# Manuscript Claim–Evidence Matrix v1.1

Status: **Frozen for manuscript production**

Date: 2026-09-06

Central manuscript question:

> Can heterogeneous simulation models be unified behind a stable trial-facing capability boundary while their test/qualification evidence accumulates over time without being blindly inherited after model evolution?

Every empirical manuscript claim SHALL map to frozen evidence. Architecture definitions, external policy context, inferences and limitations must remain explicitly distinguishable from empirical results.

## RQ1 — Heterogeneous model unification

| Claim ID | Manuscript claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| RQ1-C1 | A real legacy OpenEaagles TWS capability can be externally wrapped without changing its declared observable behavior in the frozen deterministic envelope. | BP-01 | empirical, bounded | universal/hidden-state equivalence; accreditation |
| RQ1-C2 | Two heterogeneous implementations can execute behind one frozen upper trial and capability contract by changing implementation binding rather than upper trial logic. | MS-01 v2 | empirical, bounded | equal fidelity; numerical equivalence; universal plug-and-play |
| RQ1-C3 | `Capability_ID` can remain stable while concrete `Implementation_ID` values differ. | frozen architecture + MS-01 | design + demonstrated instantiation | universal minimality of the identity scheme |

## RQ2 — Semantic and intended-use safeguards

| Claim ID | Manuscript claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| RQ2-C1 | Structural/schema compatibility does not imply semantic compatibility. | SP-01 | empirical for preregistered mutations | complete semantic reasoning |
| RQ2-C2 | The semantic precheck rejected the five preregistered unit/frame/sign/time mismatches. | SP-01 | empirical, exact 5/5 | universal mismatch detection |
| RQ2-C3 | A real unresolved RF relation can remain `UNKNOWN` rather than being silently promoted to compatible. | SP-01 | empirical evidence-state result | claim that RF concepts are incompatible |
| RQ2-C4 | Qualification can differ for the same implementation when intended use changes. | EQ-01 | empirical, bounded | authoritative accreditation |
| RQ2-C5 | Fresh architectural execution does not itself establish intended-use fitness. | LC-01 | empirical decision-state result | architecture PASS implies model validity |

## RQ3 — Cumulative evidence and selective applicability

| Claim ID | Manuscript claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| RQ3-C1 | The TMSU boundary isolated model-specific change from the shared upper trial in the controlled benchmark. | EB-01 | comparative, bounded | lower total development effort |
| RQ3-C2 | The controlled semantic-update benchmark affected fewer declared reassessment scopes under TMSU than the direct route. | EB-01 | empirical, benchmark-specific | enterprise-wide percentage savings |
| RQ3-C3 | Historical evidence can accumulate without deletion while current applicability changes selectively. | EA-01 | empirical mechanism result | enterprise-scale evidence-store claim |
| RQ3-C4 | Evidence history can be provenance-monotonic while qualification remains configuration- and intended-use-dependent. | EA-01 + EQ-01 | evidence-synthesis result | monotonic increase in trust |
| RQ3-C5 | An unresolved `UNKNOWN` can persist through unrelated successful evidence additions and maintenance activity. | SP-01 → EQ-01 → EA-01 → VU-01b → LC-01 | longitudinal evidence-state result | `UNKNOWN` is permanent |

## RQ4 — Bounded inheritance and stop rule

| Claim ID | Manuscript claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| RQ4-C1 | A strict cross-run byte-identity rule was not robust for the tested repeated numerical traces. | VU-01a | retained negative result | all simulations lack bitwise reproducibility |
| RQ4-C2 | An evidence-type-aware numerical equivalence rule with a sensitivity control supported carry-forward for one controlled provenance-only adapter/binding revision. | VU-01b | empirical, bounded | universal delta-requalification rule |
| RQ4-C3 | Successful version maintenance did not resolve the unrelated RF semantic `UNKNOWN`. | VU-01b | empirical lifecycle result | no future evidence can resolve it |
| RQ4-C4 | Changing the selected RadarSimPublic tracking algorithm from CV to CA and changing `Implementation_ID` constituted a substantive implementation change despite unchanged repository commit, contract and declared semantic mapping. | LC-01 + frozen bindings | empirical configuration fact | repository commit is irrelevant generally |
| RQ4-C5 | Both CV and CA executed all 16 old E2 cases, but only 12/16 behavior traces were equal under the frozen normalized criterion. | LC-01 | quantitative, exact | old E2 envelope globally invalid |
| RQ4-C6 | The maneuvering-target challenge materially discriminated the two selected algorithms under the constructed sensitivity scenario. | LC-01 | empirical sensitivity result | CA operationally superior or validated |
| RQ4-C7 | Automatic implementation-specific qualification inheritance was rejected for the LC-01 algorithm/identity change while unaffected evidence remained reusable. | LC-01 | empirical lifecycle stop-rule result | every algorithm change requires full evidence reset |
| RQ4-C8 | CA architectural execution was freshly re-established while CA kinematic intended-use fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`. | LC-01 | empirical decision-state result | fresh execution equals fresh qualification |

## Architecture / design claims

| Claim ID | Design statement | Basis | Allowed presentation | Prohibited presentation |
|---|---|---|---|---|
| D1 | TMSU is a SAL-aligned packaging/conformance profile for a model capability, not a new runtime middleware. | research architecture freeze + conformance profile | design definition | empirical discovery |
| D2 | `Capability_ID != Implementation_ID` is the identity separation used to permit multiple implementations of one trial-facing capability. | conformance profile | architecture rule demonstrated in this study | universal proof of minimality |
| D3 | Evidence records carry claim, configuration, intended use, domain, method, result, dependencies and provenance. | evidence lifecycle profile | research data model | universal VV&A ontology |
| D4 | Historical retention and current applicability are represented separately. | evidence lifecycle profile | lifecycle design supported by EA/VU/LC | replacement for accreditation authority |

## External-source claims

Statements about Army M&S modernization, MOSA, digital engineering, VV&A policy, intended-use validation, model reuse or standards SHALL cite external authoritative/peer-reviewed sources and SHALL NOT be inferred from WP1 experiments.

## Quantitative anchors approved for main text / figures

| Quantity | Frozen result | Evidence |
|---|---:|---|
| BP-01 behavior-preservation cases | 16/16 exact | BP-01 |
| MS-01 execution | 16/16 OpenEaagles; 16/16 RadarSimPublic | MS-01 |
| SP-01 injected semantic mismatch rejection | 5/5 | SP-01 |
| EB-01 shared upper-orchestrator changes | 0 TMSU vs 160 direct lines | EB-01 |
| EB-01 direct RadarSimPublic refs in shared core | 0 TMSU vs 9 direct | EB-01 |
| EB-01 reassessment scopes under semantic update | 1/4 TMSU vs 3/4 direct | EB-01 |
| EA-01 evidence-record replay | 1→2→3→4→5 | EA-01 |
| VU-01a exact cross-run identity | 8/16 | VU-01a |
| VU-01b normalized numerical equivalence | 16/16 | VU-01b |
| LC-01 old-envelope behavior equality | 12/16 | LC-01 |
| LC-01 old-envelope execution | 16/16 CV; 16/16 CA | LC-01 |
| LC-01 max range separation | 109.0754918963 m | LC-01 |
| LC-01 max range-rate separation | 67.6107619584 m/s | LC-01 |

## Main-paper synthesis claims

The manuscript may use the following synthesis language:

### S1

> Heterogeneous-model unification can stabilize the trial-facing capability boundary without collapsing implementations into a common codebase.

Grounding: RQ1-C1–C3.

### S2

> Interface-level substitutability does not authorize semantic compatibility, intended-use fitness or accreditation.

Grounding: RQ2-C1–C5.

### S3

> Evidence history may accumulate monotonically while current qualification remains non-monotonic because applicability depends on configuration and intended use.

Grounding: RQ3-C3–C5.

### S4

> Evidence inheritance requires both a positive carry-forward rule and a stopping rule.

Grounding: RQ4-C1–C8.

### S5 — strongest conclusion

> In the tested lifecycle, a controlled provenance-only revision permitted typed delta carry-forward, whereas a substantive algorithm/implementation-identity change rejected automatic implementation-specific qualification inheritance while preserving unaffected historical evidence.

Grounding: VU-01b + LC-01.

## Prohibited headline claims

Do not write:

```text
TMSU reduces engineering time by X%
TMSU reduces total code
TMSU guarantees model interoperability
TMSU proves two models are equivalent
all model updates can use delta requalification
all algorithm changes require full revalidation
the CA tracker is more accurate in general
RF semantics are incompatible
TMSU performs accreditation
TMSU replaces HLA/DIS/FMI
```

## Sentence-level manuscript control

Before submission, every causal, comparative, quantitative or generalizable sentence SHALL be labeled internally as one of:

```text
EMPIRICAL
DESIGN
EXTERNAL_SOURCE
INFERENCE
LIMITATION
```

A sentence that mixes categories must be split or rewritten.
