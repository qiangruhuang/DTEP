# WP1 Formal Results and Research-Question Audit v1.2

Status: **Post-EQ-01 evidence audit**

Date: 2026-09-06

This update retains BP-01, MS-01 and SP-01 and adds EQ-01 as the formal WP1 intended-use/evidence-reuse result. No additional model, transport, API, broker, registry service or orchestration mechanism was introduced.

## 1. Formal WP1 evidence now available

### R1 — BP-01 Behavior Preservation

- one real legacy OpenEaagles TWS capability;
- 16/16 frozen cases behavior-bearing;
- 16/16 baseline-versus-wrapper native traces byte-identical;
- zero OpenEaagles source patches;
- negative control rejected;
- `BP-01 = PASS`.

### R2 — MS-01 Real Heterogeneous Model Substitution

- OpenEaagles TWS and independent RadarSimPublic Radar/KF;
- 16/16 cases execute for each implementation;
- same frozen structural/canonical validator;
- upper-trial artifacts changed for swap: 0;
- binding selections changed: 1;
- `MS-01 = PASS`.

### R3 — SP-01 Semantic Precheck Ablation

- structural-only arm passed 7/7 cases;
- semantic precheck rejected 5/5 preregistered semantic mismatches;
- positive control: `COMPATIBLE`;
- real RadarSimPublic RF concept relation: `UNKNOWN`;
- `SP-01 = PASS`.

### R4 — EQ-01 Evidence-Aware Qualification & Reuse

The same evidence base was screened against four preregistered intended uses / evidence conditions.

```text
U1 kinematic conformance-research use within E2 envelope
    -> QUALIFIED_WITHIN_EVIDENCE

U2 RF output used for a radar-performance test decision
    -> UNKNOWN
       SEM-UNKNOWN: average_signal_db
       EVIDENCE-ABSENT: comparative_model_validity

U3 use at 50 km outside the executed evidence envelope
    -> UNKNOWN
       DOMAIN-OUTSIDE-EVIDENCE

U4 explicit semantic conflict
    -> NOT_QUALIFIED
       SEM-INCOMPATIBLE: range_m
```

All four matched the preregistered decisions.

A separate change-impact arm evaluated four controlled changes over BP-01/SP-01/MS-01:

```text
gate-change cells: 12
REUSE:              8
REASSESS:           4
matched cases:      4 / 4
```

`EQ-01 = PASS`.

Supported inference: existing machine-readable evidence can support conservative intended-use-dependent screening and selective evidence invalidation/reuse under a frozen dependency map.

Important boundary: `QUALIFIED_WITHIN_EVIDENCE` is not authoritative accreditation and does not establish underlying physical model validity.

## 2. RQ audit after EQ-01

| RQ | Status | Current evidence | Remaining gap |
|---|---|---|---|
| **RQ1 Minimum contract** | **Partially answered** | One stable capability/contract plus controlled semantic declarations supports C++ OpenEaagles and Python/NumPy RadarSimPublic. `Capability_ID != Implementation_ID` is empirically useful. | Current declaration is demonstrated sufficient, not proven minimal. Evidence remains one capability class. |
| **RQ2 Composition / substitution** | **Substitution strongly supported** | MS-01 demonstrates binding-only real heterogeneous substitution with zero upper-trial edits. | Multi-capability composition remains untested and should not be claimed unless required by the final paper. |
| **RQ3 Semantic interoperability** | **Bounded positive answer** | SP-01 rejects 5/5 structurally valid semantic mismatches and quarantines a real unresolved RF concept as `UNKNOWN`. | No automatic semantic inference, ontology-completeness claim or resolved RF concept equivalence. |
| **RQ4 Trust / evidence reuse** | **Bounded positive answer for evidence-aware screening/reuse** | EQ-01: 4/4 intended-use cases match preregistered outcomes; the same implementation can be evidence-sufficient for one use and `UNKNOWN` for another; controlled changes selectively reuse 8/12 gate-evidence cells. | No expert/authority validation of the screening rules, no actual accredited model-validity evidence, no large-scale change history, and no claim of optimal dependency-graph completeness. |
| **RQ5 T&E engineering benefit** | **Not answered** | Local indicators exist: zero upper-trial edits during substitution and 8/12 selective gate-evidence reuse in a rule-based change-impact experiment. | No paired before/after measurements of engineer-hours, integration time, manual steps, bespoke interfaces, update effort, or evidence-discovery burden. |

