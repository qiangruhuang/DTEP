# ENV-01 Execution-Environment Evidence v1

Status: **Frozen empirical evidence — v2.5 Experimental Revision Freeze**

## Question

Does a declared `EXECUTION_ENVIRONMENT` change correctly invalidate affected current execution evidence while preserving historical evidence, and can the affected claim be restored by evidence-type-appropriate delta reassessment when behavior is preserved?

## Frozen configuration

The same Modelica Reference-FMUs v0.0.40 FMI 3.0 `BouncingBall.fmu` was executed by two released Linux x86_64 `fmusim` runtimes in one GitHub Actions job:

| Field | Source environment | Changed environment |
|---|---|---|
| Runtime | `fmusim 0.9.0` | `fmusim 0.10.0` |
| Runtime binary SHA256 | `fbf3f93465e1f30b795220cb642dc56cf32812e14eb6bb9fab7dcfceb1eb476b` | `c23c1ceec97d1f426521e20def35093a58baa079309f30ada4cca683ca3263e4` |
| FMU SHA256 | `4b6c1034f644122e10faa346b2c44549d8634d427a32a28eebcf0d893a66efec` | same |
| Interface | FMI 3 Co-Simulation | same |
| OS | Linux | same |
| Kernel | `6.17.0-1022-azure` | same |
| Architecture | x86_64 | same |
| Hosted runner | `GitHub Actions 1000000202` | same |

Only runtime version and runtime-binary identity differed among the frozen environment-identity fields.

The simulation invocation was fixed at 0–1 s, 0.01 s output interval, with `h` and `v` as outputs.

## Same-machine repeat control

Each runtime was executed 10 times on the same hosted runner.

```text
fmusim 0.9.0: 10/10 byte-identical; unique trace hashes = 1
fmusim 0.10.0: 10/10 byte-identical; unique trace hashes = 1
```

This establishes repeat stability for this deterministic micro-demonstration on the tested runner. It is not a general reproducibility claim for all FMUs or numerical models.

## Cross-environment comparison

The preregistered comparator required identical columns and row counts, time difference ≤ `1e-15 s`, and absolute `h`/`v` difference ≤ `1e-12`.

All 10 changed-environment traces passed against the source reference:

```text
10/10 numerical-equivalence PASS
maximum absolute time difference = 0.0 s
maximum absolute state difference = 0.0
```

The source and changed reference traces were also byte-identical. Byte identity was observed but was not required by the frozen decision rule.

## Negative control

One `h` value was perturbed by `+1e-6`. The same comparator rejected the synthetic trace:

```text
maximum absolute state difference = 1.000000000001e-6
threshold = 1e-12
negative-control detection = PASS
```

The delta gate therefore did not operate as an unconditional carry-forward mechanism.

## Typed dependency result

The frozen change-dependency profile maps:

```text
EXECUTION_ENVIRONMENT -> {EXECUTION_ENVIRONMENT}
```

The source execution evidence declared dependencies on:

```text
CAPABILITY
IMPLEMENTATION
EXECUTION_ENVIRONMENT
EVIDENCE_METHOD
```

Therefore:

```text
Dep(E_source) ∩ Delta(C) = {EXECUTION_ENVIRONMENT}
```

and the original execution evidence became stale for the changed configuration.

The semantic-control evidence depended on `SEMANTIC_PROFILE` and `CAPABILITY_CONTRACT`; its dependency intersection with this change was empty, so it remained active without reassessment.

## Lifecycle transition

Observed lifecycle behavior:

```text
source execution evidence:
ACTIVE -> STALE
historical provenance retained

new delta evidence:
repeat control PASS
cross-environment comparator PASS
negative control PASS

restored current execution/conformance claim:
ACTIVE
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE

unaffected semantic-control evidence:
ACTIVE -> ACTIVE
```

## Decision

**ENV-01: PASS.**

The experiment closes the previously unexercised `EXECUTION_ENVIRONMENT` dependency for one deterministic FMI 3 Co-Simulation runtime-version transition. It demonstrates selective staleness and evidence-type-aware restoration of the affected execution/conformance claim.

## Inference boundary

This evidence does not establish portability across operating systems, hardware architectures, compilers, stochastic models, HLA federations, or arbitrary numerical stacks. It does not validate physical-model fidelity and does not create broader intended-use fitness qualification.

## Reproducibility anchor

```text
Repository: qiangruhuang/DTEP
Branch: v2.5-experimental-freeze
Workflow run: 34160760402
Successful implementation commit: 5036f60d702b71e437f871b1614ddac6a3b2a8c5
Artifact: v25-fmi-bl-env-experimental-freeze-evidence
Artifact ID: 10032510819
Artifact SHA256: f691453772dd3746c63b72dab92e5a118c7b6f5bd1b38dcd7ab0ecc8c32d54d7
```
