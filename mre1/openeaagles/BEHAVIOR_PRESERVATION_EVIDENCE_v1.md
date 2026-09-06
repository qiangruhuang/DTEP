# Behavior Preservation Evidence v1.0

## Status

**Frozen result: PASS**

This evidence package tests whether a transparent external-process TMSU boundary changes the observable behavior of the frozen OpenEaagles TWS legacy capability.

Evidence run:

- DTEP branch: `mre1-openeaagles-behavior-equivalence`
- GitHub Actions run: `33962481425`
- DTEP head: `35fc52ca6f5dd4c6ba2e3d3e532527e4396bb835`
- OpenEaagles: `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`
- OpenEaaglesExamples reference: `f90bac38bfbea168e746ce75fc46d641974c6076`
- JSBSim compatibility snapshot: `140068895adf1b8981b45cc5e17a16d82990806d`
- OpenEaagles source patches: **0**
- Execution: 50 Hz, 500 frames per case

## 1. Claim under test

For a declared observational domain and a frozen execution environment, wrapping the legacy TWS capability behind the TMSU external-process boundary shall not alter its native output trace.

For each test condition `i`:

```text
Y_baseline(i) == Y_TMSU(i)
```

The primary equivalence metric is exact byte identity of the complete native TrackManager trace:

```text
D_byte(Y_baseline(i), Y_TMSU(i)) = 0
```

This is an observational-equivalence claim within the tested envelope. It is not a claim of universal semantic identity for every internal OpenEaagles state or every possible scenario.

## 2. Headless legacy host correction

The earlier direct-`WorldModel` probe emitted:

```text
simulation::getStationImp(): ERROR, unable to locate the Station class!
```

The frozen scenario is now hosted by the native OpenEaagles `Station` lifecycle, and the probe advances the simulation through `Station::updateTC()` and `Station::updateData()`.

Result:

- canonical baseline stderr bytes: **0**
- canonical repeat-baseline stderr bytes: **0**
- missing-Station warning in canonical baseline: **false**
- missing-Station warning in all matrix baseline runs: **false**
- missing-Station warning in all TMSU-wrapped matrix runs: **false**

The correction did not modify OpenEaagles source code.

## 3. Canonical reproducibility and wrapper transparency

Canonical baseline run 1:

```text
SHA-256 = 2e789cb100c606fc4ae4fd9dcaad37934c2c87459fa542e553fbff5ccf709845
bytes   = 92567
```

Canonical baseline run 2:

```text
SHA-256 = 2e789cb100c606fc4ae4fd9dcaad37934c2c87459fa542e553fbff5ccf709845
bytes   = 92567
```

TMSU-wrapped run:

```text
SHA-256 = 2e789cb100c606fc4ae4fd9dcaad37934c2c87459fa542e553fbff5ccf709845
bytes   = 92567
```

Therefore:

```text
baseline_1 == baseline_2 == TMSU_wrapped
```

The wrapper applies **zero transformations** to the model stdout trace.

## 4. Observable behavior domain

The trace records the following native TrackManager outputs at every simulation frame:

| Observable | Meaning |
|---|---|
| `track_count` | number of current tracks |
| `track_id` | native track identifier |
| `range` | estimated target range |
| `range_rate` | estimated radial rate |
| `relative_azimuth` | relative azimuth |
| `elevation` | elevation |
| `quality` | native track quality |
| `average_signal` | RF average signal |

These outputs jointly cover detection/track existence, track identity, kinematic estimate, angular estimate, track quality, and RF signal behavior.

## 5. Behavior-equivalence envelope

A `2 x 2 x 2 x 2` full-factorial matrix was executed.

| Factor | Level 1 | Level 2 |
|---|---:|---:|
| target distance | 10 km | 20 km |
| target azimuth | 0 deg | 20 deg |
| target RCS | 1 m² | 4 m² |
| target motion | static | closing at 150 m/s |

This yields **16 distinct scenario conditions**.

For moving cases, the target is initialized on the same radial bearing and moves toward the ownship; static cases remain position-frozen. All other TWS configuration and simulation settings remain frozen.

## 6. Matrix results

Summary:

| Criterion | Result |
|---|---:|
| total cases | 16 |
| passed cases | **16 / 16** |
| cases with `N_track > 0` | **16 / 16** |
| cases with `D_byte = 0` | **16 / 16** |
| cases with Station warning | **0 / 16** |
| distinct baseline behavior traces | **16 / 16** |

All 16 cases produced a native track beginning at frame 51. Each case contained 449 track-bearing frames and 449 native track records over the 500-frame execution window. The 16 baseline traces had 16 different SHA-256 values, confirming that the matrix exercised distinct observable behaviors rather than repeatedly comparing the same trace.

