# Figure & Table Blueprint v1.1

Status: **Main-paper visual freeze**

Date: 2026-09-06

The visual system must communicate one argument:

> heterogeneous-model unification becomes useful for digital T&E only when model evolution and qualification evidence are managed together.

Architecture is Figure 1 only. Figures 2–4 must be evidence/results figures, not additional architecture diagrams.

## Figure 1 — Heterogeneous model unification as an evidence-bearing capability boundary

### Scientific purpose

Establish the substrate on which the lifecycle experiments operate.

### Layout

Top: one frozen upper trial / test intent.

Middle: one stable trial-facing capability:

```text
Capability_ID = sensor.tws.track
Contract_ID
Semantic_Profile_ID
```

Bottom: distinct implementation branches:

```text
OpenEaagles TWS                 RadarSimPublic
Implementation_ID A            Implementation_ID B/C
M1 wrapper                     M2 adapter
native semantics               mapped semantics
version/provenance             version/provenance
linked evidence sets           linked evidence sets
```

A thin evidence thread runs from trial intent through scenario, capability, implementation, semantic mapping, binding, execution, evidence set and intended-use decision.

### Required annotations

```text
Capability_ID != Implementation_ID
TMSU = logical packaging/conformance unit
TMSU != simulation runtime middleware
```

### Avoid

- no container/cloud iconography unless needed;
- no suggestion that HLA/DIS/FMI are replaced;
- no large software-stack diagram.

---

## Figure 2 — Evidence ladder: every layer blocks an unjustified inference

### Scientific purpose

Show how the experiment chain progressively prevents a stronger but unsupported claim.

### Horizontal ladder

```text
BP-01
Legacy behavior preserved
16/16 exact
        ↓ blocks: "wrapper changed legacy behavior"

MS-01
Heterogeneous substitution
16/16 + 16/16
        ↓ blocks: "one implementation is hard-coded into trial"

SP-01
Semantic precheck
5/5 mismatches rejected
RF = UNKNOWN
        ↓ blocks: "schema PASS means same meaning"

EQ-01
Intended-use qualification
kinematic = QUALIFIED_WITHIN_EVIDENCE
RF performance = UNKNOWN
        ↓ blocks: "one model label fits every use"

EA-01
Cumulative evidence
history retained / applicability selective
        ↓ blocks: "new evidence overwrites old uncertainty"

VU-01a/b
carry-forward comparator tested
8/16 byte FAIL -> 16/16 typed numerical PASS
        ↓ blocks: "maintenance either resets or blindly inherits"

LC-01
algorithm change
carry-forward REJECTED
        ↓ blocks: "same interface lets validity follow automatically"
```

### Persistent uncertainty strand

A visually separate line starts at SP-01 and passes through later stages without changing state:

```text
RF UNKNOWN
-> RF-use UNKNOWN
-> UNKNOWN retained
-> UNKNOWN retained
-> UNKNOWN retained
```

### Key visual message

PASS results should not form an upward "trust score". Use layer labels rather than green-progress metaphors.

---

## Figure 3 — The paper's conceptual centerpiece: evidence accumulates, applicability changes

### Scientific purpose

Visualize the central result directly:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

### Design

Use a lifecycle timeline with three configuration states:

```text
C0  EA-01 baseline
C1  VU-01b provenance-only revision
C2  LC-01 algorithm / Implementation_ID revision
```

### Upper band — historical evidence inventory

Display evidence cards as cumulative blocks:

```text
C0: BP MS SP EQ EB
C1: BP MS SP EQ EB + VU
C2: BP MS SP EQ EB VU + LC
```

No card disappears.

### Lower band — current applicability state

For each state, show current claim status rather than record count.

Suggested rows:

```text
Legacy behavior preservation
Architectural substitution
RF semantic relation
Kinematic intended use
RF-performance intended use
Change/requalification evidence
```

Use states:

