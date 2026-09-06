# Manuscript Method–Result–Claim Audit v2.0

Status: **Audit against `MANUSCRIPT_DRAFT_v0_3.md` and WP1 frozen evidence**

Date: 2026-09-06

Purpose: prevent the manuscript from silently strengthening claims beyond the frozen evidence chain.

## 1. Audit rule

Each manuscript statement belongs to exactly one primary class:

```text
EMPIRICAL
DESIGN
EXTERNAL_SOURCE
INFERENCE
LIMITATION
```

Statements that combine classes should be split in final editing.

## 2. RQ-level consistency audit

| RQ | Method | Frozen result | Manuscript claim | Audit |
|---|---|---|---|---|
| RQ1 heterogeneous unification | BP-01 + MS-01 | BP 16/16 exact; MS 16/16 + 16/16, zero upper-trial edits | stable capability boundary supports bounded legacy preservation and real heterogeneous substitution | CONSISTENT |
| RQ2 semantics / intended use | SP-01 + EQ-01 | 5/5 injected mismatches rejected; RF UNKNOWN; 4/4 intended-use decisions | structural PASS does not imply semantic compatibility or general fitness | CONSISTENT |
| RQ3 accumulation / applicability | EB-01 + EA-01 | change locality; evidence 1→5; history retained; selective staleness; UNKNOWN persists | evidence history can accumulate while current applicability remains conditional | CONSISTENT |
| RQ4 bounded inheritance | VU-01a/b + LC-01 | byte comparator FAIL; typed VU PASS; algorithm change rejects inheritance | lifecycle can both carry evidence forward and stop inheritance | CONSISTENT |

## 3. Numerical audit

| Manuscript quantity | Frozen source | Audit |
|---|---|---|
| BP-01 16/16 exact | BP-01 | VERIFIED |
| MS-01 OpenEaagles 16/16 | MS-01 v2 | VERIFIED |
| MS-01 RadarSimPublic 16/16 | MS-01 v2 | VERIFIED |
| MS-01 0 upper-trial artifacts modified | MS-01 v2 | VERIFIED |
| cross-implementation traces different 16/16 | MS-01 v2 | VERIFIED |
| SP mismatch rejection 5/5 | SP-01 | VERIFIED |
| EQ decisions 4/4 | EQ-01 | VERIFIED |
| EB upper-core churn 0 vs 160 | EB-01 | VERIFIED |
| EB direct core references 0 vs 9 | EB-01 | VERIFIED |
| EB reassessment scopes 1/4 vs 3/4 | EB-01 | VERIFIED |
| TMSU boundary 224 physical LOC | EB-01 | VERIFIED; retained as negative guardrail |
| EA record progression 1→2→3→4→5 | EA-01 | VERIFIED |
| VU-01a exact identity 8/16 | VU-01a | VERIFIED |
| VU floating differences ~3.64e-12 m etc. | VU-01 report | VERIFIED as diagnostic approximations |
| VU-01b normalized equivalence 16/16 | VU-01b | VERIFIED |
| VU negative control +1e-6 m rejected | VU-01b | VERIFIED |
| LC CV 16/16 and CA 16/16 | LC-01 | VERIFIED |
| LC old-envelope equal 12/16 | LC-01 | VERIFIED |
| LC max range separation 109.0754918963 m | LC-01 | VERIFIED |
| LC max range-rate separation 67.6107619584 m/s | LC-01 | VERIFIED |
| LC CA fitness UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE | LC-01 | VERIFIED |

## 4. Claim-strength audit

### Allowed in title / abstract

- `Evidence-Aware Unification` — allowed as the architecture + evidence-lifecycle framing.
- `Evolving Heterogeneous Simulation Models` — supported by substitution plus provenance and algorithm changes.
- `Cumulative Evidence` — supported by EA-01.
- `Bounded Qualification Inheritance` — supported by VU-01b positive carry-forward plus LC-01 stop rule.

### Must remain bounded

#### Wrapper preservation

Allowed:

> preserved declared observable behavior in 16/16 frozen cases.

Not allowed:

> preserved all OpenEaagles behavior.

#### Model substitution

Allowed:

> both implementations executed behind the same frozen upper trial/contract without upper-trial edits.

Not allowed:

> the models are interchangeable for operational T&E.

#### Semantic precheck

Allowed:

> rejected the five preregistered semantic mismatches.

Not allowed:

> automatically determines simulation semantics.

#### Intended-use qualification

Allowed:

> qualified a bounded research/conformance use within available evidence.

Not allowed:

> validated RadarSimPublic for radar performance.

#### EB-01 engineering effect

