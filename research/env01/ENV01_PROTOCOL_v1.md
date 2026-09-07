# ENV-01 Protocol v1 — Minimal execution-environment closure

Status: **Frozen before execution**

## Objective

Test the currently defined but unexercised `EXECUTION_ENVIRONMENT` dependency in the TMSU evidence lifecycle without adding another capability class.

The experiment asks one bounded question:

> When the execution runtime changes while the FMU, capability meaning, model artifact, simulation invocation, host runner and evidence method remain fixed, does typed dependency analysis mark the prior execution evidence stale and require an evidence-type-appropriate delta reassessment before the current claim can be restored?

## Frozen change

The controlled change is the FMI importer/runtime only:

- source environment: `fmusim 0.9.0`, Linux x86_64 release
- changed environment: `fmusim 0.10.0`, Linux x86_64 release
- FMU: the same pinned Modelica Reference-FMUs `v0.0.40` FMI 3.0 `BouncingBall.fmu`
- interface: FMI 3.0 Co-Simulation
- stop time: 1 s
- output interval: 0.01 s
- outputs: `h`, `v`
- GitHub Actions job: both environments run sequentially on the same hosted runner instance

This is an `EXECUTION_ENVIRONMENT` change. It is not a model-algorithm, semantic-profile, capability-contract, trial, or capability-identity change.

## Repeats

Each runtime is executed **10 times** on the same runner.

Within-environment repeat criterion:

- all 10 CSV outputs must be byte-identical within the source environment;
- all 10 CSV outputs must be byte-identical within the changed environment.

This same-machine repeat is included to separate runtime-version effects from uncontrolled repeat variability in this deterministic micro-demonstration.

## Cross-environment delta comparator

The source reference trace and each changed-environment trace must have:

- identical CSV columns;
- identical row count;
- time values equal within `1e-15` s;
- `h` and `v` values equal within absolute tolerance `1e-12`.

Byte identity across environments will also be reported but is not required if the frozen numerical comparator passes.

## Dependency and lifecycle rule

The source execution evidence declares applicability dependencies including `EXECUTION_ENVIRONMENT`.

Given:

`Dep(E_source) ∩ Delta(C) = {EXECUTION_ENVIRONMENT}`

then the prior evidence becomes `STALE` for the changed environment before comparison. Historical provenance is retained.

If repeat consistency and the frozen numerical comparator pass, a new delta evidence item may restore the affected current claim as:

- lifecycle/applicability: `ACTIVE`
- decision/qualification: `PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE`

An unrelated semantic-profile evidence control whose dependencies exclude `EXECUTION_ENVIRONMENT` must remain `ACTIVE` without reassessment.

## Negative control

The evaluator will perturb one `h` value by `1e-6` in memory. The same frozen comparator must reject that synthetic trace. This confirms that the delta gate is not a vacuous PASS-through.

## Success criteria

ENV-01 passes only if all conditions hold:

1. the repository change-dependency mapping maps `EXECUTION_ENVIRONMENT` to the typed artifact `EXECUTION_ENVIRONMENT`;
2. the two runtime identities differ in fmusim version/binary identity while host OS/kernel/architecture are held constant within the job;
3. both 10-run same-machine repeat sets are internally byte-stable;
4. cross-environment numerical equivalence passes at the frozen thresholds;
5. the negative control is detected;
6. the source execution evidence transitions `ACTIVE -> STALE` for the changed environment;
7. delta evidence restores only the affected current claim, while unrelated evidence remains active.

## Inference boundary

ENV-01 tests the lifecycle mechanism for one deterministic FMI micro-demonstration and one runtime-version change. It does not establish portability across operating systems, hardware architectures, compilers, stochastic models, HLA federations, or arbitrary numerical stacks.