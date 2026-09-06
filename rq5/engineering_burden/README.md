# EB-01 Paired Engineering-Burden Experiment

Status: **preregistered controlled benchmark**

Research target: **RQ5 / H1**

## Question

For the same frozen RadarSimPublic implementation and the same frozen E2 trial, does the TMSU binding path reduce engineering change surface and downstream reassessment radius relative to a conventional point-to-point integration in which model-specific imports, configuration, execution and semantic projection are coded directly into the upper trial orchestrator?

This benchmark deliberately does **not** claim to measure human engineer-hours.

## Common task

Both arms shall:

- use RadarSimPublic commit `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`;
- use the same frozen `trial_spec.json` and `capability_contract.json`;
- execute the same 16 scenario cases;
- produce canonical outputs that pass the same structural trace requirements.

### Arm A — TMSU binding path

Use the already frozen generic orchestrator plus:

- `bindings/radarsimpublic_tws.json`;
- `radarsimpublic_adapter.py`.

Model-specific dependencies shall remain outside the upper orchestrator.

### Arm B — bespoke direct path

Use a controlled conventional point-to-point integration benchmark in which the upper trial orchestrator directly imports and configures RadarSimPublic and directly performs scenario/output mapping.

The bespoke arm is intentionally written as a competent minimal direct integration, not as an artificially degraded implementation.

## Common start state

The integration baseline is DTEP commit:

`a3a6cdaa4365e56620f3ecd0a38f15003697ed93`

This is the frozen E2 state immediately before the real RadarSimPublic binding was added.

## Primary objective endpoints

1. upper-orchestrator line churn relative to the common start state;
2. whether the upper orchestrator hash/content must change;
3. direct concrete-model dependency references present in upper trial code;
4. reassessment radius after a semantic-mapping-only update, using the frozen EQ-01 dependency interpretation.

## Secondary descriptive endpoints

- physical/nonblank lines in TMSU adapter + binding;
- bespoke upper-core additions/deletions;
- number of isolated model-specific boundary artifacts;
- output identity across the matched 16 cases.

Total LOC is **not** the sole or primary burden metric. A design may add boundary code while reducing high-risk changes to shared trial logic.

## Prespecified decision

EB-01 passes only if:

- both arms execute all 16 matched cases;
- matched canonical outputs are byte-identical;
- TMSU leaves the frozen upper orchestrator unchanged;
- bespoke direct integration changes the upper orchestrator;
- TMSU introduces no direct RadarSimPublic dependency into upper trial code;
- bespoke direct integration does introduce such a dependency;
- for a semantic-mapping-only update, the TMSU evidence-reassessment radius is smaller than the bespoke path.

## H1 boundary

Original H1 states that integration time is lower. EB-01 does not observe human engineer time and therefore cannot directly confirm H1.

Possible result language:

- `RQ5`: bounded evidence on objective engineering-change burden;
- `H1`: remains not directly tested for time, even if change-surface proxies favor TMSU.

A later human/instrumented replication would be required for a literal engineer-time claim.