Allowed:

> reduced shared-core change and declared reassessment radius in the controlled benchmark.

Not allowed:

> reduced total code, engineer-hours or integration cost.

#### VU-01

Allowed:

> one provenance-only revision was carried forward after a typed numerical comparison and sensitivity control.

Not allowed:

> model updates generally require only delta validation.

#### LC-01

Allowed:

> algorithm/Implementation_ID change rejected automatic implementation-specific qualification inheritance.

Not allowed:

> all algorithm changes require complete revalidation.

## 5. Negative-result retention audit

| Negative / limiting result | Present in abstract | Present in results | Present in discussion/limitations | Required action |
|---|---:|---:|---:|---|
| EB does not show less total LOC | indirect | yes | yes | KEEP |
| engineer-hours not measured | yes | yes | yes | KEEP |
| RF semantic relation UNKNOWN | yes | yes | yes | KEEP |
| VU-01a byte comparator FAIL | yes | yes | yes | KEEP |
| VU correction is methodological, not validity tolerance | concise | yes | yes | KEEP |
| CA fresh execution does not establish fitness | yes | yes | yes | KEEP |
| LC maneuver is not operational validation | concise | yes | yes | KEEP |

## 6. Architecture-versus-evidence audit

The following are DESIGN statements and must not be written as discovered facts:

```text
TMSU = CP + SC + SP + EB + TP + PP
Capability_ID != Implementation_ID
TMSU is not runtime middleware
Evidence record schema
lifecycle state vocabulary
change-class taxonomy
```

The following are EMPIRICAL instantiations/results:

```text
BP preservation outcome
MS substitution outcome
SP mismatch/UNKNOWN outcome
EQ intended-use outcomes
EB paired change-surface outcome
EA evidence replay/lifecycle outcomes
VU failure/correction outcomes
LC stop-rule outcome
```

## 7. External-source boundary

Claims about the following require references rather than WP1 evidence:

```text
Army M&S aging/silos/reuse problem
MOSA lifecycle replaceability
VV&A documentation requirements
DoD T&E intended-use/version/uncertainty requirements
prior model reuse/composability literature
prior lifecycle/continuous VV&A literature
```

No external source may be cited as if it validated TMSU's empirical results.

## 8. Internal logical consistency checks

### Check A — capability versus implementation identity

Manuscript consistently keeps:

```text
Capability_ID = sensor.tws.track
```

stable while implementation identities differ. PASS.

### Check B — semantic UNKNOWN

Manuscript does not claim OpenEaagles average signal and RadarSimPublic SNR are equivalent. PASS.

### Check C — VU versus LC

Manuscript clearly separates:

```text
VU: provenance-only revision, same Implementation_ID
LC: algorithm + Implementation_ID change
```

PASS.

### Check D — qualification versus accreditation

Manuscript repeatedly states that the evidence-aware screen is not authoritative accreditation. PASS.

### Check E — numerical equivalence versus validity tolerance

Nine-decimal normalization is described as representation comparison, not radar validity tolerance. PASS.

### Check F — LC algorithm challenge

RMSE and separation metrics are described as discrimination/sensitivity evidence only. PASS.

## 9. Remaining manuscript-production risks

### Risk 1 — reference metadata not yet submission-final

Several academic references currently use working metadata from discovery sources. Publisher-level verification of year/issue/pages/DOI is still required before submission.

### Risk 2 — terminology around qualification

`QUALIFIED_WITHIN_EVIDENCE` is an internal research state. Final manuscript must define it clearly and avoid confusion with formal accreditation terminology.

### Risk 3 — Figure 3 could look like a universal lifecycle standard

Caption must state that the change/action profile is empirically demonstrated in the TWS research case and proposed as a research mechanism, not promulgated policy.

### Risk 4 — `bounded inheritance` needs immediate definition

Use the phrase only with this meaning:

> reuse of a current claim is permitted only when its declared evidence dependencies remain unchanged or are explicitly restored by appropriate delta evidence.

### Risk 5 — the main paper could become too software-centric

Keep code hashes, CI mechanics and implementation details in Methods/Supplement. Main Results should focus on evidence state transitions and inference limits.

## 10. Audit conclusion

`MANUSCRIPT_DRAFT_v0_3.md` is method–result–claim consistent with the frozen WP1 evidence chain at the current level of review.

Current readiness:

```text
science/story freeze:        PASS
empirical evidence freeze:   PASS
claim-evidence alignment:    PASS
negative-result retention:   PASS
reference-finalization:      PENDING
figure rendering:            PENDING
journal formatting:          PENDING
```
