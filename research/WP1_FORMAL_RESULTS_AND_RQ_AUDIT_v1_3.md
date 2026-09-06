# WP1 Formal Results and Research-Question Audit v1.3

Status: **Post-EB-01 evidence audit**

Date: 2026-09-06

This update retains BP-01, MS-01, SP-01 and EQ-01 and adds EB-01 as the formal WP1 engineering-burden result. No additional model or interface mechanism was introduced.

## 1. Formal WP1 evidence

### R1 — BP-01 Behavior Preservation

`BP-01 = PASS`

One real wrapped OpenEaagles TWS capability preserved its native observable trace exactly in 16/16 frozen cases.

### R2 — MS-01 Real Heterogeneous Model Substitution

`MS-01 = PASS`

OpenEaagles and RadarSimPublic executed behind one frozen upper trial with zero upper-trial edits for model selection.

### R3 — SP-01 Semantic Precheck

`SP-01 = PASS`

Five of five structurally valid semantic mismatches were rejected, while the real RadarSimPublic RF relation remained `UNKNOWN`.

### R4 — EQ-01 Evidence-Aware Qualification & Reuse

`EQ-01 = PASS`

Four of four intended-use cases matched the preregistered qualification state, and controlled changes selectively reused unaffected evidence.

### R5 — EB-01 Paired Engineering Burden

The same RadarSimPublic integration task was implemented through two paired paths:

```text
A: TMSU binding + adapter outside upper trial
B: direct bespoke model coupling inside upper orchestrator
```

Functional control:

```text
16 / 16 cases pass in each arm
16 / 16 matched canonical traces are byte-identical
```

Engineering-change result:

```text
                         TMSU      Bespoke
upper-core churn           0         160
upper-core direct model refs 0         9
semantic-update reassess scopes
                           1/4       3/4
```

Descriptive implementation size:

```text
TMSU adapter + binding:
224 physical lines
199 nonblank lines
```

The experiment therefore does not support a simplistic "TMSU always uses less code" claim. It supports isolation of model-specific change from shared upper-trial logic and a smaller downstream reassessment radius.

`EB-01 = PASS`.

## 2. RQ audit after EB-01

| RQ | Status | Current evidence | Remaining gap |
|---|---|---|---|
| **RQ1 Minimum contract** | Partially answered | One stable capability/contract/semantic declaration supports two heterogeneous implementations. | Sufficiency shown for one capability class; minimality not proven. |
| **RQ2 Composition / substitution** | Substitution strongly supported | Real heterogeneous binding-only substitution with zero upper-trial edit. | Multi-capability composition remains untested. |
| **RQ3 Semantic interoperability** | Bounded positive answer | 5/5 semantic mismatches rejected; real unresolved concept quarantined as `UNKNOWN`. | No automatic ontology inference/completeness claim. |
| **RQ4 Trust / evidence reuse** | Bounded positive answer | Intended-use-dependent qualification and selective evidence reuse demonstrated. | No authoritative accreditation or large historical evidence base. |
| **RQ5 T&E engineering benefit** | **Bounded positive answer for change/requalification burden** | EB-01: identical task outputs with 0 versus 160 upper-core line churn; 0 versus 9 direct model references; semantic-update reassessment radius 1/4 versus 3/4 scopes. | Literal engineer-time, calendar-time and cost reduction remain unmeasured. |

## 3. Hypothesis audit after EB-01

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1 integration time lower** | **Not directly tested** | EB-01 shows lower change radius/reassessment propagation, but no human engineer-time measurement. |
| **H2 upper-level change cost approaches zero on swap** | Supported in one bounded real heterogeneous case | zero upper-trial edits; one binding selection. |
| **H3 reuse rate higher** | Untested as real engineering outcome | evidence reuse shown, not model/data reuse rate across projects. |
| **H4 semantic precheck detects structural-valid mismatch** | Supported in preregistered SP-01 | 5/5 mismatch detection; real `UNKNOWN`. |
| **H5 machine-assisted fitness-for-use screening** | Boundedly supported | 4/4 intended-use cases; selective evidence reuse. |
| **H6 Golden Scenario preservation** | Partially supported | BP-01 16/16 exact identity. |

## 4. Integrated WP1 result

WP1 now supports five bounded properties:

1. behavior-preserving legacy wrapping;
2. real heterogeneous model substitution without upper-trial rewrite;
3. fail-safe semantic qualification with explicit `UNKNOWN`;
4. intended-use-relative evidence sufficiency and impact-bounded evidence reuse;
5. reduced shared-core change and requalification propagation relative to a controlled bespoke integration for the same task.

The integrated claim can now be stated as:

> A SAL-aligned TMSU approach can preserve a wrapped legacy capability, substitute an independently implemented heterogeneous model without rewriting the upper trial, reject or quarantine semantically incompatible or unresolved bindings, condition reuse on intended use and evidence scope, and reduce model-specific change propagation into shared trial logic within a frozen experimental envelope.

## 5. Important negative/nuanced result

The initial TMSU integration did **not** contain fewer physical lines than the controlled bespoke core modification:

```text
TMSU boundary: 224 physical lines
Bespoke upper-core churn: 160 lines
```

This should be retained in the paper.

It prevents the engineering-benefit claim from collapsing into an unsupported "less code" narrative. The observed advantage is architectural isolation and smaller requalification radius.

## 6. Status of RQ5/H1

RQ5 can now be described as:

```text
bounded positive evidence for objective engineering-change burden
```

H1 must remain:

```text
NOT DIRECTLY TESTED for engineer time
```

A literal time claim requires an instrumented developer/human replication. If the paper does not require a quantitative time-saving claim, WP1 can reasonably stop here and report H1 as unresolved rather than add a weak timing proxy.
