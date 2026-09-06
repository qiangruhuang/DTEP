# EB-01 Paired Engineering-Burden Evidence v1.0

Status: **Frozen result: PASS**

Research target: **RQ5 / H1**

Evidence run:

- DTEP branch: `rq5-engineering-burden`
- GitHub Actions run: `33999279669`
- Tested DTEP head: `cb171bd885089a02c98f39b0c0976a27ad788274`
- Common integration baseline: `a3a6cdaa4365e56620f3ecd0a38f15003697ed93`
- RadarSimPublic: `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`
- Artifact: `rq5-eb01-engineering-burden-evidence`
- Artifact ID: `9978993307`
- Artifact SHA-256: `14b009c43773e93f678c7f2a2c31e2e4019346e1b03143cab7bb0a8117886368`

## 1. Question

EB-01 asks whether the TMSU binding approach reduces **engineering change surface and reassessment radius** for the same real heterogeneous integration task, relative to a conventional point-to-point path in which model-specific imports, configuration and semantic projection are placed directly inside the upper trial orchestrator.

The experiment does not equate code size with engineer time and does not directly observe human engineer-hours.

## 2. Paired design

Both arms onboard the same frozen RadarSimPublic implementation into the same frozen E2 trial.

Common conditions:

```text
RadarSimPublic commit:
8b63f824a5744c1b3a3fca5e948fa7c59f897b17

Trial:
E2-TWS-MODEL-SUBSTITUTION-v1

Cases:
16

Contract:
tmsu.sensor.tws.track.v1
```

### Arm A — TMSU binding path

The previously frozen generic orchestrator is retained unchanged. Model-specific integration is isolated to:

```text
mre2/model_substitution/bindings/radarsimpublic_tws.json
mre2/model_substitution/radarsimpublic_adapter.py
```

### Arm B — bespoke direct path

A controlled point-to-point integration is constructed from the same common start state. RadarSimPublic-specific imports, parameterization, execution and output projection are integrated directly into the upper trial orchestrator.

The bespoke arm is a competent minimal direct integration benchmark, not an intentionally degraded implementation.

## 3. Functional-equivalence control

The burden comparison is only interpretable if the two arms perform the same task.

Result:

```text
TMSU cases passed:       16 / 16
Bespoke cases passed:    16 / 16
Matched cases:           16
Byte-identical outputs:  16 / 16
```

Thus the comparison is not between different functional outcomes. For all 16 frozen cases:

```text
Y_TMSU(i) == Y_bespoke(i)
```

at the canonical trace interface.

## 4. Initial integration change surface

### TMSU path

```text
upper orchestrator modified:              no
upper orchestrator additions:             0
upper orchestrator deletions:             0
upper orchestrator line churn:            0
direct RadarSimPublic references in core: 0
model-specific boundary artifacts:        2
boundary physical lines:                  224
boundary nonblank lines:                  199
```

### Bespoke path

```text
upper orchestrator modified:              yes
upper orchestrator additions:             111
upper orchestrator deletions:             49
upper orchestrator line churn:            160
direct RadarSimPublic references in core: 9
model-specific boundary artifacts:        0
```

The primary result is therefore not that TMSU necessarily writes less code. In this benchmark the isolated TMSU boundary contains **224 physical lines**, while the direct path changes **160 upper-core lines**.

The supported result is different:

> TMSU relocates model-specific integration code out of the shared upper trial and reduces change to the common trial core from 160 lines to zero.

This is a change-radius and coupling result, not a raw-LOC superiority result.

## 5. Update / reassessment radius

A semantic-mapping-only change was evaluated using the already frozen EQ-01 dependency interpretation.

### TMSU binding path

```text
BP-01: REUSE
SP-01: REASSESS
MS-01: REUSE
upper-orchestrator regression: REUSE
```

Reassessment scopes:

```text
1 / 4
```

### Bespoke direct path

Because semantic mapping is embedded in the upper orchestrator:

```text
BP-01: REUSE
SP-01: REASSESS
MS-01: REASSESS
upper-orchestrator regression: REASSESS
```

Reassessment scopes:

```text
3 / 4
```

Thus the same semantic update has a smaller downstream validation radius under the TMSU separation.

Considering the three formal gates alone:

```text
TMSU:   1 / 3 gates reassessed
Bespoke:2 / 3 gates reassessed
```

## 6. EB-01 decision

All preregistered predicates passed:

| Predicate | Result |
|---|---|
| both arms execute all 16 cases | PASS |
| matched outputs byte-identical | PASS |
| TMSU preserves frozen upper orchestrator | PASS |
| bespoke direct path changes upper orchestrator | PASS |
| no direct concrete-model dependency in TMSU upper core | PASS |
| direct concrete-model dependency present in bespoke upper core | PASS |
| semantic-update reassessment radius smaller under TMSU | PASS |

Overall:

```text
EB-01 = PASS
```

## 7. Answer to RQ5

EB-01 gives a **bounded positive answer** to the engineering-burden part of RQ5:

> For the same RadarSimPublic onboarding task and identical 16-case outputs, the TMSU path preserved the frozen upper trial core, isolated model-specific dependencies behind two boundary artifacts, and reduced the reassessment radius of a subsequent semantic-mapping change.

This is objective evidence of lower **shared-core change burden and requalification propagation**.

It is not evidence that every integration task will contain fewer total lines or require less machine execution time.

## 8. Status of H1

Original H1 is:

> integration time is lower than current/manual integration.

EB-01 does **not** directly measure engineer time.

Therefore:

```text
H1 literal time claim = NOT DIRECTLY TESTED
```

The experiment supplies mechanistic/proxy evidence consistent with a potential time reduction:

```text
upper-core churn:          0 vs 160
direct core dependencies:  0 vs 9
semantic-update reassess:  1/4 vs 3/4 scopes
```

but those quantities cannot be converted into minutes or engineer-hours without an instrumented human/developer replication.

Accordingly, the paper should not report a percentage time saving from EB-01.

## 9. Interpretation

The result suggests that the engineering advantage of TMSU is not primarily "less code."

It is:

```text
model-specific change
        ↓
isolated boundary
        ↓
stable upper trial
        ↓
smaller evidence invalidation radius
```

This is especially relevant for digital T&E, where the cost of a modification includes not only implementing code but also determining which test evidence must be repeated.

## 10. Boundary of inference

EB-01 does not establish:

- engineer-hour or calendar-time reduction;
- enterprise-wide integration savings;
- superiority for every capability class;
- lower total source LOC for every integration;
- reduced cost in a real acquisition organization;
- optimality of the controlled bespoke implementation.

The bespoke arm is a controlled counterfactual point-to-point integration, not an observational sample of an operational legacy engineering team.

## 11. Evidence identity

```text
Evidence_Set_ID:
eb01.tws.paired-engineering-burden.2026-09-06.v1

CI Run:
33999279669

Tested DTEP head:
cb171bd885089a02c98f39b0c0976a27ad788274

Artifact ID:
9978993307

Artifact SHA-256:
14b009c43773e93f678c7f2a2c31e2e4019346e1b03143cab7bb0a8117886368
```