```text
ACTIVE
PASS_CARRIED_FORWARD_BY_DELTA
PASS_FRESH_EXECUTION
HISTORICAL/STALE
QUALIFIED_WITHIN_EVIDENCE
UNKNOWN
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

### Critical transition

C1:

```text
controlled provenance revision
-> selective delta reassessment
-> kinematic current claim restored
```

C2:

```text
model algorithm / implementation identity changes
-> prior implementation-specific claims stale for CA
-> architecture freshly executes
-> fitness remains UNKNOWN
```

### Main annotation

Place this at the center of the figure:

> Retention is monotonic; applicability is conditional.

---

## Figure 4 — Positive carry-forward versus stop rule

### Scientific purpose

Provide the direct empirical answer to RQ4.

### Panel A — VU-01a/b: controlled provenance-only revision

Show four steps:

```text
same model/algorithm
same contract/semantics
adapter/binding provenance revision
        ↓
strict byte comparator: FAIL 8/16
        ↓
typed 9-decimal comparator + sensitivity control
        ↓
16/16 equivalence; affected current claim restored
```

Callout:

```text
Comparator validity is part of evidence validity.
```

### Panel B — LC-01: substantive algorithm revision

Show:

```text
CV KF -> CA KF
Implementation_ID changes
upper trial / contract / semantic mapping unchanged
```

Old envelope:

```text
CV executes 16/16
CA executes 16/16
12/16 behavior-equal at frozen criterion
```

Maneuver challenge:

```text
max range separation = 109.0755 m
max range-rate separation = 67.6108 m/s
```

Decision:

```text
architecture = PASS_FRESH_EXECUTION
kinematic intended-use fitness = UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

### Shared bottom bar

```text
Reuse is allowed only when the evidence dependency remains valid or is explicitly restored.
```

---

## Supplementary Figure S1 — BP-01 bounded preservation domain

2×2×2×2 matrix:

- 10/20 km;
- 0/20°;
- 1/4 m² RCS;
- static/closing 150 m/s.

All 16:

```text
track present
D_byte = 0
Station warning absent
```

Purpose: establish bounded wrapper transparency without taking main-figure space.

---

## Supplementary Figure S2 — Heterogeneous traces under MS-01

Show one matched representative scenario for OpenEaagles and RadarSimPublic with canonical track observables.

Purpose:

```text
same contract / same upper trial
!=
same numerical behavior
```

Do not imply either trace is more correct.

---

## Supplementary Figure S3 — LC-01 maneuver discrimination

Panel A: range over time — truth / CV / CA.

Panel B: range rate over time — truth / CV / CA.

Permitted annotations:

```text
max |range_CA - range_CV| = 109.0754918963 m
max |range-rate_CA - range-rate_CV| = 67.6107619584 m/s
```

Optional RMSE callout only if space permits and caption explicitly states this is a constructed sensitivity challenge, not operational validation.

---

# Main Table 1 — Capability / implementation identity and current evidence state

Columns:

```text
Capability_ID
Implementation_ID
Implementation role
Contract_ID
Semantic_Profile_ID
Migration path
Current architectural state
Current kinematic-use state
RF semantic state
```

Rows:

```text
OpenEaagles TWS
RadarSimPublic CV
RadarSimPublic CA
```

---

# Main Table 2 — Frozen experiment chain and inference limits

Columns:

```text
Experiment
Primary question
Frozen intervention/test
Result
Quantitative anchor
Supported inference
Explicit boundary
```

Rows:

```text
BP-01
MS-01
SP-01
EQ-01
EB-01
EA-01
VU-01a
VU-01b
LC-01
```

VU-01a must remain a separate row marked `FAIL (methodological negative result)`.

---

# Main Table 3 — Change class to evidence action

Columns:

```text
Change class
Example
Typical dependency effect
Historical record treatment
Current claim treatment
Empirical anchor
```

Minimum rows:

```text
documentation metadata
adapter/binding provenance
execution environment
semantic mapping
model algorithm / Implementation_ID
capability contract / upper trial
```

Do not present this as a universal standard. Caption as the tested/research lifecycle profile.

---

# Figure production controls

1. No figure may introduce an unregistered quantitative claim.
2. Every number must appear in `CLAIM_EVIDENCE_MATRIX_v1_1.md` or a cited frozen evidence report.
3. `UNKNOWN` must be visually different from `FAIL` and from `PASS`.
4. Historical/stale evidence must remain visible rather than being deleted from diagrams.
5. Architecture colors/shapes must not imply accreditation authority.
6. VU-01a failure must not be hidden by VU-01b correction.
7. LC-01 challenge must be labeled a discrimination/sensitivity challenge, not validation of CA superiority.
8. Main figures should remain legible when printed in grayscale; status must not rely on color alone.
