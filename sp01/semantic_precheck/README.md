# SP-01 Semantic Precheck Ablation

Status: preregistered minimal experiment for **RQ3 / H4**.

## Purpose

SP-01 tests whether a semantic precheck can detect bindings that remain structurally valid but attach incompatible meanings to a frozen TMSU capability contract.

No third model, broker, transport, API, registry, or orchestration mechanism is introduced. The experiment reuses the frozen `sensor.tws.track` contract and the upper-trial artifacts already used by MS-01.

## Ablation

- **Arm A — structural-only:** validate required metadata fields/types and field set, but ignore semantic values.
- **Arm B — semantic precheck:** additionally compare concept, datatype, unit, reference frame, time basis, and sign convention against the frozen canonical semantic profile.

All ablation cases intentionally retain the same `Semantic_Profile_ID` so that simple identifier equality cannot distinguish the cases.

## Preregistered cases

1. positive semantic control -> `COMPATIBLE`;
2. range unit `m -> km` -> `INCOMPATIBLE`;
3. azimuth unit `rad -> deg` -> `INCOMPATIBLE`;
4. range-rate sign convention reversed -> `INCOMPATIBLE`;
5. ownship-relative frame -> ECEF -> `INCOMPATIBLE`;
6. simulation-frame time basis -> UTC epoch seconds -> `INCOMPATIBLE`;
7. real RadarSimPublic RF quantity ambiguity (`Radar.snr` vs canonical `rf.track_average_signal`) -> `UNKNOWN` unless equivalence evidence is supplied.

Every case must pass the structural-only arm. Therefore the five injected negatives are deliberately invisible to structure-only validation.

## Decision rule

SP-01 passes only if all of the following hold:

```text
frozen upper-trial hashes unchanged
all 7 cases structural PASS
positive control semantic COMPATIBLE
5/5 injected semantic mismatches INCOMPATIBLE
real RF ambiguity UNKNOWN
same Semantic_Profile_ID retained across all cases
```

Any injected mismatch classified `COMPATIBLE` causes `SP-01 = FAIL`.

`UNKNOWN` is fail-safe: it is explicitly not treated as compatible.

## Inference boundary

SP-01 evaluates whether declared semantic differences are caught before execution. It does not establish that a declared `equivalent` concept mapping is physically true. Such an assertion still requires source documentation, validation evidence, or an explicit transformation/equivalence justification.
