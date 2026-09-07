# Manuscript Claim–Evidence Matrix v2.5

Status: **Production-frozen after WP-FMI, WP-BL and WP-ENV**

Purpose: preserve the paper's two central contributions—heterogeneous model unification and bounded evidence inheritance—while incorporating standards-based execution, a competent software-façade baseline, and execution-environment lifecycle evidence without expanding to a second full capability validation.

| Claim ID | Paper-level claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| U1 | A real legacy OpenEaagles TWS capability can be externally wrapped without changing declared observable behavior in the frozen deterministic envelope. | BP-01 | empirical, bounded | universal or hidden-state equivalence; accreditation |
| U2 | Two heterogeneous tracking implementations can execute behind one frozen upper trial/capability contract by changing implementation binding rather than upper-trial logic. | MS-01 | empirical, bounded | equal fidelity; universal plug-and-play |
| U3 | TMSU separates trial-facing `Capability_ID` from concrete `Implementation_ID` and can sit above implementation-specific execution mechanisms. | architecture + BP/MS | instantiated design | new runtime middleware; replacement for HLA/DIS/FMI |
| F1 | An FMI 3.0 Co-Simulation FMU can be onboarded through a machine-readable metadata path with T&E-only semantics supplied separately. | FMI-01 | executable mechanism demonstration | broad capability validation; model-fidelity validation |
| F2 | In FMI-01, `h` and `v` were resolved from `modelDescription.xml` to `height_m` and `vertical_velocity_mps` without a model-specific procedural adapter. | FMI-01 | empirical, bounded | all FMUs are semantically self-describing |
| F3 | FMI supplies execution/model metadata, while TMSU adds program capability identity, reference-frame/sign semantics, intended use and evidence state. | FMI-01 mapping | design + executed example | FMI lacks semantics in general; TMSU replaces FMI |
| Q1 | Structural/schema compatibility does not imply semantic compatibility. | SP-01 | empirical for preregistered mutations | complete semantic reasoning |
| Q2 | Semantic precheck rejected 5/5 injected mismatches and retained the real RadarSimPublic RF relation as `UNKNOWN`. | SP-01 | empirical, bounded | automatic source-code semantic inference |
| Q3 | Qualification may differ for the same implementation when intended use changes. | EQ-01 | empirical, bounded | authoritative accreditation |
| Q4 | `UNKNOWN` represents evidence insufficiency rather than implicit compatibility or invalidity. | SP-01 + EQ-01 | empirical/conceptual, bounded | permanent uncertainty; proof of failure |
| B1 | A competent plain façade can isolate executable concrete-model coupling from the shared upper core as effectively as SAL/TMSU in the controlled BL-01 case. | BL-01 | empirical, bounded | façades are generally equivalent to TMSU |
| B2 | Direct, plain-façade and SAL/TMSU arms produced byte-identical outputs in 16/16 matched cases. | BL-01 | empirical, bounded | broad runtime/performance equivalence |
| B3 | The tested incremental TMSU contribution over the plain façade is attached T&E governance—semantic profile, explicit `UNKNOWN`, intended-use gate, typed evidence dependencies and lifecycle rule—not generic adapter isolation. | BL-01 | mechanism ablation | economic benefit; unique software modularity |
| B4 | Boundary LOC (plain façade 71; SAL/TMSU 199 nonblank lines) is descriptive and is not a cost or productivity metric. | BL-01 | descriptive | lower LOC, time or cost claim |
| M1 | Historical evidence can accumulate without deletion while current applicability changes selectively. | EA-01 | empirical mechanism result | enterprise-scale repository performance |
| M2 | Evidence history can be provenance-monotonic while current qualification remains configuration- and intended-use-dependent. | EA-01 + EQ-01 | central synthesis | trust grows monotonically with evidence count |
| M3 | The RF semantic `UNKNOWN` persists through later unrelated positive evidence. | SP→EQ→EA→VU→LC | longitudinal state result | future evidence can never resolve it |
| R1 | Exact cross-run byte identity was not a robust carry-forward comparator for the tested RadarSimPublic numerical traces. | VU-01a | retained negative result | all numerical simulations lack bitwise reproducibility |
| R2 | Evidence-type-aware numerical comparison plus a sensitivity control supported carry-forward for one provenance-only revision. | VU-01b | empirical, bounded | universal delta-requalification rule |
| E1 | `EXECUTION_ENVIRONMENT` is an operative typed evidence dependency: changing the FMI runtime made affected prior execution evidence stale while unrelated semantic evidence remained active. | ENV-01 | empirical, bounded | all environment changes affect evidence identically |
| E2 | Under one same-runner `fmusim 0.9.0→0.10.0` transition, both 10-run sets were internally byte-stable and all cross-runtime traces were identical/equivalent; the `+1e-6` negative control was rejected. | ENV-01 | empirical, bounded | portability across OS/hardware/compiler/stochastic stacks |
| E3 | Evidence-type-appropriate delta evidence restored only the affected execution/conformance claim to `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`. | ENV-01 | lifecycle mechanism result | broader intended-use fitness restored |
| R3 | A CV→CA tracker change altered `Implementation_ID` and crossed the tested automatic carry-forward envelope. | LC-01 | empirical configuration fact | every algorithm change requires total revalidation |
| R4 | Both CV and CA executed 16/16 old cases; 12/16 matched at the frozen normalized criterion, yet a maneuver challenge materially separated them. | LC-01 | empirical sensitivity result | CA is operationally superior or validated |
| R5 | Prior implementation-specific qualification was retained historically but made stale for CA; fresh architectural execution did not restore CA intended-use fitness. | LC-01 | empirical stop-rule result | all historical evidence discarded |
| S1 | Generic software isolation is not the paper's unique contribution; the demonstrated increment is capability-oriented T&E governance layered over standard execution/adaptation mechanisms. | BL + FMI + SP/EQ/EA | synthesis | universal superiority over ordinary software engineering |
| S2 | Model replaceability and evidence inheritance are distinct decisions governed by capability semantics, intended use, typed dependencies and change class. | MS + SP/EQ + VU/ENV/LC | paper-defining synthesis | universal accreditation/governance solution |

## RQ mapping

### RQ1 — Heterogeneous model unification
U1–U3, with F1–F3 as a standards-execution mechanism extension rather than a second full capability validation.

### RQ2 — Semantic and intended-use qualification
Q1–Q4.

### RQ3 — Cumulative evidence and manageability
B1–B4 and M1–M3.

### RQ4 — Bounded evidence inheritance
R1–R5 and E1–E3.

### Cross-cutting synthesis
S1–S2.

## Sentence control rule

Every causal, comparative, quantitative or generalizable manuscript statement must be classifiable as one of:

```text
EMPIRICAL_FROZEN
EXTERNAL_SOURCE
DESIGN_CHOICE
BOUNDED_INFERENCE
LIMITATION
```

No statement may infer model fidelity, accreditation, enterprise cost savings, universal portability, broad second-capability generalization, or HLA runtime validation from the v2.5 evidence.
