# Figure Blueprint v2.5

Status: **Production-frozen after WP-FMI, WP-BL and WP-ENV**

The five main figures retain the original research line. FMI is treated as an execution/model-delivery substrate, BL-01 supplies the stronger software-engineering baseline, and ENV-01 closes the typed execution-environment lifecycle rule. No figure implies a second full capability validation.

## Figure 1 — Capability boundary over heterogeneous execution mechanisms

### Question
How is heterogeneous model unification organized, and where does FMI sit?

### Composition

```text
Upper trial / scenario logic
        ↓
Capability_ID + Contract_ID + Semantic_Profile_ID
        ↓
SAL-aligned TMSU capability/conformance boundary
        ↓
implementation binding / execution profile
   ↙            ↓             ↘
OpenEaagles   RadarSimPublic   FMI 3 Co-Simulation
legacy C++    Python/NumPy     Reference FMU micro-demo
```

### Required annotations
- `Capability_ID != Implementation_ID`
- BP-01: 16/16 wrapper preservation
- MS-01: 16/16 + 16/16 under frozen upper trial
- FMI-01: executable FMI 3.0 Co-Simulation path
- `TMSU is not runtime middleware`
- `FMI/HLA/DIS are not replaced by TMSU`

### Boundary
The FMI branch is a transport/conformance micro-demonstration (`platform.motion.vertical_state`), not broad second-capability fidelity validation.

## Figure 2 — FMI metadata versus T&E governance

### Question
Which information is supplied by FMI, and which information remains T&E-specific?

### Left: machine-readable FMI

```text
modelDescription.xml
FMI version / interface type
variables / types / units / causality
h : Position [m]
v : Velocity [m/s]
```

### Mapping

```text
h -> height_m
v -> vertical_velocity_mps
```

### Right: TMSU/T&E sidecar increment

```text
Capability_ID
program contract identity
concept identity
reference frame / sign convention
intended-use boundary
qualification/evidence state
typed evidence dependencies / provenance policy
```

### Empirical callouts
- FMI 3.0 Co-Simulation validation/execution PASS
- 101 output rows, 0–1 s
- M3 Native criteria: 4/4 PASS
- no model-specific procedural adapter in the frozen micro-demo

### Key message
`standard execution metadata + T&E-specific governance`, not competing middleware layers.

## Figure 3 — Three-arm baseline ablation

### Question
What remains after comparing SAL/TMSU with a competent plain software façade?

### Arms

```text
A Direct coupling
  concrete-model API in upper core

B Plain façade
  model API isolated at boundary
  no T&E governance

C SAL/TMSU
  model API isolated at boundary
  semantic/intended-use/evidence governance attached
```

### Quantitative anchors
- all three arms: 16/16 matched canonical traces byte-identical
- upper-core executable model refs: direct 9; façade 0; SAL/TMSU 0
- boundary nonblank lines: façade 71; SAL/TMSU 199 (descriptive only)

### Governance matrix
Rows: semantic profile, explicit `UNKNOWN`, intended-use gate, typed evidence dependencies, lifecycle rule. Only SAL/TMSU is positive for all five.

### Key message
A competent façade already provides software isolation. The tested incremental TMSU contribution is T&E governance attached to the capability boundary.

## Figure 4 — Cumulative evidence with typed selective staleness

### Question
Can evidence history accumulate while current applicability changes selectively?

### Timeline

```text
baseline evidence
   → provenance-only revision (VU)
   → execution-runtime revision (ENV)
   → algorithm / Implementation_ID revision (LC)
```

### Upper lane
Append-only historical evidence; no evidence node disappears.

### Lower lane
Current states recomputed by dependency intersection:

```text
ACTIVE
STALE
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE
UNKNOWN
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

### ENV-01 callout

```text
fmusim 0.9.0 -> 0.10.0
Dep(E) ∩ Delta(C) = {EXECUTION_ENVIRONMENT}
source execution evidence: ACTIVE -> STALE
unaffected semantic control: ACTIVE -> ACTIVE
delta evidence -> affected claim restored ACTIVE
```

### Central message
**Evidence history is provenance-monotonic; current qualification is not monotonic.**

## Figure 5 — Tested carry-forward envelope and stopping rule

### Question
Which changes permit bounded delta carry-forward, and which change crossed the tested boundary?

### Panel A — VU provenance-only revision
- strict byte rule: 8/16 exact, retained FAIL
- typed numerical comparator: 16/16 normalized PASS
- `+1e-6 m` control rejected
- selective carry-forward permitted

### Panel B — ENV runtime revision
- fmusim 0.9.0 -> 0.10.0 on same runner
- 10/10 repeats byte-stable in each environment
- 10/10 cross-runtime traces equivalent; observed max state/time difference 0
- `+1e-6` control rejected
- affected execution claim restored by delta evidence

### Panel C — LC algorithm/identity revision
- CV -> CA KF; `Implementation_ID` changed
- both 16/16 old cases execute
- 12/16 behavior-equal at normalized criterion
- maneuver challenge max differences: 109.0755 m range; 67.6108 m/s range rate
- automatic implementation-specific inheritance rejected

### Key message

```text
same interface or successful execution
!= qualification inheritance
```

Carry-forward depends on change class, claim dependencies, and claim-appropriate delta evidence.

## Production rules

1. Every number must map to `CLAIM_EVIDENCE_MATRIX_v2_5.md` and a frozen evidence report/CI artifact.
2. Figures 1–5 must distinguish mechanism evidence from fidelity or accreditation claims.
3. No figure may imply broad validation across mobility/effects/HLA/stochastic model classes.
4. LOC must be labeled descriptive, not cost/productivity evidence.
5. FMI-01 must remain visually subordinate to the primary `sensor.tws.track` empirical thread and labeled as a standards-execution micro-demonstration.
