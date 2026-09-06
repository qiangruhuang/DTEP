# Paper Production Freeze v1.0

Status: **Manuscript-production freeze after WP1 empirical freeze**

Date: 2026-09-06

## 1. Paper identity

### Frozen working title

**Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Cumulative Evidence and Bounded Qualification Inheritance**

### One-sentence problem

Heterogeneous model unification solves only the interface/substitution problem unless the accompanying T&E evidence can also remain cumulative, traceable and selectively applicable as implementations evolve.

### Central research question

> Can heterogeneous simulation models be unified behind a stable trial-facing capability boundary while their test/qualification evidence accumulates over time without being blindly inherited after model evolution?

### Core answer supported by WP1

Within the frozen TWS study, **yes, but only conditionally**:

```text
heterogeneous capability unification
        +
explicit semantics / intended use / provenance
        +
dependency-aware evidence lifecycle
        ->
accumulated historical evidence
with selectively changing current applicability
```

Evidence can be carried forward for a controlled provenance-only revision using an evidence-type-appropriate delta check, while a substantive model-algorithm / `Implementation_ID` change correctly crosses the automatic inheritance boundary and leaves fresh affected fitness evidence required.

## 2. Scientific framing

The paper SHALL NOT be framed as:

```text
another simulation middleware
another API standard
universal plug-and-play simulation
proof of lower development time
proof of equal model fidelity
replacement for VV&A/accreditation
```

The paper SHALL be framed as:

> a T&E-facing evidence-lifecycle extension of heterogeneous-model unification.

The architecture is necessary but not sufficient. The main contribution is the link:

```text
capability-level substitutability
        ->
semantic qualification
        ->
intended-use evidence
        ->
configuration-aware evidence accumulation
        ->
bounded inheritance / refusal rule
```

## 3. Manuscript research questions

The manuscript consolidates the WP1 experiment chain into four paper-level RQs.

### RQ1 — Can a stable capability boundary support heterogeneous model unification without rewriting upper trial logic?

Evidence:

```text
BP-01 -> MS-01
```

Expected bounded answer:

- OpenEaagles behavior preserved in the frozen wrapper envelope;
- OpenEaagles and RadarSimPublic execute behind one frozen trial/contract;
- model selection changes binding, not upper trial logic.

This RQ establishes the unification substrate. It is not the paper's final contribution.

### RQ2 — Can structural interoperability be prevented from being mistaken for semantic compatibility or intended-use fitness?

Evidence:

```text
SP-01 -> EQ-01
```

Expected bounded answer:

- 5/5 injected semantic mismatches rejected;
- real RF concept remains `UNKNOWN`;
- kinematic research use is `QUALIFIED_WITHIN_EVIDENCE` while RF-performance use remains `UNKNOWN`.

### RQ3 — Can evidence history accumulate while current applicability changes selectively as model configurations evolve?

Evidence:

```text
EB-01 -> EA-01
```

Expected bounded answer:

- model-specific change is isolated from shared upper trial in the controlled benchmark;
- evidence records accumulate append-only;
- historical retention is separated from current applicability;
- unresolved `UNKNOWN` survives unrelated successful evidence additions.

### RQ4 — Can the lifecycle distinguish justified evidence carry-forward from changes that require fresh affected qualification?

Evidence:

```text
VU-01a -> VU-01b -> LC-01
```

Expected bounded answer:

- VU-01a retains a failed strict byte-level comparator as a methodological negative result;
- VU-01b shows typed delta carry-forward for one controlled provenance-only revision;
- LC-01 changes the actual tracking algorithm and `Implementation_ID`, rejects automatic implementation-specific inheritance, and keeps fresh CA fitness evidence unresolved.

This is the decisive paper-level RQ.

## 4. Primary contribution statements

### Contribution 1 — Stable capability identity without code convergence

A SAL-aligned TMSU separates stable trial-facing `Capability_ID` from concrete `Implementation_ID` and organizes contract, semantics, binding, evidence and provenance without creating a new simulation runtime.

### Contribution 2 — Layered interoperability and durable uncertainty

The experiments separate structural conformance, semantic compatibility, execution/behavior evidence, intended-use fitness and accreditation. `UNKNOWN` is retained as an explicit evidence-insufficiency state rather than coerced into PASS/FAIL.

### Contribution 3 — Provenance-monotonic evidence, non-monotonic qualification

The evidence record set can accumulate monotonically while qualification remains conditional on the current configuration, evidence domain and intended use.

Formally:

```text
E_(t+1) = E_t union DeltaE
```

but:

```text
Q(I,U,C | E_(t+1))
```

need not be more positive than:

```text
Q(I,U,C | E_t)
```

### Contribution 4 — Bounded inheritance with an empirical stop rule

The paper contains both sides of lifecycle reuse:

```text
controlled provenance revision
-> typed delta evidence
-> selective carry-forward
```

versus:

```text
substantive model-algorithm / Implementation_ID change
-> automatic inheritance rejected
-> fresh affected qualification required
```

This paired positive/negative result is the paper's strongest differentiator.

## 5. Narrative spine

The manuscript SHALL follow this sequence:

