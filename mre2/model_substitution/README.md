# E2 — Model Substitution v1.0

E2 tests the next claim after BP-01:

> A frozen upper-level trial design can substitute a second implementation of the same declared capability by changing only the TMSU binding, while the trial specification, orchestrator, capability contract and semantic profile remain unchanged.

## Implementations

A. `openeaagles.tws.airtrkmgr@b3d7e74` — the legacy OpenEaagles TWS/AirTrkMgr implementation already supported by BP-01.

B. `dtep.reference_tws@1.0.0` — an independent deterministic Native-C analytic reference tracker implemented in Python. It is deliberately simple and exists to test the substitution mechanism; it is **not** an accredited operational radar model.

The two implementations are not expected to be behaviorally identical. E2 is a substitutability experiment, not another behavior-equivalence test.

## Frozen upper trial artifacts

The same artifacts are used for A and B:

- `trial_spec.json`
- `capability_contract.json`
- `orchestrator.py`

The orchestrator is binding-neutral. It reads one binding file and invokes the declared adapter through the same adapter CLI. The workflow executes the same 16-case 2x2x2x2 matrix used by BP-01.

The only run-selection change is:

```text
bindings/openeaagles_tws.json
            ->
bindings/reference_tws.json
```

## Canonical capability contract

Both implementations expose:

```text
META  dt_s  frames  capability_id  implementation_id
S     frame track_count
T     frame track_id range_m range_rate_mps relative_azimuth_rad
      elevation_rad quality average_signal_db
```

Semantics are frozen as:

- range: meters;
- range rate: m/s, positive for increasing range;
- azimuth/elevation: radians, ownship-relative;
- quality: normalized [0,1];
- average signal: dB.

For OpenEaagles, these units follow the frozen upstream `Track.hpp`; the adapter copies each native S/T numeric payload verbatim and only normalizes the metadata header into the canonical contract.

## E2 predicates

E2 passes only if:

1. the trial-spec hash is identical for both runs;
2. the orchestrator hash is identical for both runs;
3. the capability and contract IDs are identical;
4. the semantic-profile ID is identical;
5. the implementation and adapter identities are genuinely distinct;
6. both implementations execute all 16 cases;
7. both outputs pass the same canonical contract validator;
8. the case set is identical;
9. at least one canonical trace differs across implementations, demonstrating that the second binding is not an alias of the first backend;
10. no upper trial artifact is edited to perform the swap.

The provisional gate name is **MS-01 Model Substitution**. It should be frozen into the TMSU Conformance Profile only after E2 produces a passing evidence bundle.