### Per-condition equivalence

| Case | Distance | Azimuth | RCS | Motion | Track records | Baseline = TMSU | D_byte |
|---|---:|---:|---:|---|---:|---|---:|
| d10_a00_r01_static | 10 km | 0° | 1 | static | 449 | yes | 0 |
| d10_a00_r01_closing | 10 km | 0° | 1 | closing | 449 | yes | 0 |
| d10_a00_r04_static | 10 km | 0° | 4 | static | 449 | yes | 0 |
| d10_a00_r04_closing | 10 km | 0° | 4 | closing | 449 | yes | 0 |
| d10_a20_r01_static | 10 km | 20° | 1 | static | 449 | yes | 0 |
| d10_a20_r01_closing | 10 km | 20° | 1 | closing | 449 | yes | 0 |
| d10_a20_r04_static | 10 km | 20° | 4 | static | 449 | yes | 0 |
| d10_a20_r04_closing | 10 km | 20° | 4 | closing | 449 | yes | 0 |
| d20_a00_r01_static | 20 km | 0° | 1 | static | 449 | yes | 0 |
| d20_a00_r01_closing | 20 km | 0° | 1 | closing | 449 | yes | 0 |
| d20_a00_r04_static | 20 km | 0° | 4 | static | 449 | yes | 0 |
| d20_a00_r04_closing | 20 km | 0° | 4 | closing | 449 | yes | 0 |
| d20_a20_r01_static | 20 km | 20° | 1 | static | 449 | yes | 0 |
| d20_a20_r01_closing | 20 km | 20° | 1 | closing | 449 | yes | 0 |
| d20_a20_r04_static | 20 km | 20° | 4 | static | 449 | yes | 0 |
| d20_a20_r04_closing | 20 km | 20° | 4 | closing | 449 | yes | 0 |

## 7. Comparator negative control

A deliberately altered trace was compared with the canonical baseline.

```text
canonical SHA-256 = 2e789cb100c606fc4ae4fd9dcaad37934c2c87459fa542e553fbff5ccf709845
negative  SHA-256 = 60aea4028d4dc5f405fdf9b45156971fa14a9dc0f43001cb9e728a50cd8a278b
first differing byte offset = 392
```

The comparator correctly rejected the altered trace. Therefore the equivalence result is not caused by a comparator that accepts arbitrary outputs.

## 8. Frozen evidence statement

Within the following evidence envelope:

```text
Legacy capability: OpenEaagles TWS + AirTrkMgr
OpenEaagles commit: b3d7e74a9bf52934e13fd6a11f45dc9767ac9192
Host lifecycle: native headless Station
Execution rate: 50 Hz
Execution length: 500 frames
Distance: {10 km, 20 km}
Azimuth: {0 deg, 20 deg}
RCS: {1 m², 4 m²}
Motion: {static, closing 150 m/s}
Observable domain:
  {track_count, track_id, range, range_rate,
   relative_azimuth, elevation, quality, average_signal}
```

all 16 tested conditions satisfy:

```text
N_track > 0
D_byte(Y_baseline, Y_TMSU) = 0
```

with no OpenEaagles source modification and no missing-Station lifecycle warning.

Accordingly, **Behavior Preservation Evidence v1.0 supports the claim that the tested TMSU external-process packaging is behavior-transparent for the frozen OpenEaagles TWS capability within the declared observational-equivalence envelope.**

## 9. Research interpretation

This result upgrades the earlier single-scenario demonstration into an empirical behavior-preservation envelope. The evidence simultaneously establishes four properties required for a test-grade wrapper:

1. the legacy capability executes without modifying its source;
2. the corrected host lifecycle is valid and warning-free;
3. the wrapper does not alter native observable traces across distinct scenario conditions;
4. the comparator remains sensitive to deliberate behavioral change.

The result should be used as the first formal TMSU conformance gate, provisionally named **BP-01 Behavior Preservation**.

A candidate legacy-model adapter passes BP-01 only when its declared observational domain, scenario envelope, execution version, and comparison criterion are frozen and the matched baseline-versus-wrapper runs satisfy the predefined equivalence requirement.

For this deterministic OpenEaagles TWS case, the requirement is exact identity (`D_byte = 0`). Stochastic models should use a separately preregistered distributional-equivalence criterion rather than byte identity.

## 10. Boundary of inference

Behavior Preservation Evidence v1.0 does not establish:

- equivalence outside the tested distance/azimuth/RCS/motion envelope;
- equivalence for unobserved internal model states;
- equivalence after changing the OpenEaagles model implementation;
- semantic substitutability with a different radar model;
- accreditation for a specific operational intended use.

Those claims belong to subsequent semantic-compatibility, model-substitution, and trust/VV&A experiments.
