# Methods–Results–Claim Audit v1.0

Status: **Submission audit; no new mechanism experiment introduced**

Scope: `MANUSCRIPT_SUBMISSION_v1_0.md`, Figures 1–4 and Main Tables 1–3. Every empirical sentence is classified as: `SUPPORTED`, `BOUNDARY-QUALIFIED`, or `REMOVE/REWRITE`. Quantitative values must resolve to frozen WP1 evidence.

## A. RQ1 — heterogeneous model unification

| ID | Manuscript statement | Method source | Result source | Allowed claim | Audit |
|---|---|---|---|---|---|
| M1 | TMSU is a SAL-aligned logical packaging/conformance unit rather than a runtime middleware. | frozen TMSU architecture/profile | architecture freeze | design definition only | SUPPORTED AS DESIGN |
| M2 | `Capability_ID != Implementation_ID`. | TMSU profile | implementation bindings | necessary identity separation for substitution | SUPPORTED AS DESIGN |
| M3 | OpenEaagles BP matrix is 2×2×2×2 over range, azimuth, RCS and motion. | BP-01 protocol | BP report | describes frozen evidence envelope | SUPPORTED |
| R1 | Wrapper/native OpenEaagles traces were exact in 16/16 cases. | exact comparator + negative control | BP-01 | behavior preservation within declared envelope | SUPPORTED |
| R2 | The 16 BP traces were behavior-bearing/distinct and negative control was rejected. | BP comparator/probe | BP-01 | result not trivial empty-output identity | SUPPORTED |
| M4 | MS-01 used a second independent public implementation with frozen upper trial and binding-only selection. | MS protocol | MS-01 v2 | architectural/contract substitution design | SUPPORTED |
| R3 | OpenEaagles and RadarSimPublic each passed 16/16 under the same upper trial. | common validator/orchestrator | MS-01 v2 | bounded heterogeneous substitution | SUPPORTED |
| R4 | Upper-trial modifications for swap were zero. | frozen hashes / binding selection | MS-01 v2 | stable upper trial | SUPPORTED |
| R5 | Cross-implementation traces differed 16/16. | MS evaluator | MS-01 v2 | distinct implementations were not behaviorally identical | SUPPORTED |
| C1 | TMSU demonstrates universal plug-and-play interchangeability. | — | — | prohibited | REMOVE IF PRESENT |
| C2 | TMSU reduces total source code. | — | EB-01 contradicts | prohibited | REMOVE IF PRESENT |

## B. RQ2 — semantic and intended-use qualification

| ID | Manuscript statement | Method source | Result source | Allowed claim | Audit |
|---|---|---|---|---|---|
| M5 | SP-01 compares structural-only validation with semantic validation across concept/type/unit/frame/time/sign dimensions. | SP-01 protocol | SP-01 | ablation description | SUPPORTED |
| R6 | All seven SP cases passed structural validation. | SP evaluator | SP-01 | schema/identifier validity alone did not discriminate cases | SUPPORTED |
| R7 | Five injected semantic mismatches were rejected 5/5. | semantic precheck | SP-01 | bounded mismatch detection | SUPPORTED |
| R8 | Positive control was compatible and real RF relation was `UNKNOWN`. | semantic precheck | SP-01 | tri-state handling of evidence insufficiency | SUPPORTED |
| C3 | RadarSimPublic SNR is physically equivalent to OpenEaagles track-average signal. | — | SP-01 explicitly unresolved | prohibited | REMOVE IF PRESENT |
| M6 | EQ-01 evaluates four intended uses against available evidence and domain. | EQ protocol | EQ-01 | intended-use screening description | SUPPORTED |
| R9 | Kinematic research use was `QUALIFIED_WITHIN_EVIDENCE`. | EQ evaluator | EQ-01 | bounded qualification only | BOUNDARY-QUALIFIED |
| R10 | RF-performance and 50 km uses were `UNKNOWN`; explicit unit conflict was `NOT_QUALIFIED`. | EQ evaluator | EQ-01 | evidence-sensitive decisions | SUPPORTED |
| C4 | EQ-01 constitutes authoritative accreditation. | — | — | prohibited | REMOVE IF PRESENT |

## C. RQ3 — change locality and cumulative evidence

| ID | Manuscript statement | Method source | Result source | Allowed claim | Audit |
|---|---|---|---|---|---|
| M7 | EB-01 is paired against a competent direct point-to-point integration with identical functional task. | EB protocol | EB-01 | paired engineering-change comparison | SUPPORTED |
| R11 | Both EB arms passed 16/16 with byte-identical outputs. | EB comparator | EB-01 | functional-equivalence control | SUPPORTED |
| R12 | TMSU upper-core churn was 0 versus 160 in direct path; direct core model references 0 versus 9. | repository diff/ref count | EB-01 | change locality/coupling | SUPPORTED |
| R13 | TMSU boundary contained 224 physical lines. | repository count | EB-01 | prevents lower-LOC narrative | SUPPORTED |
| R14 | Semantic-mapping change affected 1/4 declared reassessment scopes under TMSU vs 3/4 direct. | dependency interpretation | EB-01 | bounded reassessment-radius result | SUPPORTED |
| C5 | TMSU saves X% engineer-hours or schedule. | — | not measured | prohibited | REMOVE IF PRESENT |
| M8 | EA-01 registers frozen evidence in append-only dependency graph and distinguishes history from current applicability. | EA protocol | EA-01 | lifecycle mechanism | SUPPORTED |
| R15 | Evidence set grew 1→2→3→4→5 with prior records retained. | ledger replay | EA-01 | provenance-monotonic history | SUPPORTED |
| R16 | RF `UNKNOWN` persisted through unrelated later evidence. | query reconstruction | EA-01 | durable unresolved state | SUPPORTED |
| C6 | Qualification must monotonically improve as evidence accumulates. | — | EA contradicts | prohibited | REMOVE IF PRESENT |

