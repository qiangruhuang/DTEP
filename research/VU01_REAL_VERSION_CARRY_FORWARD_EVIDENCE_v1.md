# VU-01 Real Version Update & Evidence Carry-Forward Evidence v1.1

Status: **Corrected frozen result: VU-01a strict-byte FAIL; VU-01b numerical carry-forward PASS**

Research target: **RQ4/RQ5 refinement — cumulative evidence under a real lifecycle change**

## 1. Correction history

The first VU-01 implementation used exact SHA-256 identity of floating-point canonical traces as the cross-run carry-forward criterion. One early run happened to satisfy 16/16 exact identity, but a later full branch-head rerun exposed that criterion as non-reproducible:

```text
VU-01a strict byte criterion
Run: 34001315535
Head: 499486e27fa7b4a4cbd44b3ad2e1ab35e420b627
Result: FAIL
Exact trace identity: 8 / 16
```

The failed run is retained as evidence and is not discarded.

Artifact-level comparison against the prior MS-01 v2 RadarSimPublic traces showed that the non-identical moving-target traces differed only at floating-point representation scale. Across the 16 cases, the maximum observed absolute differences were approximately:

```text
range_m:          3.64e-12 m
range_rate_mps:   5.68e-14 m/s
quality:          2.22e-16
average_signal_db:7.11e-15 dB
```

Static cases remained byte-identical. A representative first difference was:

```text
33.02970199401323
vs
33.029701994013237
```

The frozen RadarSimPublic constant-velocity filter itself propagates state and covariance through deterministic matrix operations; its `Q` is a covariance matrix rather than a sampled random process. Radar SNR is calculated from deterministic radar-equation arithmetic and `np.log10`. The observed issue is therefore treated as cross-run floating-point numerical representation sensitivity, not evidence of stochastic model behavior.

This exposed an important methodological error: **cross-run evidence carry-forward for a numerical model must not assume byte identity unless the execution environment guarantees bitwise reproducibility.**

## 2. Corrected VU-01b criterion

VU-01b preserves discrete trace structure exactly and normalizes only floating fields for the cross-run representation comparison:

```text
META records: exact
S records:    exact
T frame/id:   exact
T float fields: decimal normalization to 9 places
```

The normalized traces are then hashed with SHA-256.

This is a numerical-representation criterion for lifecycle evidence comparison; it is **not** a radar-fidelity tolerance.

A negative control deliberately perturbs one `range_m` value by `1e-6 m`, three orders of magnitude above the normalization resolution, and the comparator must reject it.

## 3. Controlled real change

The actual lifecycle change remains unchanged from VU-01a:

```text
old adapter:
mre2/model_substitution/radarsimpublic_adapter.py

new adapter:
mre2/model_substitution/radarsimpublic_adapter_v2.py

old binding version: 1.0.0
new binding version: 1.1.0
```

The new revision changes provenance evidence only and delegates canonical trace generation to the original adapter logic.

Frozen invariants:

```text
RadarSimPublic upstream commit:
8b63f824a5744c1b3a3fca5e948fa7c59f897b17

trial_spec SHA-256:
af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf

orchestrator SHA-256:
b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db

capability_contract SHA-256:
f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b

Capability_ID / Implementation_ID / Contract_ID / Semantic_Profile_ID:
unchanged

declared semantic mapping:
unchanged
```

## 4. Evidence state immediately after change

Before reassessment, the dependency rules conservatively produce:

```text
ACTIVE:
  BP-01
  SP-01

STALE for current configuration:
  MS-01-v2
  EQ-01-v1
  EB-01-v1

HISTORICALLY RETAINED:
  BP-01
  MS-01-v2
  SP-01
  EQ-01-v1
  EB-01-v1
```

Thus a version change changes applicability, not history.

## 5. Corrected delta-requalification result

Corrected run:

