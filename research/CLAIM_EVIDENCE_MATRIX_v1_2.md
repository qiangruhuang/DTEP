# Manuscript Claim–Evidence Matrix v1.2

Status: **Production-frozen for dual-contribution manuscript**

Purpose: keep both paper landing points explicit: (A) heterogeneous model unification; (B) evidence lifecycle under continued model evolution.

| Claim ID | Paper-level claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| U1 | A real legacy OpenEaagles TWS capability can be externally wrapped without changing its declared observable behavior in the frozen deterministic envelope. | BP-01 | empirical, bounded | universal equivalence; hidden-state equivalence; accreditation |
| U2 | Two genuinely heterogeneous implementations can execute behind one frozen upper trial/capability contract by changing implementation binding rather than upper trial logic. | MS-01 v2 | empirical, bounded | equal fidelity; numerical equivalence; plug-and-play for all models |
| U3 | TMSU provides a SAL-aligned capability/conformance organization method that separates `Capability_ID` from concrete `Implementation_ID`. | architecture freeze + BP/MS implementation | design + instantiated architecture | new runtime middleware; replacement for HLA/DIS/FMI |
| U4 | Heterogeneous model unification can preserve a stable upper-trial boundary while allowing implementation-specific adapters, semantics and provenance to remain distinct. | MS-01 + EB-01 | empirical/design synthesis | zero integration work; no adapters needed |
| Q1 | Structural/schema compatibility does not imply semantic compatibility. | SP-01 | empirical for preregistered mutations | complete semantic reasoning; ontology completeness |
| Q2 | Semantic precheck rejected 5/5 preregistered mismatches and returned `UNKNOWN` for the real RadarSimPublic RF concept relation. | SP-01 | empirical, bounded | automatic source-code semantic inference |
| Q3 | Qualification may differ for the same implementation when intended use changes. | EQ-01 | empirical, bounded | authoritative accreditation |
| Q4 | `UNKNOWN` represents evidence insufficiency rather than implicit compatibility or invalidity. | SP-01 + EQ-01 | empirical/conceptual, bounded | UNKNOWN is permanent; UNKNOWN proves model failure |
| M1 | TMSU isolated concrete-model change outside the shared upper trial in the controlled direct-integration comparison. | EB-01 | comparative, bounded | fewer total LOC; measured time/cost savings |
| M2 | Historical evidence can accumulate without deletion while current applicability changes selectively. | EA-01 | empirical mechanism result | enterprise-scale repository performance |
| M3 | Evidence history can be provenance-monotonic while current qualification is configuration- and intended-use-dependent. | EA-01 + EQ-01 | central synthesis claim | trust increases monotonically with more evidence |
| M4 | The RF semantic `UNKNOWN` persisted through later unrelated positive evidence and lifecycle maintenance. | SP→EQ→EA→VU→LC | longitudinal evidence-state result | future evidence can never resolve it |
| R1 | Exact cross-run byte identity was not a robust generic carry-forward comparator for the tested numerical traces. | VU-01a | retained negative result | all numerical simulations lack bitwise reproducibility |
| R2 | Evidence-type-aware numerical equivalence plus a sensitivity control supported carry-forward for one controlled provenance-only revision. | VU-01b | empirical, bounded | universal delta-requalification rule |
| R3 | A successful maintenance update does not resolve an unrelated semantic `UNKNOWN`. | VU-01b | empirical lifecycle result | all unresolved states persist forever |
| R4 | A CV→CA tracking algorithm change changed `Implementation_ID` and constituted a substantive implementation change despite unchanged repository commit, upper contract and semantic mapping. | LC-01 | empirical configuration fact | repository commit alone is always insufficient identity |
| R5 | Both CV and CA executed the old 16-case envelope, yet only 12/16 were equal at the normalized behavior criterion. | LC-01 | empirical, bounded | old envelope is globally inadequate for every use |
| R6 | A constructed maneuvering-target challenge materially discriminated CV and CA behavior. | LC-01 | empirical sensitivity result | CA is operationally superior or validated |
| R7 | Automatic implementation-specific qualification inheritance was correctly rejected after the LC-01 algorithm/Implementation_ID change while unaffected evidence remained reusable. | LC-01 | empirical lifecycle stop-rule result | every algorithm change requires complete revalidation |
| R8 | Fresh architectural execution for a changed implementation does not by itself establish intended-use fitness. | LC-01 | empirical decision-state result | architecture PASS implies validity |
| S1 | The paper's demonstrated value is evidence manageability and bounded inheritance, not lower source-code volume or measured engineer time. | EB + EA + VU + LC | evidence synthesis | percentage schedule/cost savings |
| S2 | For digital T&E, model unification and evidence governance are complementary: replaceability of an implementation does not determine whether its predecessor's qualification evidence may be inherited. | MS + SP + EQ + VU + LC | paper-defining synthesis | universal T&E governance solution |

## RQ mapping

### RQ1 — heterogeneous model unification

Claims U1–U4.

### RQ2 — semantic and intended-use qualification

Claims Q1–Q4.

### RQ3 — cumulative evidence and manageability

Claims M1–M4.

### RQ4 — bounded evidence inheritance

Claims R1–R8.

### Cross-cutting synthesis

Claims S1–S2.

## Sentence control rule

Every sentence in manuscript v1.0 that states a causal, comparative, quantitative or generalizable proposition must be tagged internally as one of:

```text
EMPIRICAL_FROZEN
EXTERNAL_SOURCE
DESIGN_CHOICE
BOUNDED_INFERENCE
LIMITATION
```

No paper sentence may silently combine categories.