## 3. Hypothesis audit after EQ-01

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1 integration time lower** | Untested | no paired manual/current versus TMSU engineering-time experiment |
| **H2 upper-level change cost approaches zero on swap** | Supported in one bounded real heterogeneous case | zero upper-trial edits; one binding selection |
| **H3 reuse rate higher** | Untested as an engineering outcome | EQ-01 shows selective evidence reuse under frozen rules, but not higher model/data reuse rate in real engineering work |
| **H4 semantic precheck detects structural-valid mismatch** | Supported in preregistered SP-01 | 5/5 injected mismatches rejected; real ambiguity returned `UNKNOWN` |
| **H5 machine-assisted fitness-for-use screening** | **Boundedly supported in preregistered EQ-01** | 4/4 intended-use/evidence cases matched; no unsafe promotion of missing evidence to a positive qualification; 4/4 change-impact cases matched |
| **H6 Golden Scenario preservation** | Partially supported | BP-01 16/16 exact identity within the deterministic wrapper envelope |

## 4. The UNKNOWN result as a paper-level contribution

The RadarSimPublic RF ambiguity now links RQ3 and RQ4.

SP-01 establishes:

```text
rf.signal_to_noise_ratio
?=
rf.track_average_signal
-> UNKNOWN
```

EQ-01 then shows that the consequence of this `UNKNOWN` depends on intended use:

```text
kinematic architectural-substitution research use
-> RF field not decision-critical
-> QUALIFIED_WITHIN_EVIDENCE

RF performance test decision
-> RF field decision-critical
-> UNKNOWN
```

Thus qualification is not a static model label:

```text
Qualification = f(model, intended use, validity domain, available evidence)
```

This is a stronger test-grade claim than simple interface compatibility. It demonstrates that the framework can refuse to convert absence of conflict into evidence of fitness.

Recommended paper interpretation:

> An explicit unknown state is not a failure of interoperability but a controlled expression of evidence insufficiency. The same implementation may be acceptable for one bounded use while remaining unqualified for another when a decision-critical semantic relation, validity domain or evidence class is unresolved.

## 5. Evidence-reuse interpretation

EQ-01 supports **impact-bounded requalification**, not blind inheritance.

```text
change intersects gate dependency -> REASSESS
otherwise -> REUSE
```

The 8/12 reuse result is useful evidence that the method can selectively preserve unaffected evidence. It must not be reported as a 66.7% engineering-time saving because the experiment did not measure human effort or cost.

## 6. What WP1 can now legitimately claim

WP1 has empirical evidence for four bounded properties:

1. behavior preservation of a real wrapped legacy capability;
2. real heterogeneous implementation substitution without upper-trial rewrite;
3. fail-safe semantic precheck that distinguishes structural validity from semantic compatibility;
4. intended-use-dependent evidence sufficiency screening and selective evidence reuse after controlled changes.

The strongest integrated statement is:

> A SAL-aligned TMSU approach can preserve a wrapped legacy capability, substitute an independently implemented heterogeneous model without rewriting the upper trial, reject or quarantine semantically incompatible/uncertain bindings, and reuse unaffected evidence while withholding qualification when intended-use evidence is insufficient within a frozen experimental envelope.

WP1 still cannot claim enterprise-wide minimum-contract optimality, multi-capability composability, authoritative model accreditation, or measured engineering savings.

## 7. Next evidence bottleneck

After EQ-01, the main unresolved Research Protocol claim is RQ5/H1: measurable T&E engineering burden reduction.

The next experiment, if approved, should therefore be a **paired engineering-burden experiment** using the already frozen OpenEaagles/RadarSimPublic substitution task. It should compare a bespoke/manual integration path against the TMSU binding path using objective engineering-change metrics and, only if feasible, instrumented human time.

No further model should be added before that comparison.