```text
VU-01b
Run: 34001585171
Tested head: a55e48a169c3f398b6ff4e4229adfdb75fd1777d
Artifact ID: 9979638632
Artifact SHA-256:
86abdfc4cb8aca8e5778556fa86b20e59cdd222c8fdd88817b0967134828fb76
Decision: PASS
```

Updated binding execution:

```text
cases executed:       16 / 16
cases passed:         16 / 16
contract-valid:       16 / 16
```

Cross-run comparison against the original MS-01 v2 RadarSimPublic artifact:

```text
9-decimal normalized equivalence: 16 / 16
negative-control perturbation:     correctly rejected
```

Exact byte identity is retained only as a diagnostic, not as the portability gate. Depending on the runner, exact identity may be 8/16 or 16/16; this variability is itself why the corrected criterion is necessary.

## 6. Current evidence carry-forward

VU-01b reuses without re-execution:

```text
BP-01
SP-01
```

and performs delta reassessment of the current decision path:

```text
MS-01 architectural substitution
EQ-01 intended-use screening
```

`EB-01-v1` is retained historically and is not silently declared current for the revised configuration.

Current states after VU-01b:

```text
architectural substitution:
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE

kinematic intended use:
QUALIFIED_WITHIN_EVIDENCE

RF-performance intended use:
UNKNOWN

RF semantic relation:
UNKNOWN
```

The real `UNKNOWN` therefore survives a successful version update and corrected requalification. Maintenance success does not resolve an unrelated evidence gap.

## 7. Research interpretation

VU-01 produced two useful results rather than one uniformly positive result.

First, the failed strict-byte rerun demonstrates that the **evidence rule itself must be qualified**. A deterministic numerical model can be behaviorally stable while differing in last-bit floating representation across executions. Reusing an inappropriate evidence criterion would make the evidence-management system brittle.

Second, VU-01b demonstrates the intended lifecycle behavior:

```text
real change
  -> identify affected evidence
  -> retain all historical evidence
  -> reuse unaffected evidence
  -> apply an evidence-type-appropriate delta criterion
  -> append delta evidence
  -> reconstruct current intended-use state
```

This is stronger than a simple claim that evidence can be stored or reused.

## 8. Combined EA-01 + VU-01 contribution

EA-01 established that:

```text
provenance accumulation is monotonic
qualification is not monotonic
```

VU-01 adds that:

```text
evidence criteria are themselves typed by model/execution behavior
```

Therefore cumulative digital T&E evidence requires at least three separations:

```text
historical retention != current applicability
current applicability != intended-use qualification
numerical equivalence != byte identity
```

Together they support the paper-level proposition:

> Evidence can accumulate without being blindly inherited. After a controlled version change, affected evidence may be made stale, unaffected evidence retained, and current qualification restored by delta evidence using a comparison rule appropriate to the numerical behavior of the model; unresolved evidence gaps remain explicit.

## 9. Boundary of inference

VU-01b remains deliberately narrow:

- it is an adapter/binding provenance revision, not an upstream model-algorithm update;
- 9-decimal normalization is a representation-comparison rule, not a model-validity threshold;
- the correction was introduced after VU-01a exposed the inadequacy of exact byte identity and must therefore be described transparently as a corrected analysis;
- major algorithm/version changes may require a fuller reassessment;
- authoritative VV&A/accreditation remains outside this gate;
- enterprise-scale evidence management is not established.

## 10. Evidence identities

```text
Diagnostic strict-byte failure:
Run 34001315535
Head 499486e27fa7b4a4cbd44b3ad2e1ab35e420b627
Decision FAIL
Exact identity 8/16

Corrected evidence set:
vu01b.tws.numeric-version-carry-forward.2026-09-06.v1
Run 34001585171
Head a55e48a169c3f398b6ff4e4229adfdb75fd1777d
Artifact 9979638632
Artifact SHA-256 86abdfc4cb8aca8e5778556fa86b20e59cdd222c8fdd88817b0967134828fb76
Decision PASS
```
