# LC-01 Model-Algorithm Change Carry-Forward Boundary Evidence v1.0

Status: **Frozen result: PASS**

Research role: **WP1 stopping-rule / limit experiment for evidence lifecycle management**

Evidence run:

- DTEP branch: `lc01-algorithm-change-boundary`
- GitHub Actions run: `34004499753`
- Tested DTEP head: `eafc73e928a2585cc0226c548e53686ecefb11d9`
- Evidence artifact: `lc01-algorithm-change-carry-forward-boundary-evidence`
- Artifact ID: `9980510984`
- Artifact SHA-256: `2357ce0cea7f656c016e62edcacc0d0d2a60195bc6422de633c059e4c7c5b15d`
- RadarSimPublic frozen commit: `8b63f824a5744c1b3a3fca5e948fa7c59f897b17`

## 1. Question

VU-01b showed that a provenance-only adapter/binding revision could restore affected current claims with typed delta evidence rather than resetting the complete evidence base.

LC-01 asks where that carry-forward logic must stop:

> When the selected model algorithm and `Implementation_ID` change while the upper trial, capability contract and declared semantic mapping remain frozen, may prior implementation-specific qualification be inherited from the preceding configuration?

The preregistered answer is conservative:

```text
MODEL_ALGORITHM change
+ Implementation_ID change
-> no automatic inheritance of implementation-specific qualification
```

This does not imply `rerun everything`. Evidence whose declared dependencies are unchanged remains reusable.

## 2. Controlled substantive change

The previous RadarSimPublic configuration used the real upstream constant-velocity Kalman-filter helper:

```text
src.tracking.kalman_filters.initialize_constant_velocity_filter
Implementation_ID = radarsimpublic.radar-kf@8b63f82
```

LC-01 changes the selected upstream algorithm to:

```text
src.tracking.kalman_filters.initialize_constant_acceleration_filter
Implementation_ID = radarsimpublic.radar-ca-kf@8b63f82
```

The upstream repository commit remains identical. No upstream RadarSimPublic source file is patched.

The following upper artifacts remain frozen:

```text
trial_spec.json
SHA-256 = af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf

orchestrator.py
SHA-256 = b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db

capability_contract.json
SHA-256 = f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

The capability, contract, semantic-profile identity and declared field mappings also remain unchanged.

Thus the experiment isolates a change that is deeper than VU-01b but does not artificially introduce a new transport, broker, registry or upper-trial branch.

## 3. Upstream algorithm sanity probe

A diagnostic probe verified the frozen upstream constant-acceleration helper before interpreting lifecycle results.

For the 2-D CA filter, the observed dimensions were consistently:

```text
state x: 6
P:       6 x 6
F:       6 x 6
H:       2 x 6
Q:       6 x 6
R:       2 x 2
```

The first update and first prediction both completed successfully.

An earlier development run produced a non-reproduced state-dimension execution error. Because the instrumented rerun and final evidence run both passed the explicit dimension probe and CA execution, LC-01 does not attribute that transient failure to a demonstrated persistent upstream defect. The failed run remains in the CI history as development/audit evidence.

## 4. Old E2 envelope is not a sufficient carry-forward rule

Both configurations were executed under the same frozen 16-case E2 envelope.

Result:

```text
CV cases executed / valid: 16 / 16
CA cases executed / valid: 16 / 16
```

After exact discrete comparison and 9-decimal normalization of canonical floating fields:

```text
CV vs CA behavior-equal cases:      12 / 16
CV vs CA behavior-different cases:   4 / 16
```

This is an important limit result. Most old-envelope cases did not discriminate the two algorithm choices at the frozen observation criterion, while four did.

Therefore neither of the following is a safe lifecycle rule:

```text
same contract -> inherit qualification
```

or

```text
old scenario envelope looks similar -> inherit qualification
```

A substantive implementation change must be classified by what changed, not only by whether a previously convenient regression set happens to expose the difference.

## 5. Discriminating maneuver challenge

To verify that the CV and CA choices are genuinely behaviorally distinguishable, LC-01 added one bounded sensitivity challenge outside the original E2 envelope:

```text
dt:                         0.02 s
frames:                     500
initial range:              20 km
azimuth:                    20 deg
initial closing speed:      150 m/s
closing acceleration:       15 m/s^2
measurement std:            0.0749481145 m
```

The challenge produced:

```text
max |CA range - CV range|:          109.0754918963 m
max |CA range-rate - CV range-rate|: 67.6107619584 m/s

