# WP1 Formal Results and Research-Question Audit v1.0

Status: **Formal WP1 research result — bounded evidence; WP1 not yet closed**

Date: 2026-09-05

This document promotes BP-01 and MS-01 from engineering demonstrations to the formal empirical evidence base for WP1, then audits the original Research Protocol research questions and hypotheses against the evidence currently available from WP0 and WP1.

The purpose is to prevent scope drift. No additional model, broker, transport, API, registry, or orchestration mechanism is introduced here.

---

## 1. Original research objective retained

The study asks whether heterogeneous legacy simulation capability can be transformed into discoverable, callable, composable, replaceable, verifiable, traceable and evolvable test-grade digital assets through a SAL-aligned packaging/conformance approach, without rewriting legacy internals.

The formal research questions remain:

- **RQ1 — Minimum contract:** What is the minimum capability/contract/semantic/execution declaration needed to expose heterogeneous implementations under one stable capability identity?
- **RQ2 — Composition and substitution:** Can implementations be composed or replaced without changing the upper-level trial design and orchestration logic?
- **RQ3 — Semantic interoperability:** Can semantic compatibility be checked beyond syntactic/API compatibility so that structurally valid but semantically incompatible bindings are detected before execution?
- **RQ4 — Trust and reuse:** Can intended-use, provenance, verification/validation evidence and change history be represented so that model fitness-for-use can be screened and reused without repeating the full evidence-discovery process?
- **RQ5 — T&E engineering benefit:** Does the approach measurably reduce integration, replacement and update burden while improving reproducibility and evidence completeness?

The original hypotheses remain:

- **H1:** integration time is lower than current/manual integration;
- **H2:** upper-level trial change cost approaches zero when swapping implementations of the same capability;
- **H3:** model/data reuse is higher under the TMSU/SAL conformance approach;
- **H4:** semantic precheck detects incompatibilities that API/structural validation alone misses;
- **H5:** machine-readable evidence enables useful fitness-for-use screening;
- **H6:** a migrated/wrapped implementation preserves the required reference behavior within a preregistered Golden Scenario tolerance.

---

## 2. Formal WP1 Result R1 — BP-01 Behavior Preservation

### 2.1 Claim tested

For a frozen observational domain and execution environment, introducing a transparent external-process TMSU boundary around the legacy OpenEaagles TWS capability shall not alter its native observable behavior.

For each matched case `i`:

```text
Y_baseline(i) == Y_TMSU(i)
D_byte(Y_baseline(i), Y_TMSU(i)) = 0
```

### 2.2 Tested implementation

```text
Capability_ID:      sensor.tws.track
Implementation_ID: openeaagles.tws.airtrkmgr@b3d7e74
OpenEaagles commit: b3d7e74a9bf52934e13fd6a11f45dc9767ac9192
Migration path:     M1/M2-style external wrapping/adaptation
Source patches:     0
Execution:          50 Hz, 500 frames per case
```

### 2.3 Frozen scenario envelope

A `2 × 2 × 2 × 2` full-factorial matrix:

- distance: 10 km / 20 km;
- azimuth: 0° / 20°;
- RCS: 1 m² / 4 m²;
- motion: static / closing at 150 m/s.

Total: **16 cases**.

### 2.4 Formal result

```text
BP-01 decision:                     PASS
total cases:                        16
matched baseline/TMSU cases passed: 16 / 16
D_byte = 0:                         16 / 16
cases with behavior-bearing tracks: 16 / 16
source modifications:               0
blocking lifecycle warnings:        0
negative-control comparator:         correctly rejected altered trace
```

The canonical baseline repeat and wrapped execution produced identical SHA-256 traces. The 16 baseline conditions also produced 16 distinct hashes, showing that the experiment exercised distinct behaviors rather than repeatedly comparing one trace.

### 2.5 Supported inference

Within the frozen evidence envelope, the tested TMSU external-process packaging is behavior-transparent for the OpenEaagles TWS capability.

