# Supplementary Methods v1.0

Status: **Submission supplement; WP1 evidence locked**

This supplement expands implementation and evidence-management details that are intentionally compressed in the main manuscript. It introduces no new mechanism experiment and does not change any frozen decision.

## S1. Study boundary and terminology

The study evaluates a SAL-aligned Test Model Service Unit (TMSU) as a **logical packaging/conformance unit**, not as a new simulation runtime, broker, transport, or replacement for HLA, DIS, DDS, FMI, or native model interfaces. The trial-facing capability and the concrete implementation are explicitly separated:

```text
Capability_ID != Implementation_ID
```

The common capability used in WP1 was:

```text
Capability_ID:       sensor.tws.track
Contract_ID:         tmsu.sensor.tws.track.v1
Semantic_Profile_ID: tmsu.sensor.tws.track.semantic.v1
```

The principal implementations were:

```text
openeaagles.tws.airtrkmgr@b3d7e74
radarsimpublic.radar-kf@8b63f82
radarsimpublic.radar-ca-kf@8b63f82
```

The term `qualification` in this paper always means **qualification within the declared research evidence and intended-use screen**. It does not mean authoritative accreditation.

## S2. Evidence record and lifecycle representation

Each evidence item is conceptually represented as:

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

Current qualification is reconstructed as:

```text
Q(I,U,C | E_t)
  ∈ {QUALIFIED_WITHIN_EVIDENCE,
     UNKNOWN,
     NOT_QUALIFIED}
```

Historical evidence is append-only at the logical level:

```text
E_(t+1) = E_t ∪ DeltaE
```

A prior evidence record remains directly applicable only when its declared dependencies do not intersect the configuration change:

```text
Dep(E) ∩ Delta(C) = ∅
```

Otherwise it remains historically retained but becomes stale for the changed configuration until an allowed delta reassessment or fresh evidence restores the affected claim.

Lifecycle status and qualification status are intentionally distinct. For example, a record can be historically retained but stale for the current implementation; an `UNKNOWN` can remain current and unresolved even while other evidence is added.

## S3. BP-01 behavior-preservation protocol

BP-01 evaluated transparent M1 wrapping of a real legacy OpenEaagles TWS + AirTrkMgr capability at frozen upstream commit:

```text
b3d7e74a9bf52934e13fd6a11f45dc9767ac9192
```

A native headless probe observed:

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

The wrapper executed the same native probe and applied no transformation to the native evidence trace.

The 16-case matrix was the full factorial combination of:

| Factor | Levels |
|---|---|
| range | 10, 20 km |
| azimuth | 0°, 20° |
| RCS | 1, 4 m² |
| motion | static, closing at 150 m/s |

For the frozen deterministic environment, behavior preservation required exact matched trace identity. A deliberately altered trace was used as a comparator negative control. This criterion is specific to BP-01's frozen native/wrapped evidence path and is not generalized to all numerical cross-run comparisons.

## S4. MS-01 heterogeneous-substitution protocol

MS-01 used the same frozen upper trial for OpenEaagles and the independent public RadarSimPublic implementation at commit:

```text
8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

The RadarSimPublic adapter invoked upstream code for:

- radar/SNR calculation;
- Kalman-filter tracking;
- track-quality handling.

No upstream RadarSimPublic source patch was required.

The upper trial specification, orchestrator, capability contract, semantic-profile identifier, and 16-case scenario set remained fixed. Substitution changed implementation binding only. The shared canonical trace contained:

```text
META dt_s frames capability_id implementation_id
S    frame track_count
T    frame track_id range_m range_rate_mps relative_azimuth_rad
     elevation_rad quality average_signal_db
