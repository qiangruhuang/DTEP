# Paper Production Freeze v2.0

Status: **Production architecture frozen after WP1 empirical freeze**

Date: 2026-09-06

## 1. Final paper thesis

The paper has **two inseparable contributions**, not one primary contribution plus one secondary extension.

### Contribution A — heterogeneous model unification

We propose and empirically instantiate a SAL-aligned **Test Model Service Unit (TMSU)** as a logical capability/conformance unit for heterogeneous simulation software. TMSU does not replace HLA/DIS/FMI or introduce a new simulation bus. Its purpose is to separate the stable trial-facing capability from concrete implementations and to bind contract, semantics, execution binding, provenance and evidence to each implementation.

Core identity:

```text
Capability_ID != Implementation_ID
```

Core empirical result:

```text
real legacy OpenEaagles TWS
+ independent RadarSimPublic implementation
+ one frozen upper trial / capability contract
-> heterogeneous substitution without rewriting upper trial logic
```

This is the paper's first landing point and must remain visible in the title, abstract, Figure 1 and Discussion.

### Contribution B — evidence lifecycle for evolving heterogeneous models

Once heterogeneous models can be organized behind a stable capability boundary, a T&E-specific question appears:

> When implementations are replaced or evolve, which prior test/qualification evidence remains applicable, which becomes stale, and when must automatic inheritance be refused?

The evidence lifecycle result is:

```text
Evidence history may accumulate monotonically;
current qualification must remain configuration-, intended-use- and evidence-dependent.
```

The system must support both:

```text
justified selective carry-forward
```

and:

```text
explicit refusal of inheritance when a change crosses the qualification boundary
```

This is the paper's second landing point.

## 2. Final narrative logic

The manuscript must read as one continuous argument:

```text
Problem 1:
legacy/heterogeneous models are tightly coupled to local trial logic
        ↓
TMSU:
stable capability identity + contract + semantic/binding/evidence boundary
        ↓
BP-01 / MS-01:
legacy behavior can be preserved and a real heterogeneous implementation substituted
        ↓
Problem 2 created by successful unification:
replaceability does not tell us whether prior test evidence remains valid
        ↓
SP-01 / EQ-01:
structural compatibility is not semantic compatibility or intended-use fitness
        ↓
EA-01:
evidence can accumulate without deleting history
        ↓
VU-01a/b:
a controlled provenance-only change can use evidence-type-aware delta carry-forward
        ↓
LC-01:
a substantive algorithm/Implementation_ID change crosses the inheritance boundary
        ↓
Final principle:
model unification for digital T&E must govern both executable substitutability
and qualification-evidence inheritance across lifecycle change
```

## 3. Final research questions

### RQ1 — Heterogeneous model unification

Can a stable capability boundary preserve a real legacy implementation and support a genuinely heterogeneous alternative without rewriting upper trial logic?

Evidence: BP-01 + MS-01.

### RQ2 — Qualification layers

Can structural interoperability be prevented from being mistaken for semantic compatibility and intended-use fitness?

Evidence: SP-01 + EQ-01.

### RQ3 — Cumulative evidence

Can historical evidence accumulate without deletion while current applicability changes selectively as configurations evolve?

Evidence: EB-01 + EA-01.

### RQ4 — Bounded inheritance

Can the lifecycle distinguish changes that permit selective evidence carry-forward from substantive implementation changes that require fresh affected qualification?

Evidence: VU-01a/b + LC-01.

## 4. Final claims hierarchy

### Level 1 — paper-defining claims

**Claim P1.** A SAL-aligned TMSU can organize heterogeneous simulation implementations behind a stable trial-facing capability boundary without forcing convergence of their internal software architectures.

**Claim P2.** Heterogeneous model unification is insufficient for digital T&E unless qualification evidence is governed as the implementations evolve.

**Claim P3.** Evidence history can be provenance-monotonic while current qualification remains non-monotonic and conditional.

**Claim P4.** Evidence reuse requires both a positive carry-forward rule and a stop rule; unchanged interfaces or regression similarity are insufficient by themselves.

### Level 2 — supporting empirical claims