```text
Why heterogeneous model unification is needed
        ↓
Why interface replaceability is insufficient for T&E
        ↓
Create stable capability / implementation separation
        ↓
Demonstrate real legacy preservation and heterogeneous substitution
        ↓
Show semantic and intended-use qualification boundaries
        ↓
Represent evidence as cumulative but configuration-dependent
        ↓
Demonstrate one justified carry-forward
        ↓
Demonstrate one explicit inheritance stop
        ↓
Conclude with evidence-governed evolution, not universal reuse
```

## 6. Main figures

### Figure 1 — Heterogeneous model unification as an evidence-bearing capability boundary

Purpose: establish architecture only once.

Must show:

```text
Upper trial / test intent
        ↓
Capability_ID + Contract + Semantic Profile
        ↓
implementation-specific TMSU bindings
   OpenEaagles     RadarSimPublic
        ↓                ↓
versioned evidence / provenance
```

and explicitly annotate:

```text
Capability_ID != Implementation_ID
TMSU != runtime middleware
```

### Figure 2 — Empirical evidence ladder with persistent `UNKNOWN`

Main visual:

```text
BP -> MS -> SP -> EQ -> EB -> EA -> VUa -> VUb -> LC
```

Persistent side strand:

```text
RF UNKNOWN -> UNKNOWN -> UNKNOWN -> UNKNOWN
```

The visual message is that many successful tests do not erase unrelated evidence gaps.

### Figure 3 — Evidence accumulation versus qualification applicability

This becomes the conceptual centerpiece rather than a generic change-magnitude plot.

Suggested two-axis visualization:

- horizontal: lifecycle time / successive configuration states;
- upper band: accumulated historical evidence records, never deleted;
- lower band: current applicability of each evidence set (`ACTIVE`, `STALE`, `HISTORICAL`, `UNKNOWN`, `RESTORED_BY_DELTA`).

Anchor states:

```text
EA-01 baseline
VU-01b controlled provenance revision
LC-01 model-algorithm revision
```

Central annotation:

```text
Evidence history is provenance-monotonic.
Qualification is not monotonic.
```

### Figure 4 — Positive carry-forward versus inheritance stop

Paired panels:

```text
A. VU-01b
small controlled revision
-> delta reassessment
-> current kinematic claim restored

B. LC-01
model algorithm / Implementation_ID change
-> prior implementation evidence stale for CA
-> architecture freshly executes
-> intended-use fitness remains UNKNOWN
```

This is the main empirical answer to RQ4.

## 7. Main tables

### Table 1 — Capability, implementations and evidence identity

Rows:

- OpenEaagles TWS
- RadarSimPublic CV
- RadarSimPublic CA

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

### Table 2 — Frozen experimental evidence chain

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

Columns:

```text
Research question
Frozen change/test
Result
Quantitative anchor
Supported inference
Prohibited inference
```

### Table 3 — Lifecycle change-to-evidence-action matrix

Columns:

```text
Change class
Example
Dependency intersection
Historical evidence action
Current claim action
Empirical anchor
```

## 8. Required negative results

The following SHALL remain visible in the main paper or supplement:

1. TMSU did **not** use fewer total LOC in EB-01.
2. VU-01a exact-byte carry-forward **FAILED** in 8/16 repeated numerical traces.
3. RadarSimPublic RF concept remains `UNKNOWN`.
4. CA architectural execution PASS does **not** restore CA intended-use fitness.
5. LC-01 does **not** show universal CA superiority.

Deleting these results would weaken the paper by turning an evidence-governance study into a success-only architecture demonstration.

## 9. Claim discipline

Every scientific sentence must be tagged internally as one of:

```text
EMPIRICAL
DESIGN
EXTERNAL_SOURCE
INFERENCE
LIMITATION
```

No architecture definition may be presented as an empirical discovery.
No experiment result may be generalized beyond its frozen evidence envelope.
No `UNKNOWN` may be converted to a negative or positive conclusion without new evidence.

## 10. Evidence chain frozen for manuscript production

```text
BP-01
-> MS-01
-> SP-01
-> EQ-01
-> EB-01
-> EA-01
-> VU-01a
-> VU-01b
-> LC-01
```

No additional model, transport, API or orchestration experiment should be added unless it resolves a reviewer-critical gap that cannot be answered by this evidence chain.

## 11. Manuscript production sequence

```text
P0  science/story freeze                COMPLETE
P1  claim-evidence matrix               COMPLETE; update to central RQs
P2  focused literature positioning      IN PROGRESS
P3  complete manuscript draft           NEXT
P4  main figure/table content freeze    NEXT
P5  sentence-level method-result-claim audit
P6  reference verification
P7  journal-specific formatting
P8  final reproducibility/evidence audit
```

## 12. Submission-level bounded conclusion

The strongest allowable conclusion is:

> Heterogeneous simulation models can be unified at a stable trial-facing capability boundary while their T&E evidence is managed as a cumulative, provenance-linked lifecycle record. In the tested case, evidence could be selectively carried forward after a controlled provenance-only revision but was prevented from being automatically inherited after a substantive model-algorithm change. Thus, evidence history may accumulate monotonically even though current qualification remains conditional on configuration, intended use and the evidence supporting that use.
