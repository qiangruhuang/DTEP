# Supplementary Tables v1.0

Status: **Submission supplement; WP1 evidence locked**

## Table S1. Frozen WP1 evidence-set provenance

| Evidence | Role | Frozen run / artifact anchor | Primary decision |
|---|---|---|---|
| BP-01 | legacy behavior preservation | OpenEaagles MRE-1 frozen evidence | PASS |
| MS-01 v2 | real heterogeneous substitution | GitHub Actions run `33971627414` | PASS |
| SP-01 | semantic precheck ablation | run `33977174819`; artifact `9972652058` | PASS |
| EQ-01 | intended-use qualification / evidence reuse | run `33998600234`; artifact `9978795799` | PASS |
| EB-01 | paired change-locality benchmark | run `33999279669`; artifact `9978993307` | PASS |
| EA-01 | evidence accumulation / lifecycle replay | frozen EA evidence set | PASS |
| VU-01a | strict-byte cross-run carry-forward criterion | run `34001315535` | **FAIL retained** |
| VU-01b | typed numerical carry-forward | run `34001585171`; artifact `9979638632` | PASS |
| LC-01 | algorithm-change inheritance stop rule | run `34004499753`; artifact `9980510984` | PASS for stop-rule test |

**Note.** VU-01a is intentionally retained because its failure motivated the corrected, evidence-type-aware VU-01b criterion. A PASS in later experiments does not overwrite that methodological failure.

## Table S2. SP-01 semantic ablation cases

| Case | Structural validation | Semantic decision | Reason |
|---|---|---|---|
| positive control | PASS | COMPATIBLE | all declarations match frozen semantic profile |
| range `m → km` | PASS | INCOMPATIBLE | unit mismatch |
| azimuth `rad → deg` | PASS | INCOMPATIBLE | unit mismatch |
| range-rate sign reversed | PASS | INCOMPATIBLE | sign-convention mismatch |
| ownship-relative → ECEF | PASS | INCOMPATIBLE | reference-frame mismatch |
| simulation frame → UTC epoch | PASS | INCOMPATIBLE | time-basis mismatch |
| RadarSimPublic RF quantity | PASS | UNKNOWN | `rf.signal_to_noise_ratio ?= rf.track_average_signal` unresolved |

## Table S3. EQ-01 intended-use cases

| Case | Required use / domain | Evidence issue | Decision |
|---|---|---|---|
| U1 | kinematic research use within frozen E2 envelope | required kinematic observables supported | `QUALIFIED_WITHIN_EVIDENCE` |
| U2 | RF-performance test use | RF semantic relation unresolved; comparative validity absent | `UNKNOWN` |
| U3 | 50 km use | outside executed evidence domain | `UNKNOWN` |
| U4 | use with explicit range-unit conflict | semantic incompatibility | `NOT_QUALIFIED` |

## Table S4. EB-01 paired integration metrics

| Metric | TMSU route | Direct point-to-point route |
|---|---:|---:|
| matched cases executed | 16/16 | 16/16 |
| canonical outputs identical between routes | 16/16 | 16/16 |
| upper-orchestrator additions | 0 | 111 |
| upper-orchestrator deletions | 0 | 49 |
| upper-orchestrator line churn | 0 | 160 |
| direct RadarSimPublic references in shared core | 0 | 9 |
| model-specific boundary artifacts | 2 | 0 |
| boundary physical lines | 224 | n/a |
| reassessment scopes after semantic-mapping change | 1/4 | 3/4 |

**Interpretation.** The supported benefit is change locality and smaller reassessment propagation, not fewer total source lines or measured engineer time.

## Table S5. EA-01 evidence-lifecycle state vocabulary

| State | Meaning | Permitted interpretation |
|---|---|---|
| ACTIVE | evidence dependencies remain applicable to current configuration | may support current claim within declared domain |
| STALE | evidence is retained but one or more dependencies intersect the current change | cannot support current claim without reassessment |
| HISTORICAL | evidence remains auditable for prior configuration/state | retained for traceability; not automatically current |
| SUPERSEDED | a newer evidence item replaces the current decision role while old evidence remains preserved | old record remains visible in provenance history |
| UNKNOWN | evidence is insufficient for the requested semantic/use claim | neither implicit PASS nor proof of invalidity |

## Table S6. VU-01 numerical comparison audit

| Item | VU-01a | VU-01b |
|---|---|---|
| change class | provenance-only adapter/binding revision | same |
| discrete record comparison | exact | exact |
| floating comparison | exact byte/SHA | 9-decimal normalized representation |
| exact-equivalent cases on failed full rerun | 8/16 | diagnostic only |
| accepted normalized cases | n/a | 16/16 |
| sensitivity control | none sufficient for revised criterion | `+1e-6 m` perturbation rejected |
| final lifecycle interpretation | criterion FAIL | selective carry-forward supported for tested change |

## Table S7. LC-01 old-envelope and discrimination results

| Metric | Result |
|---|---:|
| CV old-envelope execution | 16/16 |
| CA old-envelope execution | 16/16 |
| CV–CA normalized-equivalent cases | 12/16 |
| CV–CA normalized-different cases | 4/16 |
| max absolute range difference in maneuver challenge | 109.0755 m |
| max absolute range-rate difference in maneuver challenge | 67.6108 m/s |
| automatic implementation-specific carry-forward | REJECTED |
| fresh CA architectural state | `PASS_FRESH_EXECUTION` |
| CA kinematic intended-use state | `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE` |

**Boundary.** The maneuver challenge establishes algorithm discrimination in a constructed sensitivity scenario. It does not establish operational superiority or model validation.

## Table S8. Claim-to-evidence crosswalk

| Manuscript claim class | Primary evidence | Main-text location |
|---|---|---|
| heterogeneous model unification | BP-01 + MS-01 | RQ1 / Figure 1 |
| structural vs semantic qualification | SP-01 | RQ2 / Figure 2 |
| intended-use-dependent qualification | EQ-01 | RQ2 / Table 1 |
| change locality | EB-01 | RQ3 / Tables 2–3 |
| cumulative evidence / selective applicability | EA-01 | RQ3 / Figure 3 |
| comparator failure and correction | VU-01a/b | RQ4 / Figures 2 and 4 |
| explicit evidence-inheritance stop rule | LC-01 | RQ4 / Figure 4 |
