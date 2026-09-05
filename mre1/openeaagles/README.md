# MRE-1.1 — OpenEaagles TWS behavior-preservation test

This experiment tests a narrow, falsifiable claim:

> Wrapping a fixed OpenEaagles TWS legacy executable behind the TMSU process boundary does not change the legacy model behavior observable at the native track interface for the frozen test scenario.

It does **not** claim global equivalence for every OpenEaagles scenario or every internal state.

## Frozen upstream

- OpenEaagles: `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192` (`v17.06a`)
- OpenEaaglesExamples reference: `f90bac38bfbea168e746ce75fc46d641974c6076`
- JSBSim compatibility snapshot: `18c5b81d3f602099e1bf2a80aed379f5e80d9569` (2017-05-30)

No OpenEaagles `Radar`, `Tws`, `TrackManager`, `Track`, `Antenna`, `Emission`, or RF propagation source is patched by this experiment.

## Observable behavior vector

The deterministic probe reads the native `AirTrkMgr` after every 50 Hz simulation frame and emits, sorted by track ID:

`frame, track_count, track_id, range, range_rate, relative_azimuth, elevation, quality, average_RF_signal`

This is intentionally upstream of the TMSU canonical boolean `detection` output. The equivalence decision therefore does not depend on the adapter's semantic transformation.

## Paired execution

A. **Baseline** — execute the probe binary directly.

B. **TMSU wrapped** — the Python wrapper launches the exact same binary with the exact same EDL and frame count, captures stdout byte-for-byte, and performs zero transformation on the native trace.

The workflow records SHA-256 hashes of the executable, EDL, and outputs.

## Gates

- G2a — baseline run 1 equals baseline run 2 exactly.
- G2b — direct baseline equals TMSU-wrapped output exactly.
- G2c — the trace contains at least one native track record; an empty/no-op equivalence is rejected.
- G2d — a deliberately mutated native track trace must be rejected by the comparator.

Passing all four gates supports behavior preservation **within the observed interface and the frozen scenario**.