## D. RQ4 — bounded inheritance

| ID | Manuscript statement | Method source | Result source | Allowed claim | Audit |
|---|---|---|---|---|---|
| M9 | VU change preserves upstream model identity, contract, semantic mapping and upper trial while revising adapter/binding provenance. | VU protocol | VU-01 | controlled small-change class | SUPPORTED |
| R17 | VU-01a strict byte rule failed with 8/16 exact traces on repeated run. | exact hash comparator | VU-01a | retained negative methodological result | SUPPORTED |
| R18 | Differences were machine-precision-scale in observed fields. | artifact comparison | VU-01a | motivates comparator revision | SUPPORTED, DO NOT GENERALIZE |
| M10 | VU-01b uses exact discrete structure + 9-decimal normalized floats and a +1e-6 m sensitivity perturbation. | VU-01b protocol | VU-01b | evidence-type-aware comparator | SUPPORTED |
| R19 | VU-01b matched 16/16 and rejected negative control. | comparator | VU-01b | carry-forward for this change class | SUPPORTED |
| C7 | 9-decimal normalization is a radar-validity tolerance. | — | explicitly false | REMOVE IF PRESENT |
| M11 | LC-01 changes CV KF to CA KF and changes `Implementation_ID` with contract/profile/upper trial frozen. | LC protocol | LC-01 | substantive implementation change | SUPPORTED |
| R20 | Both CV and CA executed 16/16 old cases; 12/16 normalized equal, 4/16 different. | LC comparator | LC-01 | old envelope not sufficient inheritance rule | SUPPORTED |
| R21 | Maneuver challenge max differences were 109.0755 m range and 67.6108 m/s range rate. | LC sensitivity challenge | LC-01 | algorithm discrimination under constructed challenge | SUPPORTED |
| C8 | CA is more operationally valid/superior than CV. | — | LC explicitly disallows | REMOVE IF PRESENT |
| R22 | Automatic implementation-specific inheritance was rejected; unaffected BP/SP evidence remained active; CA architecture was freshly executable; CA fitness remained `UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE`. | lifecycle evaluator | LC-01 | empirical stop rule | SUPPORTED |

## E. Cross-cutting paper claims

| ID | Statement | Evidence basis | Audit decision |
|---|---|---|---|
| X1 | Heterogeneous model unification and qualification-evidence inheritance are related but distinct problems. | MS + SP + EQ + LC | SUPPORTED synthesis |
| X2 | `model substitutability != semantic compatibility != intended-use fitness`. | MS + SP + EQ | SUPPORTED bounded synthesis |
| X3 | Evidence history can be provenance-monotonic while qualification is not monotonic. | EA + EQ + VU + LC | SUPPORTED conceptual synthesis |
| X4 | Evidence inheritance must have both a positive carry-forward rule and a stopping rule. | VU-01b + LC-01 | SUPPORTED bounded synthesis |
| X5 | The engineering value demonstrated is manageability/change locality rather than fewer lines or measured time. | EB + EA + VU + LC | SUPPORTED synthesis |
| X6 | TMSU replaces HLA/DIS/FMI or authoritative VV&A/accreditation. | no evidence; architecture explicitly excludes | PROHIBITED |
| X7 | Results generalize to all model classes or enterprise scale. | one primary capability class | PROHIBITED; limitation required |

## F. Figure audit

| Figure | Quantitative claims | Frozen source | Status |
|---|---|---|---|
| Figure 1 | BP 16/16; MS 16/16+16/16; upper-trial edits 0 | BP-01, MS-01 | PASS |
| Figure 2 | 5/5 semantic rejects; 8/16 strict-byte fail; 16/16 normalized VU | SP-01, VU-01a/b | PASS |
| Figure 3 | evidence accumulation and current states only | EA-01, VU-01b, LC-01 | PASS |
| Figure 4 | VU 8/16 fail → 16/16 normalized; LC 16/16, 12/16 equal, 109.0755 m, 67.6108 m/s | VU-01, LC-01 | PASS |

No figure introduces a quantitative value absent from frozen evidence.

## G. Table audit

Main Tables 1–3 contain only implementation identities, frozen evidence states, frozen quantitative anchors and dependency/change actions already present in BP/MS/SP/EQ/EB/EA/VU/LC reports. Statements about current CA fitness and RF performance preserve `UNKNOWN` rather than inferring validity.

## H. Submission-language corrections applied

1. Replace “validated model” with `QUALIFIED_WITHIN_EVIDENCE` where only EQ evidence exists.
2. Replace “semantic compatibility of the two radar implementations” with “semantic compatibility for declared observables; RF concept unresolved”.
3. Replace “reuse rate improved” with “selective evidence carry-forward / smaller declared reassessment radius”.
4. Replace “reduced engineering burden” when ambiguous with “reduced shared-core change and reassessment propagation”.
5. Preserve VU-01a `FAIL` and RF/CA `UNKNOWN` in Abstract, Results and Discussion.
6. State LC maneuver metrics as discrimination/sensitivity evidence only.
7. Keep accreditation and enterprise generalization explicitly outside inference.

## I. Audit conclusion

`MANUSCRIPT_SUBMISSION_v1_0.md` is admissible under the frozen Claim–Evidence Matrix if the manuscript retains the wording constraints above. No additional mechanism experiment is required for the current paper claim set.