CV range RMSE:                       49.3549496311 m
CA range RMSE:                        0.0453110175 m
CV range-rate RMSE:                  39.9657741219 m/s
CA range-rate RMSE:                   0.5330317957 m/s
```

`materially_discriminating = true`.

These numbers are used only to demonstrate algorithm discrimination under this constructed maneuver. LC-01 does **not** infer that CA is operationally superior, more valid, or accredited for a radar T&E use.

## 6. Carry-forward decision

All 12 LC-01 predicates passed.

The lifecycle decision is:

```text
automatic carry-forward:
REJECTED_FRESH_IMPLEMENTATION_QUALIFICATION_REQUIRED
```

Evidence retained/reused without re-execution:

```text
BP-01
SP-01
```

because the OpenEaagles wrapper behavior evidence and the declared semantic mapping dependencies were not changed by selecting a different RadarSimPublic tracking algorithm.

Evidence retained historically but stale for the new CA configuration:

```text
MS-01-v2-CV
EQ-01-v1-CV
EB-01-v1-CV
VU-01b-CV
```

Fresh execution re-established only:

```text
MS-01 architectural execution for CA = PASS_FRESH_EXECUTION
```

The current kinematic intended-use state is deliberately **not** inherited:

```text
kinematic intended use for CA:
UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
```

The unresolved RF relation also remains:

```text
RF semantic relation:          UNKNOWN
RF-performance intended use:   UNKNOWN
```

## 7. What “fuller requalification” means here

LC-01 rejects two undesirable extremes:

```text
Extreme A:
algorithm changed -> delete/rerun every historical evidence item

Extreme B:
contract unchanged -> inherit every prior qualification
```

The supported lifecycle behavior is:

```text
substantive algorithm change
        ↓
retain complete evidence history
        ↓
reuse evidence whose dependencies are unaffected
        ↓
make prior implementation-specific evidence stale for the new configuration
        ↓
run fresh affected architectural / behavior / fitness evidence as required
        ↓
reconstruct current intended-use decision
```

Thus `fuller requalification` means broader **affected-scope** reassessment than VU-01b, not complete evidentiary reset.

## 8. LC-01 decision

All frozen predicates passed:

| Predicate | Result |
|---|---|
| same frozen upstream repository commit | PASS |
| same capability / contract / semantic profile | PASS |
| same declared semantic mapping | PASS |
| substantive selected algorithm component changed | PASS |
| implementation identity changed | PASS |
| frozen upper trial unchanged | PASS |
| old CV configuration executes all 16 E2 cases | PASS |
| new CA configuration executes all 16 E2 cases | PASS |
| maneuver challenge discriminates algorithms | PASS |
| automatic carry-forward rejected | PASS |
| unrelated semantic `UNKNOWN` preserved | PASS |
| new intended-use qualification not blindly inherited | PASS |

Overall:

```text
LC-01 = PASS
```

## 9. Supported inference

LC-01 supports the bounded claim:

> A substantive model-algorithm/implementation-identity change crosses the provenance-only carry-forward envelope demonstrated in VU-01b. Unaffected evidence can remain active and all historical evidence can remain auditable, but prior implementation-specific qualification cannot be inherited merely because the upper contract, semantic mapping or most cases in an older scenario envelope remain unchanged.

This establishes an empirical **stop rule for evidence carry-forward** within WP1.

## 10. Combined lifecycle result

The combined VU-01b + LC-01 result is:

```text
provenance-only adapter/binding revision
-> typed delta evidence may restore affected current claims

substantive model-algorithm / Implementation_ID revision
-> automatic implementation-specific carry-forward rejected
-> fresh affected qualification required
```

The research contribution is therefore not generic reuse. It is **controlled evidence inheritance with an explicit requalification boundary**.

## 11. Boundary of inference

LC-01 does not establish:

- operational validity of either RadarSimPublic tracking algorithm;
- superiority of CA over CV outside the constructed challenge;
- authoritative VV&A/accreditation;
- that every future algorithm change requires exactly the same gates;
- portfolio-scale organizational savings;
- enterprise-scale evidence-store performance.

The experiment demonstrates the lifecycle mechanism and its stopping rule in one real public model codebase and one frozen capability class.

## 12. Evidence identity

```text
Evidence_Set_ID:
lc01.tws.model-algorithm-carry-forward-boundary.2026-09-06.v1

CI Run:
34004499753

Tested DTEP head:
eafc73e928a2585cc0226c548e53686ecefb11d9

Artifact ID:
9980510984

Artifact SHA-256:
2357ce0cea7f656c016e62edcacc0d0d2a60195bc6422de633c059e4c7c5b15d
```
