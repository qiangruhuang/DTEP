# Supporting Evidence Package v1.1

**Purpose:** repository-hosted reproducibility package for `MANUSCRIPT_SUBMISSION_v1_1.md`.

**Submission note:** current JDMS guidance contains conflicting statements on supplemental material, including an explicit statement in the file-upload section that JDMS does not currently accept supplemental files. Therefore this package is **not required to understand any main-paper result**. All essential results remain in the main manuscript, Figures 1–4 and Main Tables 1–3. This file serves as a reproducibility appendix and can be supplied separately only if the editorial system permits it.

---

## Supplementary Methods

### SM1. TMSU identity and conformance boundary

The trial-facing identities are frozen as:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

Concrete implementations retain distinct `Implementation_ID` values. The governing identity rule is:

```text
Capability_ID != Implementation_ID
```

TMSU is a SAL-aligned logical packaging/conformance unit. It is not a simulation runtime, transport or replacement for HLA/DIS/FMI.

### SM2. OpenEaagles BP-01 observation interface

Frozen observable records:

```text
frame
track_count
track_id
range_m
range_rate_mps
relative_azimuth_rad
elevation_rad
quality
average_RF_signal
```

The direct native probe and TMSU wrapper execute the same OpenEaagles implementation. BP-01 therefore tests wrapper transparency at the declared observation boundary, not equivalence between different models.

Frozen scenario matrix:

| Factor | Level 1 | Level 2 |
|---|---:|---:|
| target range | 10 km | 20 km |
| azimuth | 0° | 20° |
| RCS | 1 m² | 4 m² |
| motion | static | closing 150 m/s |

Full factorial size: 16 cases.

### SM3. MS-01 canonical capability contract

The common canonical trace contains:

```text
META  dt_s frames capability_id implementation_id
S     frame track_count
T     frame track_id range_m range_rate_mps relative_azimuth_rad
      elevation_rad quality average_signal_db
```

MS-01 requires both implementations to execute the same frozen trial and pass the same structural validator. It does not require cross-implementation numerical equality.

### SM4. SP-01 semantic precheck

Semantic dimensions:

```text
concept
datatype
unit
reference_frame
time_basis
sign_convention
```

Decision rule:

```text
explicit mismatch      -> INCOMPATIBLE
supported match        -> COMPATIBLE
unresolved relation    -> UNKNOWN
```

`UNKNOWN` is non-compatible for qualification purposes but is not interpreted as evidence of invalidity.

Preregistered injected mismatches:

1. range unit `m -> km`
2. azimuth unit `rad -> deg`
3. range-rate sign reversal
4. ownship-relative frame -> ECEF
5. simulation-frame time basis -> UTC epoch seconds

Real ambiguity control:

```text
rf.signal_to_noise_ratio
?=
rf.track_average_signal
```

### SM5. EQ-01 intended-use screening

Research qualification function:

```text
Q(I,U,C | E)
  ∈ {QUALIFIED_WITHIN_EVIDENCE,
     UNKNOWN,
     NOT_QUALIFIED}
```

A positive state means only that the requested bounded research use is supported by the declared evidence. It is not authoritative accreditation.

### SM6. Evidence dependency and lifecycle algorithm

Evidence record:

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

Append-only history:

```text
E_(t+1) = E_t ∪ DeltaE
```

Applicability rule:

```text
if Dep(E) ∩ Delta(C) = empty:
    state(E,current_config) = ACTIVE
else:
    retain E historically
    state(E,current_config) = STALE
    identify affected claim class
    require typed delta or fresh evidence
```

Current qualification is reconstructed from ACTIVE plus newly restored affected evidence. `HISTORICAL` denotes retained provenance, not current applicability.

This dependency graph is a research profile. It is not claimed to be a complete universal taxonomy of M&S change.

### SM7. EB-01 paired direct-integration benchmark

Both arms use the same RadarSimPublic upstream commit, same trial, same contract and same 16 scenarios.

Arm A:

```text
frozen generic orchestrator
+ model-specific adapter
+ model-specific binding
```

Arm B:

```text
model-specific imports
+ parameterization
+ execution
+ semantic projection
embedded directly in upper orchestrator
```

Functional equivalence is controlled before burden comparison: all 16 outputs are byte-identical at the canonical interface.

### SM8. VU-01 corrected cross-run numerical comparison

VU-01a used exact SHA identity and failed on repeated cross-run numerical traces.

VU-01b comparator:

```text
META records             exact
S records                exact
T frame and track id     exact
T floating fields        normalized to 9 decimal places
```

The normalized representation is hashed. The `+1e-6 m` perturbation is deliberately larger than the representation threshold and must be rejected.

The nine-decimal rule is an evidence-representation criterion for this experiment, not a radar fidelity tolerance.

### SM9. LC-01 algorithm-change discrimination control

Substantive change:

```text
CV KF -> CA KF
Implementation_ID changes
```

Frozen invariants:

```text
RadarSimPublic repository commit
upper trial
capability contract
semantic profile
declared field mapping
```

Constructed sensitivity challenge:

```text
dt                     = 0.02 s
frames                 = 500
initial range          = 20 km
azimuth                = 20 deg
initial closing speed  = 150 m/s
closing acceleration   = 15 m/s^2
```

Purpose: demonstrate behavioral discriminability of the selected algorithms. It is not operational validation.

---

## Supplementary Figures

### Figure S1. BP-01 frozen behavior-preservation envelope

Recommended 2×2×2×2 matrix or small-multiples display. Each cell should report:

```text
track present = yes
wrapper/direct byte distance = 0
blocking Station warning = absent
```

Caption:

> **Figure S1. Frozen behavior-preservation envelope for OpenEaagles TWS.** Sixteen combinations of range, azimuth, RCS and motion produced behavior-bearing tracks and exact direct-versus-wrapper traces. The figure documents the bounded BP-01 envelope and is not evidence of universal behavior preservation.

### Figure S2. LC-01 maneuver discrimination

Recommended two panels:

- range over simulation time: truth / CV / CA
- range rate over simulation time: truth / CV / CA

Annotate only the frozen discrimination metrics:

```text
max |range_CA - range_CV|       = 109.0755 m
max |rate_CA - rate_CV|         = 67.6108 m/s
```

Caption:

> **Figure S2. Constructed accelerating-target challenge distinguishes the selected CV and CA tracking algorithms outside the original E2 envelope.** The challenge is a sensitivity/discrimination control, not operational validation and not evidence of general CA superiority.

### Figure S3. Evidence dependency graph

Recommended DAG:

```text
Implementation identity
Adapter / binding
Semantic mapping
Upper trial
Capability contract
Execution environment
        ↓
BP / MS / SP / EQ / EB / VU / LC claims
```

Use edge labels to show which configuration element can invalidate which evidence class.

---

## Supplementary Tables

### Table S1. Frozen experiment identities and provenance

| Experiment | Primary implementation(s) | Frozen upstream identity | Decision |
|---|---|---|---|
| BP-01 | OpenEaagles TWS/AirTrkMgr | `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192` | PASS |
| MS-01 | OpenEaagles + RadarSimPublic CV | RadarSimPublic `8b63f824a5744c1b3a3fca5e948fa7c59f897b17` | PASS |
| SP-01 | declared semantic mappings | same frozen TMSU contract/profile | PASS; RF relation UNKNOWN |
| EQ-01 | RadarSimPublic CV | existing BP/MS/SP evidence | PASS |
| EB-01 | TMSU vs direct integration | same RadarSimPublic commit | PASS |
| EA-01 | evidence ledger | frozen BP–EB reports | PASS |
| VU-01a | RadarSimPublic CV revision | model identity unchanged | FAIL strict-byte rule |
| VU-01b | RadarSimPublic CV revision | model identity unchanged | PASS typed carry-forward |
| LC-01 | RadarSimPublic CV -> CA | same repo commit; new Implementation_ID | PASS stop-rule test |

### Table S2. SP-01 semantic cases

| Case | Structural result | Semantic result |
|---|---|---|
| positive control | PASS | COMPATIBLE |
| range m -> km | PASS | INCOMPATIBLE |
| azimuth rad -> deg | PASS | INCOMPATIBLE |
| range-rate sign reversed | PASS | INCOMPATIBLE |
| ownship-relative -> ECEF | PASS | INCOMPATIBLE |
| simulation frame -> UTC epoch seconds | PASS | INCOMPATIBLE |
| RadarSimPublic RF concept relation | PASS | UNKNOWN |

### Table S3. EQ-01 intended-use cases

| Use case | Requested evidence/domain | Decision |
|---|---|---|
| bounded kinematic research use | kinematic observables within E2 domain | QUALIFIED_WITHIN_EVIDENCE |
| RF-performance decision use | RF concept + comparative validity evidence | UNKNOWN |
| 50 km use | outside executed evidence envelope | UNKNOWN |
| explicit range-unit conflict | semantic incompatibility | NOT_QUALIFIED |

### Table S4. EB-01 paired change-locality metrics

| Metric | TMSU route | Direct route |
|---|---:|---:|
| cases passed | 16/16 | 16/16 |
| canonical outputs matching paired arm | 16/16 | 16/16 |
| upper-orchestrator line churn | 0 | 160 |
| direct RadarSimPublic references in shared core | 0 | 9 |
| model-specific boundary artifacts | 2 | 0 |
| TMSU boundary physical lines | 224 | — |
| semantic-update reassessment scopes | 1/4 | 3/4 |

### Table S5. VU-01a/b comparator results

| Criterion | Result |
|---|---|
| VU-01a exact cross-run trace identity | 8/16; FAIL |
| largest observed differences | machine-precision scale |
| VU-01b normalized equivalence | 16/16 |
| +1e-6 m negative control | rejected |

### Table S6. LC-01 carry-forward states

| Evidence/state | After CV -> CA change |
|---|---|
| BP-01 | ACTIVE |
| SP-01 | ACTIVE |
| prior CV-specific MS/EQ/EB/VU evidence | HISTORICAL + STALE for CA |
| CA architectural execution | PASS_FRESH_EXECUTION |
| CA kinematic intended-use fitness | UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE |
| RF semantic relation | UNKNOWN |
| RF-performance intended use | UNKNOWN |

---

## Reproducibility map

Primary frozen sources:

```text
mre1/openeaagles/BEHAVIOR_PRESERVATION_EVIDENCE_v1.md
mre2/model_substitution/E2_MODEL_SUBSTITUTION_REAL_EVIDENCE_v2.md
research/SP01_SEMANTIC_PRECHECK_EVIDENCE_v1.md
research/EQ01_EVIDENCE_AWARE_QUALIFICATION_EVIDENCE_v1.md
research/EB01_ENGINEERING_BURDEN_EVIDENCE_v1.md
research/EA01_EVIDENCE_ACCUMULATION_EVIDENCE_v1.md
research/VU01_REAL_VERSION_CARRY_FORWARD_EVIDENCE_v1.md
research/LC01_ALGORITHM_CHANGE_CARRY_FORWARD_BOUNDARY_EVIDENCE_v1.md
tmsu/evidence/WP1_EVIDENCE_MANIFEST_v1.json
tmsu/evidence/EVIDENCE_LIFECYCLE_PROFILE_v1_2.md
```

The supporting package adds no new empirical result and does not change any frozen decision.