# E2 Model Substitution Evidence v2.0 — Real Heterogeneous Implementation

## Status

**Frozen result: PASS**

This evidence package replaces the DTEP-authored synthetic `Reference TWS` used in E2 v1 with an independently developed public radar/tracking implementation and reruns the same frozen MS-01 model-substitution test.

Evidence run:

- DTEP branch: `mre2-real-heterogeneous-tws`
- GitHub Actions run: `33971627414`
- Tested DTEP head: `620fad4c934303a4682e97af7d5a42006a7c44e8`
- Implementation A: `openeaagles.tws.airtrkmgr@b3d7e74`
- Implementation B: `radarsimpublic.radar-kf@8b63f82`
- OpenEaagles commit: `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`
- RadarSimPublic commit: `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`
- OpenEaagles source patches: **0**
- RadarSimPublic source patches: **0**

## 1. Research question

Does the same MS-01 substitution result continue to hold when the second implementation is no longer a DTEP-authored reference model, but instead comes from an independent public software/model codebase with a different architecture and runtime?

The frozen MS-01 claim remains:

```text
Frozen Trial Specification
+ Frozen Orchestrator
+ Frozen Capability Contract
+ Frozen Semantic Profile
+ Binding A or Binding B
-> Successful execution without editing the upper trial
```

MS-01 evaluates architectural and contract-level substitutability. It does not require the two implementations to produce identical behavior.

## 2. Real heterogeneous second implementation

Implementation B is drawn from the public repository `Murmur-ops/RadarSimPublic` at frozen commit:

```text
8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

The TMSU binding executes computational components directly from that frozen upstream checkout:

```text
src.radar.Radar
src.radar.RadarParameters
src.tracking.kalman_filters.initialize_constant_velocity_filter
src.tracking.tracker_base.Track
src.tracking.tracker_base.Measurement
```

The DTEP adapter does not copy or reimplement the upstream radar equation, SNR calculation, Kalman filter, or track-quality update. It performs scenario binding and projection of upstream outputs into the already-frozen TMSU contract.

Frozen upstream component hashes:

```text
radar.py            88e3be7ea641fe9ea297c9705907210d783b7d1e51bbe044bab5a610eaa52480
kalman_filters.py   69e068168f1aae440f445ff877124a3d004c0e26dc385fd3eec55b6ef8754684
tracker_base.py     ae4e2b26d2c851f1e50e5f299ab498900d28d4119efd3f85646b4554f4cfc29f
```

Implementation A remains the frozen OpenEaagles TWS + AirTrkMgr legacy capability previously qualified by BP-01.

## 3. Frozen upper trial remained unchanged

The real heterogeneous rerun reused the exact E2 v1 upper-trial artifacts:

```text
trial_spec.json
SHA-256 = af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf

orchestrator.py
SHA-256 = b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db

capability_contract.json
SHA-256 = f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

Therefore:

```text
upper_trial_artifacts_modified_for_swap = 0
binding_selections_changed               = 1
```

The selected binding changed from:

```text
bindings/openeaagles_tws.json
```

to:

```text
bindings/radarsimpublic_tws.json
```

No new broker, registry, API, orchestration mechanism, or trial-specific branch was added to make the second implementation pass.

## 4. Shared capability and semantic contract

Both implementations declare:

```text
Capability_ID:        sensor.tws.track
Contract_ID:          tmsu.sensor.tws.track.v1
Semantic_Profile_ID:  tmsu.sensor.tws.track.semantic.v1
```

The unchanged canonical observable contract is:

```text
META  dt_s  frames  capability_id  implementation_id
S     frame track_count
T     frame track_id range_m range_rate_mps relative_azimuth_rad
      elevation_rad quality average_signal_db
```

For the RadarSimPublic binding, the semantic projection is frozen as:

| Canonical field | Upstream source / mapping |
|---|---|
| `range_m` | norm of the upstream Kalman-filter position state |
| `range_rate_mps` | radial projection of the upstream Kalman-filter velocity, positive for increasing range |
| `relative_azimuth_rad` | `atan2` of the upstream Kalman position state |
| `elevation_rad` | `0` in the frozen planar E2 trial |
| `quality` | upstream `Track.track_score`, constrained to the canonical `[0,1]` domain |
| `average_signal_db` | upstream `Radar.snr(range, rcs)` in dB |

The mapping of the last field is intentional: the frozen OpenEaagles evidence interface records the RF track signal quantity passed as `snDbl`, while RadarSimPublic exposes an RF SNR calculation in dB. MS-01 tests contract/semantic compatibility, not numerical equality between these different implementations.

## 5. Frozen case matrix

The exact E2 v1 `2 x 2 x 2 x 2` case matrix was reused:

| Factor | Level 1 | Level 2 |
|---|---:|---:|
| target distance | 10 km | 20 km |
| target azimuth | 0 deg | 20 deg |
| target RCS | 1 m² | 4 m² |
| target motion | static | closing at 150 m/s |

Each implementation therefore executed 16 matched cases under the same upper-trial specification.

## 6. Execution result

