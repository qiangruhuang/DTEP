# SP-01 Semantic Precheck Ablation Evidence v1.0

Status: **Frozen result: PASS**

Research target: **RQ3 / H4**

Evidence run:

- DTEP branch: `sp01-semantic-precheck-ablation`
- GitHub Actions run: `33977174819`
- Tested DTEP head: `3555e1ef34f5b113b496adeaf2c5c7b65744015f`
- Evidence artifact: `sp01-semantic-precheck-evidence`
- Artifact ID: `9972652058`
- Artifact SHA-256: `b81c722ac469b141670f30461bb25fff0af275f582f2af6a2cd057b20c0a4c7c`

## 1. Claim under test

SP-01 asks whether a semantic precheck can detect bindings that remain structurally valid while attaching incompatible units, frames, time bases, sign conventions, or unresolved physical concepts to a frozen TMSU capability contract.

The ablation compares:

```text
Arm A: structural metadata validation only
Arm B: structural validation + semantic precheck
```

The frozen semantic dimensions are:

```text
Concept
Datatype
Unit
Reference frame
Time basis
Sign convention
```

All cases intentionally retain the same `Semantic_Profile_ID = tmsu.sensor.tws.track.semantic.v1`; simple identifier equality therefore cannot distinguish compatible from incompatible cases.

## 2. Frozen upper-trial assets

SP-01 did not modify the upper trial used in MS-01. The experiment asserted the previously frozen hashes before evaluating any semantic case:

```text
trial_spec.json
SHA-256 = af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf

orchestrator.py
SHA-256 = b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db

capability_contract.json
SHA-256 = f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

All three matched their frozen values.

## 3. Preregistered semantic cases

| Case | Structural-only expectation | Semantic expectation |
|---|---|---|
| positive control | PASS | COMPATIBLE |
| range `m -> km` | PASS | INCOMPATIBLE |
| azimuth `rad -> deg` | PASS | INCOMPATIBLE |
| range-rate sign reversed | PASS | INCOMPATIBLE |
| ownship-relative frame -> ECEF | PASS | INCOMPATIBLE |
| simulation-frame time basis -> UTC epoch seconds | PASS | INCOMPATIBLE |
| real RadarSimPublic RF quantity ambiguity | PASS | UNKNOWN |

The real ambiguity control uses the existing RadarSimPublic mapping in which the adapter supplies `Radar.snr(range, rcs)` to the canonical `average_signal_db` field. SP-01 does not assume that signal-to-noise ratio is semantically equivalent to the canonical `rf.track_average_signal` concept without explicit equivalence evidence.

## 4. Formal result

```text
SP-01 decision:                         PASS
all cases structural-only PASS:         7 / 7
injected semantic mismatches:           5
injected mismatches rejected:           5 / 5
semantic mismatch detection rate:       1.00
positive semantic control:              COMPATIBLE
real RadarSimPublic RF ambiguity:       UNKNOWN
same Semantic_Profile_ID across cases:  yes
```

Per-case decisions:

| Case | Structural | Semantic | Result |
|---|---|---|---|
| positive_control | PASS | COMPATIBLE | expected |
| neg_range_unit_m_to_km | PASS | INCOMPATIBLE | expected |
| neg_azimuth_unit_rad_to_deg | PASS | INCOMPATIBLE | expected |
| neg_range_rate_sign_reversed | PASS | INCOMPATIBLE | expected |
| neg_reference_frame_ownship_to_ecef | PASS | INCOMPATIBLE | expected |
| neg_time_basis_sim_to_utc | PASS | INCOMPATIBLE | expected |
| real_radarsimpublic_rf_quantity_ambiguity | PASS | UNKNOWN | expected |

The five injected negatives generated explicit reason codes:

```text
SEM-UNIT
SEM-SIGN
SEM-FRAME
SEM-TIME
```

The real ambiguity generated:

```text
SEM-CONCEPT-UNKNOWN:
average_signal_db:
rf.signal_to_noise_ratio ?= rf.track_average_signal
```

## 5. Interpretation

The experiment demonstrates a strict separation between structural and semantic interoperability in the frozen TWS contract:

```text
structural PASS != semantic COMPATIBLE
```

All five deliberately wrong mappings were invisible to Arm A but rejected by Arm B. This provides bounded positive support for H4: a semantic precheck can detect preregistered incompatibilities that structural/schema validation alone accepts.

The real RadarSimPublic ambiguity is the more important control. The precheck did not force the mapping into either `COMPATIBLE` or `INCOMPATIBLE`; it returned `UNKNOWN` because the evidence supplied does not establish that the two RF concepts are equivalent. `UNKNOWN` is explicitly non-compatible and therefore fail-safe.

## 6. Consequence for MS-01

SP-01 does **not** invalidate the earlier MS-01 result. MS-01 remains valid evidence of architectural/contract-level substitution:

```text
upper trial unchanged
binding-only implementation swap
both implementations execute behind one structural contract
```

However, SP-01 shows why MS-01 must not be interpreted as semantic-qualified substitution. A shared `Semantic_Profile_ID` is insufficient evidence of semantic equivalence.

Under TMSU Conformance Profile v1.1, the current OpenEaagles <-> RadarSimPublic result is therefore described as:

```text
MS-01 architectural substitution: PASS
SP-01 semantic status for the declared RF quantity mapping: UNKNOWN
Combined interpretation: architecturally substitutable; semantic qualification unresolved
```

## 7. Boundary of inference

SP-01 establishes the behavior of the precheck against declared semantic metadata and preregistered mutations. It does not automatically infer semantics from arbitrary source code, prove ontology completeness, establish numerical/fidelity equivalence between the two radar models, or resolve the physical relationship between OpenEaagles track signal and RadarSimPublic SNR.

Resolving a real `UNKNOWN` requires source documentation, transformation evidence, validation data, or a deliberate change to the shared capability contract; it must not be resolved by assertion alone.
