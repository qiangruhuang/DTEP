# E2 Model Substitution Evidence v1.0

## Status

**Frozen result: PASS**

This evidence package tests whether a frozen upper-level trial design can replace one implementation of `sensor.tws.track` with a second implementation by changing only the TMSU capability binding.

Evidence run:

- DTEP branch: `mre2-model-substitution`
- GitHub Actions run: `33968357505`
- DTEP head: `f2b6e13acf42aa09ceea24ea266d7706ba6bd09c`
- OpenEaagles: `b3d7e74a9bf52934e13fd6a11f45dc9767ac9192`
- JSBSim compatibility snapshot: `140068895adf1b8981b45cc5e17a16d82990806d`
- OpenEaagles source patches: **0**
- Artifact ID: `9970171062`
- Artifact digest: `sha256:fa62004a57b54692569c1471d3cd5c569d22c865c9ac1993d08f2681f5fcd2c1`

## 1. Claim under test

The upper trial artifacts are frozen:

```text
trial_spec.json
capability_contract.json
orchestrator.py
```

The model-selection change is limited to:

```text
bindings/openeaagles_tws.json
            ->
bindings/reference_tws.json
```

The two implementations are:

```text
A: openeaagles.tws.airtrkmgr@b3d7e74
B: dtep.reference_tws@1.0.0
```

Implementation B is an independent deterministic Native-C analytic reference tracker. It is a research instrument for testing the substitution mechanism and is not an accredited operational radar model.

## 2. Frozen trial and contract

Both implementations use the same:

```text
Capability_ID: sensor.tws.track
Contract_ID: tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
Rate: 50 Hz
Length: 500 frames
```

The frozen 2x2x2x2 scenario matrix is:

| Factor | Level 1 | Level 2 |
|---|---:|---:|
| target distance | 10 km | 20 km |
| target azimuth | 0 deg | 20 deg |
| target RCS | 1 m² | 4 m² |
| target motion | static | closing at 150 m/s |

This yields 16 cases for each implementation.

The canonical output contract is:

```text
META  dt_s  frames  capability_id  implementation_id
S     frame track_count
T     frame track_id range_m range_rate_mps relative_azimuth_rad
      elevation_rad quality average_signal_db
```

## 3. Upper-trial invariance

Frozen hashes:

```text
trial_spec_sha256  = af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf
orchestrator_sha256 = b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db
contract_sha256     = f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

These hashes are identical in the A and B executions.

Measured change isolation:

```text
upper_trial_artifacts_modified_for_swap = 0
binding_selections_changed               = 1
```

Therefore the substitution did not require edits to the frozen trial design, canonical capability contract or upper orchestration logic.

## 4. Execution and conformance results

| Criterion | OpenEaagles TWS | Reference TWS |
|---|---:|---:|
| cases executed | 16 / 16 | 16 / 16 |
| canonical-contract valid | 16 / 16 | 16 / 16 |
| first track frame | 51 | 51 |
| track-bearing records per case | 449 | 449 |
| adapter stderr bytes per case | 0 | 0 |

All cases in both implementations completed successfully.

## 5. Distinct-implementation control

The implementation identities and adapter digests are distinct:

```text
OpenEaagles adapter SHA-256 = 5b6201ff21bdb64cde58bba8ee9c08013dedb9ebea82f691e404e23204d0b9af
Reference adapter SHA-256   = ed27297fc4cb848de387b10ec65f8c74400955cd8fd30bd90ea3cd412e8006ff
```

Across the 16 matched cases:

```text
identical canonical trace cases = 0 / 16
different canonical trace cases = 16 / 16
```

This confirms that the second binding is not an alias of the OpenEaagles backend. Behavioral identity is not an E2 requirement; different model behavior is expected because the implementations are different.

## 6. E2 predicates

All preregistered predicates passed:

| Predicate | Result |
|---|---|
| E2-P1 same trial specification | PASS |
| E2-P2 same orchestrator | PASS |
| E2-P3 same capability contract | PASS |
| E2-P4 same semantic profile | PASS |
| E2-P5 distinct Implementation_IDs | PASS |
| E2-P6 distinct adapter implementations | PASS |
| E2-P7 same case set | PASS |
| E2-P8 all OpenEaagles cases execute | PASS |
| E2-P9 all Reference-TWS cases execute | PASS |
| E2-P10 OpenEaagles outputs contract-valid | PASS |
| E2-P11 Reference-TWS outputs contract-valid | PASS |
| E2-P12 at least one cross-implementation behavioral difference | PASS |
| E2-P13 binding selection is the only trial invocation change | PASS |

Overall E2 decision: **PASS**.

## 7. Research interpretation

E2 provides empirical evidence for architectural and contract-level model substitutability:

```text
Frozen Trial Design
      +
Frozen Orchestrator
      +
Frozen Capability/Semantic Contract
      +
Implementation Binding A or B
      ->
Successful execution under the same upper trial logic
```

The result supports the following constrained claim:

> Within the frozen TWS trial envelope, a BP-01-qualified OpenEaagles legacy implementation and an independent Native-C implementation can be selected through different TMSU bindings without modifying the upper trial specification, capability contract or orchestration logic, while both remain executable and conformant to the same declared semantic interface.

## 8. Boundary of inference

E2 does not establish:

- behavioral equivalence between OpenEaagles TWS and the reference TWS;
- equal model fidelity or predictive accuracy;
- operational fitness-for-use of the reference TWS;
- authoritative accreditation of either implementation for a specific acquisition decision;
- substitutability outside the declared capability contract or tested trial envelope.

Model substitution therefore remains separate from model validity and trial-specific fitness-for-use.

## 9. Candidate conformance gate

The E2 result supports freezing a second TMSU conformance gate:

**MS-01 — Model Substitution**

MS-01 is satisfied when two distinct implementations of the same `Capability_ID` can execute a frozen upper trial through the same `Contract_ID` and `Semantic_Profile_ID`, with no modification to the frozen trial specification or orchestrator and with the implementation change isolated to the binding selection.

Behavioral equality between the substituted implementations is not required by MS-01 unless separately imposed by the trial's fitness-for-use criteria.