- BP-01: 16/16 behavior-preservation cases exact within the frozen OpenEaagles wrapper envelope.
- MS-01: OpenEaagles and RadarSimPublic each 16/16 behind the same frozen upper trial with zero upper-trial edits for substitution.
- SP-01: 5/5 structurally valid semantic mismatches rejected; one real RF relation remained `UNKNOWN`.
- EQ-01: same implementation qualified for bounded kinematic research use but remained `UNKNOWN` for RF-performance use.
- EB-01: change isolation and smaller reassessment radius, not fewer total LOC or measured engineer time.
- EA-01: append-only evidence history with selective staleness and durable `UNKNOWN`.
- VU-01a: strict cross-run byte carry-forward criterion failed (8/16 exact).
- VU-01b: evidence-type-aware numerical criterion restored 16/16 normalized equivalence with a sensitivity control.
- LC-01: CV→CA algorithm/Implementation_ID change rejected automatic implementation-specific qualification inheritance despite both passing all 16 old cases.

## 5. Explicit non-claims

The manuscript must not claim:

```text
universal model interoperability
behavioral/fidelity equivalence between OpenEaagles and RadarSimPublic
complete semantic inference
operational radar validation
accreditation
enterprise-wide time/cost savings
fewer total lines of code
that every model change requires full revalidation
that every model change permits delta requalification
that UNKNOWN means invalid
that UNKNOWN is permanent
```

## 6. Title freeze

Preferred title:

> **Evidence-Aware Unification of Evolving Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction, Cumulative Evidence, and Bounded Qualification Inheritance**

Shorter alternative:

> **Unifying Evolving Heterogeneous Simulation Models for Digital Test and Evaluation with Cumulative Evidence and Bounded Qualification Inheritance**

The preferred title keeps both contributions visible: **unification** and **evidence lifecycle**.

## 7. Abstract architecture

The abstract must contain seven moves in this order:

1. heterogeneous/legacy M&S modernization problem;
2. TMSU unification method;
3. real heterogeneous substitution evidence;
4. semantic/intended-use qualification evidence;
5. cumulative evidence + durable `UNKNOWN`;
6. VU positive carry-forward paired with LC stop-rule result;
7. final principle: manage both model substitutability and qualification inheritance.

Do not open the abstract with evidence lifecycle alone; unification is a co-equal contribution.

## 8. Figure architecture

### Figure 1 — TMSU heterogeneous-model unification architecture

Primary message: **what is being unified**.

Must show:

```text
Upper trial / test intent
        ↓
Capability_ID + Contract + Semantic Profile
        ↓
TMSU evidence-bearing boundary
   ↙                         ↘
OpenEaagles                  RadarSimPublic
Implementation_ID A          Implementation_ID B/C
```

Evidence/provenance must be visible but secondary in Figure 1.

### Figure 2 — Empirical ladder from unification to evidence qualification

Primary message: **why successful substitution is not enough**.

```text
BP → MS → SP → EQ → EB → EA → VU → LC
```

Persistent RF `UNKNOWN` strand runs from SP through LC.

### Figure 3 — Cumulative evidence versus non-monotonic qualification

Primary message: **the central lifecycle finding**.

Horizontal axis: lifecycle/configuration state.

Upper lane: append-only evidence accumulation.

Lower lane: ACTIVE / STALE / HISTORICAL / UNKNOWN / QUALIFIED state transitions.

Key annotation:

```text
Evidence history is provenance-monotonic;
qualification is not monotonic.
```

### Figure 4 — Positive carry-forward rule versus stop rule

Left: VU-01b — controlled provenance-only revision → typed delta carry-forward.

Right: LC-01 — model algorithm + Implementation_ID change → automatic inheritance rejected; fresh affected qualification required.

Key annotation:

```text
same contract != qualification inheritance
```

## 9. Main tables

### Table 1 — TMSU identities and implementation states

OpenEaagles / RadarSimPublic-CV / RadarSimPublic-CA.

### Table 2 — Frozen evidence chain

Each experiment: question, intervention, result, quantitative anchor, supported inference, explicit boundary.

### Table 3 — Change class to evidence action

Metadata / adapter provenance / semantic mapping / execution environment / model algorithm / Implementation_ID / capability contract / upper trial.

## 10. Manuscript production sequence

Production proceeds in the following order only:

```text
1. freeze dual thesis and RQs
2. freeze Claim-Evidence Matrix
3. build main figures from frozen evidence
4. rewrite Methods by RQ rather than experiment chronology
5. rewrite Results by RQ
6. compress Discussion around four contributions
7. sentence-level Source / Evidence / Inference audit
8. reference verification
9. freeze Markdown manuscript v1.0
10. only then create submission-formatted Word/PDF if requested
```

## 11. Stopping rule

No new model, transport, API, broker, registry, or large scenario expansion is added unless a concrete manuscript claim remains unsupported after the sentence-level evidence audit.

The empirical mechanism is frozen. The next work is **paper production, not mechanism expansion**.