This is formal empirical support for the **behavior-preservation requirement of the M1/M2 migration path** and provides a bounded positive result for H6 with the deterministic tolerance set to exact identity (`epsilon = 0` at the native trace interface).

### 2.6 Non-supported inference

BP-01 does not establish behavioral equivalence outside the tested envelope, semantic substitutability with a different radar implementation, or fitness-for-use/accreditation for a test decision.

---

## 3. Formal WP1 Result R2 — MS-01 Real Heterogeneous Model Substitution

### 3.1 Claim tested

A frozen upper-level trial can select two genuinely distinct implementations of the same declared capability by changing only the implementation binding, while leaving the trial specification, orchestrator, capability contract and semantic-profile identifier unchanged.

### 3.2 Participating implementations

Implementation A:

```text
openeaagles.tws.airtrkmgr@b3d7e74
C++ / OpenEaagles / Tws + Radar + AirTrkMgr
```

Implementation B:

```text
radarsimpublic.radar-kf@8b63f82
Python / NumPy / Radar + Kalman filtering + Track model
Upstream commit: 8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

Both upstream model codebases were used with **zero source patches**.

### 3.3 Frozen upper-level artifacts

The real heterogeneous rerun reused the previously frozen E2 artifacts:

```text
trial_spec.json      SHA-256 af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf
orchestrator.py      SHA-256 b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db
capability_contract  SHA-256 f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

The only run-selection change was the implementation binding.

### 3.4 Shared declared identity

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

### 3.5 Formal result

```text
MS-01 decision:                           PASS
cases per implementation:                16
OpenEaagles cases passed:                16 / 16
RadarSimPublic cases passed:             16 / 16
outputs passing same canonical validator:16 / 16 for each implementation
upper trial artifacts modified for swap: 0
binding selections changed:              1
cross-implementation traces different:  16 / 16
cross-implementation traces identical:   0 / 16
```

### 3.6 Supported inference

Within the frozen E2 envelope, **real heterogeneous model-code substitutability at the architectural/contract level is empirically demonstrated**. A BP-01-qualified legacy OpenEaagles TWS implementation and an independently developed RadarSimPublic implementation can be invoked through one stable capability contract without rewriting the upper trial.

This is bounded positive evidence for H2:

```text
Delta upper-trial artifacts = 0
Delta implementation selection = 1 binding
```

### 3.7 Non-supported inference

MS-01 does not establish behavioral equality, equal fidelity, equal predictive validity, trial-specific fitness-for-use or accreditation.

A particularly important remaining caveat is that a shared `Semantic_Profile_ID` is currently a **declared compatibility condition**, not yet an independently challenged semantic-compatibility result. For example, the canonical `average_signal_db` field is populated from different native RF quantities in the two implementations. That mapping is adequate for the current architectural substitution gate but should not be treated as proof of semantic equivalence.

---

## 4. WP0 status: what is actually complete

WP0 has produced a **formal audit method**, not yet a completed multi-system empirical baseline.

Completed methodological outputs:

1. software baseline schema;
2. model-capability inventory taxonomy;
3. six-dimensional coupling vector `L_c = (L_E,L_D,L_T,L_S,L_C,L_V)`;
4. Model–Data–Engine dependency-graph definition;
5. migration classes M0 Preserve / M1 Wrap / M2 Adapt / M3 Extract / M4 Native;
6. MRE selection logic;
7. baseline engineering metrics B1–B6.

Empirical status:

- one real legacy capability, OpenEaagles TWS, has now been exercised deeply enough to support BP-01 and MS-01;
- a broad actual asset audit across multiple local/legacy systems has **not** yet been completed;
- B1–B6 have **not** yet been measured as paired before/after engineering outcomes.

Therefore WP0 currently supports research instrumentation and case selection, but does not yet support claims of enterprise-wide prevalence, coupling distributions, integration-time reduction or reuse improvement.

---

## 5. RQ-by-RQ evidence audit after WP0 + WP1

