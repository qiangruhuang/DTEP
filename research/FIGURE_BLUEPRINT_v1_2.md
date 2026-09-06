# Figure & Table Blueprint v1.2

Status: **Production-frozen around dual contribution**

The paper must visually preserve both landing points: heterogeneous model unification and lifecycle evidence governance.

## Figure 1 — Heterogeneous model unification through TMSU

### Question

What is unified, and what remains heterogeneous?

### Composition

Top band:

```text
Trial intent / Scenario / Upper trial logic
                ↓
        Capability_ID
        Contract_ID
        Semantic_Profile_ID
```

Middle band:

```text
TMSU logical capability/conformance boundary
contract + semantics + binding + provenance + evidence links
```

Bottom band:

```text
OpenEaagles TWS             RadarSimPublic CV / CA
Implementation_ID A         Implementation_ID B / C
legacy C++                  Python/NumPy
native model internals      independent model internals
```

### Required annotations

- `Capability_ID != Implementation_ID`
- `upper trial unchanged on MS-01 swap`
- `TMSU is not runtime middleware`
- transports such as HLA/DIS/FMI may coexist below/alongside and are not replaced

### Empirical callouts

- BP-01: 16/16 exact wrapper preservation
- MS-01: 16/16 + 16/16; binding-only swap; zero upper-trial edits

## Figure 2 — From substitutability to qualification

### Question

Why is successful heterogeneous substitution insufficient for digital T&E?

### Ladder

```text
BP-01 Preserve
      ↓
MS-01 Substitute
      ↓
SP-01 Semantic precheck
      ↓
EQ-01 Intended-use qualification
      ↓
EB-01 Change isolation
```

### Parallel UNKNOWN strand

```text
real RF semantic relation = UNKNOWN
        ↓
RF-performance intended use = UNKNOWN
```

### Key message

```text
structural conformance
!= semantic compatibility
!= intended-use fitness
```

## Figure 3 — Cumulative evidence, non-monotonic qualification

### Question

Can evidence accumulate without becoming blind trust?

### Layout

Horizontal lifecycle states:

```text
C0 baseline
→ C1 evidence accumulation
→ C2 provenance-only revision
→ C3 algorithm / Implementation_ID revision
```

Upper lane — retained evidence history:

```text
BP
BP+MS
BP+MS+SP
BP+MS+SP+EQ
BP+MS+SP+EQ+EB
... +EA +VU +LC
```

No historical node disappears.

Lower lane — current applicability/qualification:

```text
ACTIVE
QUALIFIED_WITHIN_EVIDENCE
UNKNOWN
STALE
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

### Central annotation

> **Evidence history is provenance-monotonic; qualification is not monotonic.**

## Figure 4 — Evidence inheritance has a positive rule and a stop rule

### Panel A — VU-01a/b

```text
adapter/binding provenance revision
model identity unchanged
semantics unchanged
upper trial unchanged
        ↓
strict byte rule FAIL: 8/16 exact
        ↓
evidence-type-aware numerical rule
16/16 normalized + negative control rejected
        ↓
selective carry-forward permitted
```

### Panel B — LC-01

```text
CV KF → CA KF
Implementation_ID changed
contract unchanged
upper trial unchanged
        ↓
16/16 old cases execute for both
12/16 behavior-equal at normalized criterion
        ↓
maneuver challenge materially discriminates algorithms
        ↓
automatic qualification inheritance REJECTED
fresh affected fitness evidence required
```

### Key message

```text
same contract != qualification inheritance
```

## Main Table 1 — Model/capability identity

Columns:

```text
Capability_ID
Implementation_ID
Software/model source
Contract_ID
Semantic_Profile_ID
Migration/integration path
Current evidence state
Current intended-use status
```

Rows:

- OpenEaagles TWS
- RadarSimPublic CV
- RadarSimPublic CA

## Main Table 2 — Frozen experiment chain

Columns:

```text
Experiment
RQ
Question
Frozen change/intervention
Result
Quantitative anchor
Supported inference
Boundary
```

Rows: BP, MS, SP, EQ, EB, EA, VU-01a, VU-01b, LC.

## Main Table 3 — Change class to evidence action

Columns:

```text
Change class
Example
Affected evidence dependency
Default lifecycle action
Empirical anchor
```

Rows should include:

- display metadata
- adapter provenance
- semantic mapping
- execution environment
- model algorithm
- Implementation_ID
- capability contract
- upper trial

## Supplementary figures

### Figure S1

BP-01 2×2×2×2 frozen behavior matrix.

### Figure S2

LC-01 maneuver challenge: truth / CV / CA range and range-rate curves.

### Figure S3

Evidence dependency graph showing ACTIVE / STALE / HISTORICAL states under EA/VU/LC.

## Production rule

No visual may add an unsupported number. Every number must map to `CLAIM_EVIDENCE_MATRIX_v1_2.md` and a frozen evidence report.