| Criterion | OpenEaagles TWS | RadarSimPublic Radar/KF |
|---|---:|---:|
| cases attempted | 16 | 16 |
| cases passed | **16 / 16** | **16 / 16** |
| outputs passing frozen canonical validator | **16 / 16** | **16 / 16** |
| source patches | **0** | **0** |

The unchanged MS-01 evaluator returned:

```text
case_count_each                       = 16
decision                              = PASS
different_trace_cases                 = 16
upper_trial_artifacts_modified_for_swap = 0
binding_selections_changed            = 1
```

All preregistered E2/MS-01 predicates evaluated `true`.

## 7. Distinct-implementation evidence

The two adapters are distinct:

```text
OpenEaagles adapter SHA-256
5b6201ff21bdb64cde58bba8ee9c08013dedb9ebea82f691e404e23204d0b9af

RadarSimPublic adapter SHA-256
4148c2a57f35d655678e32d070ed15a8142e0c0f2683e21ed2a17cc2f872e5ab
```

The two implementation bindings are also distinct:

```text
OpenEaagles binding SHA-256
9fdbfd592afa22683c7bce970bac3997457781b39ff38bab22f9edc70175ce69

RadarSimPublic binding SHA-256
22290803bddf9d0ac379924b61444fd0bc3fdb46e9a95c3840bcae07e6ef01ad
```

Across all 16 matched scenarios:

```text
identical cross-implementation canonical traces = 0 / 16
different cross-implementation canonical traces = 16 / 16
```

This is expected and useful. MS-01 requires different implementations to remain executable behind one frozen upper contract; it does not require them to be behaviorally identical.

## 8. MS-01 decision

All frozen MS-01 predicates passed:

| Predicate | Result |
|---|---|
| MS01-P1 identical frozen upper trial specification | PASS |
| MS01-P2 identical frozen orchestrator | PASS |
| MS01-P3 same Capability_ID and Contract_ID | PASS |
| MS01-P4 same Semantic_Profile_ID | PASS |
| MS01-P5 distinct Implementation_IDs with distinct provenance | PASS |
| MS01-P6 same frozen case set | PASS |
| MS01-P7 every required case executes for every implementation | PASS |
| MS01-P8 every output passes the same canonical contract validator | PASS |
| MS01-P9 substitution isolated to binding selection | PASS |
| MS01-P10 provenance hashes sufficient to reproduce decision | PASS |

Overall decision:

```text
MS-01 = PASS
```

## 9. Strengthened research claim

The v1 synthetic-reference result established that the substitution mechanism itself was executable. E2 v2 strengthens that evidence by replacing the DTEP-authored second implementation with independently developed public radar/tracking software.

The supported claim is therefore:

> Within the frozen E2 trial envelope, a BP-01-qualified OpenEaagles TWS legacy implementation and an independently developed RadarSimPublic radar/Kalman implementation can be selected as two distinct implementations of `sensor.tws.track` by changing only the TMSU binding. The trial specification, orchestrator, capability contract, and semantic profile remain unchanged, and all 16 cases for both implementations execute successfully and satisfy the same canonical output validator.

This is empirical evidence of **real software/model-code heterogeneity at the architectural and contract-substitution level**.

## 10. Boundary of inference

This evidence does **not** establish:

- behavioral equivalence between OpenEaagles TWS and RadarSimPublic;
- equal radar fidelity, tracking accuracy, or predictive validity;
- equivalence of every internal radar-processing stage;
- trial-specific fitness-for-use of RadarSimPublic for an acquisition or operational decision;
- VV&A or accreditation of RadarSimPublic;
- universal substitutability outside the frozen E2 contract and scenario envelope.

The RadarSimPublic adapter uses its real upstream radar/SNR, Kalman-filter, and track-quality code, but the E2 scenario binding supplies the canonical scenario state as measurement input to the tracking portion. This is appropriate for testing architectural substitutability, but it is not a comparative sensor-fidelity experiment.

## 11. Reproducibility and licensing note

The evidence workflow checks out RadarSimPublic from its immutable commit and records hashes of the exact upstream source components used. No RadarSimPublic source file is copied into the DTEP evidence package and no upstream source patch is applied.

The upstream README describes the project as MIT-licensed, while the frozen repository root at the tested commit does not contain a separate `LICENSE` file. The evidence therefore records the repository and commit provenance without redistributing upstream source code.

## 12. Evidence identity

```text
Evidence_Set_ID:
ms01.tws.openeaagles-radarsimpublic.2026-09-05.v2

CI Run:
33971627414

Tested DTEP head:
620fad4c934303a4682e97af7d5a42006a7c44e8

Uploaded artifact:
mre2-real-heterogeneous-model-substitution-evidence

Artifact ID:
9971118509

Artifact ZIP SHA-256:
7e4f421b04bf7dd9ca40964657ec7dc789fedcff1a66d85cefb9b6f2c6183bb1
```

This v2 evidence supersedes the synthetic Reference-TWS evidence as the **preferred empirical reference for MS-01**, while the v1 evidence remains retained as the mechanism-development record.