| Research question | Current status | What WP0/WP1 now supports | What remains missing |
|---|---|---|---|
| **RQ1 Minimum contract** | **Partially answered** | One stable `Capability_ID` + `Contract_ID` + declared semantic profile successfully carries a C++ OpenEaagles implementation and a Python/NumPy RadarSimPublic implementation through the same trial. `Capability_ID != Implementation_ID` is empirically useful. | Evidence is from one capability class (`sensor.tws.track`). No minimum-field ablation has shown that the current contract is minimal rather than merely sufficient. No evidence yet across strongly different timing/control patterns or non-sensor capability classes. |
| **RQ2 Composition / substitution** | **Substitution strongly supported; composition not yet answered** | MS-01 directly demonstrates binding-only substitution with zero upper-trial modification across two real heterogeneous implementations. | No multi-capability composition experiment has yet shown that a chain of independently bound capabilities can be reconfigured without upper-level redesign. |
| **RQ3 Semantic interoperability** | **Not yet answered** | Both implementations declare the same semantic profile and the adapter performs explicit field mapping. This proves the plumbing for semantic declaration exists. | No negative-control experiment has shown that structurally valid but semantically wrong units, frames, time bases, sign conventions or concepts are detected before execution. Declaring the same profile is not itself semantic validation. |
| **RQ4 Trust / evidence reuse** | **Foundation only** | BP-01/MS-01 use immutable evidence sets, hashes, provenance, explicit inference boundaries and gate decisions. | No machine-readable intended-use/validity-domain fitness screen has been evaluated. No change-impact/VV&A reuse experiment has been run. |
| **RQ5 T&E engineering benefit** | **Not answered** | MS-01 gives one engineering indicator: zero upper-trial edits for the substitution itself. | No paired baseline exists for integration time, engineer-hours, LOC changed, bespoke interfaces, manual steps, update time, reuse rate, reproducibility rate or evidence completeness. |

---

## 6. Hypothesis audit

| Hypothesis | Status after WP0/WP1 | Evidence judgment |
|---|---|---|
| **H1 integration time lower** | **Untested** | No current/manual baseline versus TMSU onboarding study. |
| **H2 upper-level change cost approaches zero on swap** | **Supported within one bounded real heterogeneous case** | `upper_trial_artifacts_modified_for_swap = 0`; one binding selection changed. Generalization beyond TWS remains open. |
| **H3 reuse rate higher** | **Untested** | No repeated integration/update tasks and no reuse denominator. |
| **H4 semantic precheck detects API-valid mismatch** | **Untested** | No semantic ablation/negative controls yet. |
| **H5 machine-assisted fitness-for-use** | **Untested** | Provenance exists, but intended-use and validity evidence have not yet been exercised as a decision aid. |
| **H6 Golden Scenario fidelity/preservation** | **Partially supported for M1/M2 wrapper preservation** | BP-01: 16/16 exact native-trace identity with `epsilon = 0` in the frozen deterministic envelope. Not yet tested for extracted/native replacement models. |

---

## 7. What WP1 can now legitimately claim

WP1 has crossed two important evidence thresholds:

1. **Legacy packaging can be behavior-transparent** within a frozen evidence envelope (BP-01).
2. **A frozen upper trial can substitute a second genuinely heterogeneous real implementation by binding only** (MS-01).

These results are sufficient to reject two weak alternatives:

- that TMSU wrapping necessarily perturbs legacy behavior;
- that apparent substitution works only because the second model is a DTEP-authored synthetic reference.

WP1 has **not** yet shown semantic safety, multi-capability composition, general engineering efficiency or trust/VV&A reuse. Those claims must remain outside the current Results section.

Recommended WP1 wording:

> WP1 established bounded behavior preservation and real heterogeneous implementation substitution under a frozen capability contract. It did not yet establish semantic interoperability, comparative model validity, or enterprise-level engineering benefit.

---

## 8. Decision on the next minimum experiment

### 8.1 Selection