```

MS-01 evaluated architectural/contract substitutability, not equality of model behavior or fidelity.

## S5. SP-01 semantic precheck

SP-01 compared structural-only validation with structural validation plus semantic checking over six declared dimensions:

```text
concept
datatype
unit
reference frame
time basis
sign convention
```

All seven cases retained the same `Semantic_Profile_ID`, so simple identifier equality could not distinguish compatible from incompatible declarations.

The five injected semantic mismatches changed:

1. range unit `m → km`;
2. azimuth unit `rad → deg`;
3. range-rate sign convention;
4. reference frame `ownship_relative → earth_centered_ecef`;
5. time basis `simulation_frame → utc_epoch_seconds`.

A positive control preserved the declarations. A real ambiguity control retained the RadarSimPublic SNR quantity mapped to the canonical `average_signal_db` field. Because no evidence demonstrated physical concept equivalence with the canonical track-average-signal concept, the required decision was `UNKNOWN`, not forced compatibility.

## S6. EQ-01 intended-use evidence screen

Four use cases were preregistered:

| Case | Requested use | Expected decision |
|---|---|---|
| U1 | bounded kinematic research/conformance use within executed envelope | `QUALIFIED_WITHIN_EVIDENCE` |
| U2 | RF-performance use requiring unresolved RF quantity + comparative validity | `UNKNOWN` |
| U3 | 50 km use outside executed evidence domain | `UNKNOWN` |
| U4 | explicit range-unit conflict | `NOT_QUALIFIED` |

The screen does not issue accreditation. Its purpose is to prevent a single global trust label from being inherited across different intended uses.

## S7. EB-01 paired change-locality benchmark

EB-01 compared two implementations of the same RadarSimPublic onboarding task:

- **TMSU path:** generic upper orchestrator unchanged; model-specific knowledge isolated to adapter + binding.
- **Direct path:** RadarSimPublic-specific imports, parameterization, execution, and projection embedded directly in the upper orchestrator.

Both arms executed the same 16 cases and had to produce byte-identical canonical outputs before change-surface metrics were interpreted.

Measured quantities were:

- upper-orchestrator line churn;
- direct model references in shared core;
- model-specific boundary artifacts;
- reassessment scope after a semantic-mapping-only update.

Total source lines were not used as an engineer-time proxy.

## S8. EA-01 cumulative evidence replay

EA-01 registered BP-01 through EB-01 in a closed, acyclic evidence graph and replayed sequential evidence accumulation:

```text
1 → 2 → 3 → 4 → 5 records
```

Controlled change cases included display metadata, semantic mapping, adapter, upper trial, and capability contract. The experiment separately tracked:

- historical retention;
- current applicability;
- current intended-use decision.

The RF `UNKNOWN` was queried after subsequent evidence additions to verify that unrelated PASS decisions did not silently resolve it.

## S9. VU-01a/b comparator correction and carry-forward

VU-01 revised adapter/binding provenance while holding model identity, contract, semantic mapping, and upper trial fixed.

### S9.1 VU-01a

The initial comparator required exact cross-run SHA-256 identity of floating-point traces. A final-head rerun produced exact equality in only 8/16 cases. The observed moving-target differences were at machine-precision scale. The failure was retained as a methodological result.

### S9.2 VU-01b

The corrected rule used:

```text
META records: exact
S records: exact
T frame / track ID: exact
T floating fields: normalized to 9 decimal places
```

The normalized representation was then hashed. A deliberate `+1e-6 m` perturbation had to be rejected.

The nine-decimal rule is a representation-comparison criterion for this carry-forward experiment; it is not a radar-validity tolerance.

## S10. LC-01 inheritance stop-rule test

LC-01 changed the selected RadarSimPublic tracker from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter and changed `Implementation_ID` accordingly. The repository commit, upper trial, capability contract, and declared semantic mapping remained fixed.

Both configurations executed the old 16-case E2 envelope. Their canonical traces were compared using the frozen VU numerical representation criterion.

A separate maneuvering-target discrimination challenge used:

```text
dt = 0.02 s
frames = 500
initial range = 20 km
azimuth = 20°
initial closing speed = 150 m/s
closing acceleration = 15 m/s²
```

The challenge was a sensitivity control designed to demonstrate that the selected algorithms were behaviorally distinguishable. It was not operational validation of either tracker.

The lifecycle decision was defined by change class and evidence dependencies, not solely by whether the old regression envelope passed. A model-algorithm / implementation-identity change therefore prohibited automatic inheritance of implementation-specific intended-use qualification while leaving unrelated evidence eligible for reuse.

## S11. Reproducibility and provenance

Frozen evidence reports record immutable repository commits, workflow run identifiers, artifact digests, source hashes where relevant, case counts, decision predicates, and explicit inference boundaries. The manuscript-level claim matrix prohibits claims beyond those frozen evidence sets.

The current paper uses the following evidence chain:

```text
BP-01 → MS-01 → SP-01 → EQ-01 → EB-01 → EA-01 → VU-01a/b → LC-01
```

No result in the main manuscript depends on an unfrozen exploratory run.

## S12. Explicit non-claims

The study does not establish:

- universal plug-and-play interchangeability;
- equal fidelity between OpenEaagles and RadarSimPublic;
- automatic semantic inference from source code;
- authoritative VV&A/accreditation;
- operational superiority of CA over CV tracking;
- lower total code volume;
- measured engineer-hour or calendar-time savings;
- enterprise-scale evidence-store performance;
- universal optimality of the current evidence dependency taxonomy.
