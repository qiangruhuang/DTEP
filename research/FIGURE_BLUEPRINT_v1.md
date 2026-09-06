# Figure & Table Blueprint v1.0

Status: **Frozen after WP1 empirical freeze**

The figures should communicate the evidence-management contribution, not decorate the software architecture. Four main figures are sufficient.

## Figure 1 — From monolithic simulation silos to evidence-aware capability units

### Research message

The modernization problem is not solved by putting legacy models behind APIs alone. A trial-grade capability boundary must separate upper trial intent from implementation-specific code while retaining semantics, provenance and evidence.

### Layout

Three horizontal zones:

```text
A. Legacy monoliths
   [OpenEaagles-like monolith]  [other monolith]
   model + data + semantics + local integration + local evidence

                      ↓ boundary extraction

B. SAL-aligned capability layer
   Capability_ID: sensor.tws.track
   Contract_ID
   Semantic_Profile_ID
   Trial/Scenario Binding

         ↙ Implementation A        Implementation B ↘

C. TMSU evidence-bearing units
   OpenEaagles TWS                RadarSimPublic
   Implementation_ID             Implementation_ID
   adapter/binding               adapter/binding
   provenance                    provenance
   evidence links                evidence links
```

Under the architecture, draw an evidence thread:

```text
Trial requirement
→ Scenario version
→ Capability contract
→ Implementation version
→ Semantic mapping
→ Adapter/binding
→ Execution environment
→ Run evidence
→ Intended-use decision
```

### Visual emphasis

- `Capability_ID` visually shared across implementations.
- `Model_Implementation_ID` visually distinct.
- TMSU marked “logical packaging/conformance unit — not runtime middleware”.
- HLA/DIS/FMI etc., if shown, appear below/alongside as possible transport mechanisms, not replaced by TMSU.

## Figure 2 — Empirical evidence ladder and durable uncertainty

### Research message

Each experiment removes one unjustified inference from the previous layer. Evidence accumulates, but trust does not simply increase monotonically.

### Main path

```text
BP-01
Preserve
16/16 exact
   ↓
MS-01
Substitute
16/16 + 16/16
   ↓
SP-01
Semantic precheck
5/5 mismatches rejected
RF = UNKNOWN
   ↓
EQ-01
Intended-use screen
U1 qualified / U2 unknown
   ↓
EB-01
Bound change radius
0 upper-core churn vs 160
   ↓
EA-01
Accumulate evidence
history monotonic / applicability selective
   ↓
VU-01a
strict byte carry-forward FAIL
8/16 exact
   ↘ correction
VU-01b
normalized 16/16 + negative control
   ↓
LC-01
algorithm change
carry-forward deliberately rejected
```

### Persistent `UNKNOWN` strand

Draw a parallel strand beginning at SP-01:

```text
RF UNKNOWN
→ EQ U2 UNKNOWN
→ EA UNKNOWN retained
→ VU UNKNOWN retained
→ LC UNKNOWN retained
```

This strand should remain visually continuous even while the main experimental ladder contains multiple PASS results.

## Figure 3 — Change magnitude versus evidence action

### Research message

The central modernization outcome is a bounded inheritance rule, not universal reuse.

### X-axis

Increasing semantic/implementation impact:

```text
Display metadata
→ Adapter provenance
→ Execution environment
→ Semantic mapping
→ Model algorithm / Implementation_ID
→ Capability contract / upper trial
```

### Y-axis

Required evidence action:

```text
Reuse original evidence
Typed delta check
Targeted reassessment
Fresh implementation-level qualification
Broad dependent-claim reassessment
```

### Empirical anchors

- `VU-01b` at Adapter provenance → typed delta check.
- `LC-01` at Model algorithm / Implementation_ID → fresh affected qualification.
- `SP-01` at Semantic mapping → semantic reassessment.
- `VU-01a` displayed as a warning callout: comparator type itself matters.

### Key annotation

```text
same contract ≠ qualification inheritance
```

## Figure 4 — Paired lifecycle state transition: VU versus LC

### Panel A: VU-01b controlled provenance revision

Before:

```text
BP ACTIVE
MS ACTIVE
SP ACTIVE
EQ ACTIVE
EB ACTIVE/HISTORICAL reference
RF UNKNOWN
```

Immediately after adapter/binding revision:

```text
BP ACTIVE
SP ACTIVE
MS/EQ affected
historical evidence retained
RF UNKNOWN
```

After typed delta evidence:

```text
MS restored by delta
kinematic intended use restored
RF UNKNOWN unchanged
```

### Panel B: LC-01 algorithm / implementation change

Before:

```text
CV-specific MS/EQ/EB/VU current/historical
BP/SP current
```

After change:

```text
BP ACTIVE
SP ACTIVE
CV-specific evidence HISTORICAL + STALE for CA
```

Fresh CA execution:

```text
architecture = PASS_FRESH_EXECUTION
kinematic intended use = UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
RF = UNKNOWN
```

### Visual rule

Never delete old evidence nodes. Use opacity/outline to show historical/stale status while keeping them visible.

## Supplementary Figure S1 — BP-01 behavior-preservation domain

A 2×2×2×2 matrix visualization:

- 10/20 km
- 0/20°
- 1/4 m²
- static/closing

All 16 cells: `D_byte = 0`, tracks present, Station warning absent.

Purpose: bounded transparency evidence, not a main narrative figure.

## Supplementary Figure S2 — LC-01 algorithm discrimination

Two panels:

1. range over time: truth / CV / CA;
2. range-rate over time: truth / CV / CA.

Annotate only the preregistered sensitivity metrics:

```text
max |range_CA - range_CV| = 109.0755 m
max |range-rate_CA - range-rate_CV| = 67.6108 m/s
```

Do not title the plot as “CA outperforms CV.” Suggested title:

**A maneuvering-target challenge distinguishes the two selected tracking algorithms outside the original E2 envelope.**

## Main Table 1 — Capability and evidence identity

Columns:

```text
Capability_ID
Implementation_ID
Contract_ID
Semantic_Profile_ID
Migration path
Evidence sets
Current intended-use state
```

Rows:

- OpenEaagles TWS
- RadarSimPublic CV
- RadarSimPublic CA

## Main Table 2 — Frozen evidence chain

Columns:

```text
Experiment
Question
Result
Quantitative anchor
Supported inference
Inference boundary
```

Rows BP/MS/SP/EQ/EB/EA/VU/LC.

## Main Table 3 — Lifecycle change-action matrix

Derived directly from `EVIDENCE_LIFECYCLE_PROFILE_v1_2.md`.

Columns:

```text
Change class
Example
Evidence potentially affected
Default action
Empirical anchor
```

## Figure production rule

No figure may introduce a new quantitative claim. Every number displayed must be recoverable from a frozen evidence artifact or report and must appear in `CLAIM_EVIDENCE_MATRIX_v1.md`.