The next experiment should be **SP-01 Semantic Precheck Ablation**, corresponding to the original E3 / RQ3 / H4.

It should **reuse the same two implementations, the same upper trial, the same orchestrator and the same contract structure**. No third model and no new interface mechanism are required.

### 8.2 Why SP-01 is the highest-value next step

MS-01 has already shown that structural/contract substitution works. The largest unresolved validity threat is now semantic: an implementation can satisfy the same field schema while attaching a different unit, frame, time basis, sign convention or physical meaning.

Continuing to add more TWS implementations would mostly replicate the already-supported architectural substitution claim. SP-01 instead targets an unanswered RQ and an untested hypothesis with minimal additional engineering.

### 8.3 Minimal design

Freeze one positive control and five structurally valid semantic perturbations. The values/shapes remain contract-valid so that an interface-only validator cannot distinguish them.

Recommended perturbations:

1. `range_m`: declared `km` instead of `m`;
2. `relative_azimuth_rad`: declared `deg` instead of `rad`;
3. `range_rate_mps`: reverse the sign convention (`positive=closing` versus `positive=increasing-range`);
4. position/angle reference: global/reference-frame declaration instead of ownship-relative;
5. time basis: seconds/absolute time instead of `simulation-frame`.

Add one **real ambiguity control** from the current evidence: the RF quantity mapped to `average_signal_db`. The expected semantic outcome for this field should be `UNKNOWN` or an explicitly qualified state unless the two native concepts are shown to be the same physical quantity. It should not be silently forced to `Compatible` merely because both are numeric dB values.

### 8.4 Two-arm ablation

```text
Arm A — Contract-only
schema/type/shape validation only

Arm B — Contract + Semantic Profile
Concept + Type + Unit + Frame + Time/sign constraints
```

### 8.5 Preregistered decision rule

For the five deliberately incompatible cases:

```text
Contract-only validator: may PASS structural validation
Semantic precheck:       must flag all five as INCOMPATIBLE before model execution
```

For the positive control:

```text
Semantic precheck: COMPATIBLE
```

For the real RF ambiguity control:

```text
Semantic precheck: UNKNOWN or qualified/non-comparable
```

The experiment should fail if a deliberately incompatible binding is marked `COMPATIBLE`, or if the real ambiguity is silently accepted without evidence.

### 8.6 Primary outcome

```text
Semantic mismatch detection rate
= incompatible cases rejected before execution / preregistered incompatible cases
```

Secondary outcomes:

- false rejection of positive control;
- treatment of the real ambiguity control;
- whether the same frozen upper trial can remain untouched when incompatible bindings are rejected at qualification time.

### 8.7 Why this remains a minimum experiment

SP-01 changes only semantic declarations/qualification logic used to evaluate the already-existing binding artifacts. It does not add a model, transport, broker, registry, simulation protocol or orchestration feature.

---

## 9. Research sequence after SP-01

Do not pre-commit to additional experiments now. The evidence-driven order should be:

```text
WP1 current
BP-01 PASS
MS-01 PASS
   ↓
SP-01 Semantic Precheck Ablation
   ↓
RQ/H audit again
```

Only after SP-01 should the study decide whether the next unresolved bottleneck is:

- RQ5 engineering-benefit measurement, or
- RQ4 trust/change-impact evidence reuse.

A multi-capability composition experiment should be added only if the central paper claim requires composition rather than substitution. A third TWS implementation is not currently justified by an unanswered core research question.

---

## 10. WP1 formal status

```text
WP1-A Legacy behavior-preserving packaging:     COMPLETE for bounded TWS case
WP1-B Real heterogeneous model substitution:    COMPLETE for bounded TWS case
WP1-C Semantic compatibility validation:         NOT YET TESTED
WP1-D Trust / intended-use evidence evaluation:  NOT YET TESTED
WP1 overall:                                     PARTIALLY COMPLETE
```

The next gate for WP1 closure is therefore **SP-01**, not expansion of model count or interface mechanisms.
