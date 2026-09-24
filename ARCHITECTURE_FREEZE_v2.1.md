# DTEP v2.1 Architecture Freeze

**Status:** FROZEN  
**Architecture baseline:** v2.1  
**Scope:** Digital Prototype 3.0 intake through human final adjudication and Decision Provenance  
**Architecture hash:** `sha256:8553ddbfc7facae50202c5d5e38ea9f90cdc7ead9d3f29015738f09a4286c2c4`

## 1. Freeze decision

v2.1 freezes the business architecture. No additional top-level business module is introduced after this baseline without an explicit architecture-change decision. Subsequent work is limited to hardening, adapters, runtime verification, security, performance, deployment and user-experience refinement.

The system is positioned as a **T&E operational ontology / decision-control plane**, not a replacement for FMI, SAL, IDL, HLA/DIS/TENA/DDS, professional solvers, range systems or LVC execution engines.

```text
Execution / data plane                       T&E control / evidence plane
────────────────────────                    ─────────────────────────────
FMI / FMU                                   DigitalPrototypeDelivery
SAL model runtime                           ModelBaseline / ModelArtifact
IDL data objects                            TestModelAssembly
HLA / DIS / TENA / DDS                      TestEnvironmentAssembly
Live / Virtual / Constructive nodes         Readiness / RunControl
Telemetry / event stores          ───────→  Reconstruction / Data Quality
                                            Automated Adjudication
                                            Expert Review / Final Decision
                                            Evidence / Decision Provenance
```

## 2. Frozen A–H architecture

| Layer | Frozen capability | Core responsibility |
|---|---|---|
| A | Digital Prototype 3.0 Intake | Receive, inspect, classify, conformance-test and freeze the test-base model baseline |
| B | Test Model Assembly & Provenance | Freeze which models, 3.0 artifacts, contracts and VV&A states a scenario/run uses |
| C | Test Environment Assembly / LVC Federation | Freeze Live/Virtual/Constructive nodes, gateways, time service, networks and resources |
| D | Test / Federation Readiness | Prove the configured run is ready before formal execution |
| E | Run Control / Live Federation Monitoring | Start, pause, remediate, resume or abort while preserving health/control provenance |
| F | Run Data Quality / Event Reconstruction | Reconstruct time-aligned facts and determine whether run data are admissible |
| G | Event-to-Measure / Automated Adjudication | Apply frozen rules to trusted events and form reproducible run-level measure results |
| H | Expert Review Board / Human Final Adjudication | Add accountable human interpretation without rewriting machine facts |

## 3. Frozen business state machine

The existing eight CASE-01 business transitions remain frozen:

1. `live-retest`
2. `lvc-anchor`
3. `vva-accredit`
4. `digital-5000`
5. `draft-package`
6. `freeze-package`
7. `strict-gate`
8. `freeze-conclusion`

Layers D–H are implemented as governed substates/preconditions inside these business transitions; they do not expand the business flow into an ever-growing number of top-level steps.

## 4. Frozen invariants

1. **Evidence Gate PASS is evidence sufficiency, not performance PASS.**
2. **Frozen EvidencePackage reads frozen manifest snapshots**, never mutable current ontology state.
3. A formal Run freezes model assembly, environment/federation, readiness, run control, event reconstruction, data quality and automated-adjudication provenance.
4. Machine adjudication is immutable. Human review creates a separate disposition; it cannot edit machine facts in place.
5. Legacy Runs are never retroactively upgraded to new provenance standards.
6. FMI/SAL/IDL/LVC execution remains separate from the T&E ontology/decision plane.
7. Approval, signature and execution responsibility remain separable; final approval cannot be silently inferred from technical automation.
8. A rule change creates a new rule-set version. A reviewer disagreement does not mutate the published machine rule.

## 5. Human final adjudication boundary

v2.1 completes the planned H layer with four objects:

- `ReviewPanelSession`
- `ExpertOpinion`
- `EvidenceRequest`
- `FinalAdjudicationDecision`

Three expert reviewers submit independent opinions under `blind-independent-then-deliberate` mode. Only after quorum are opinions available for deliberation. The chair can form one of the conservative final dispositions:

- `CONFIRM`
- `CONFIRM_WITH_QUALIFICATION`
- `RETURN_FOR_EVIDENCE`
- `REFER_RULE_REVIEW`

`NO_IN_PLACE_OVERRIDE` is frozen policy. A returned case creates an `EvidenceRequest`; a rule challenge requires a new/reviewed AdjudicationRuleSet rather than silent recalculation.

## 6. Object-boundary audit

The following similar-looking objects were reviewed and intentionally retained because they answer different T&E questions:

| Objects | Why both remain |
|---|---|
| `TestModelAssembly` vs `TestEnvironmentAssembly` | model selection/configuration vs executable range/LVC environment composition |
| `IntakeGate` vs `EvidenceGate` | model-delivery/conformance eligibility vs formal conclusion evidence sufficiency |
| `RunHealthSnapshot` vs `RunEventReconstruction` | runtime operational health vs reconstructed test facts |
| `MeasureObservation` vs `RunMeasureResult` | source observation/calculation inputs vs adjudicated run-level result |
| `FinalAdjudicationDecision` vs `DigitalTestCase.decision` | expert-board disposition vs formally approved/frozen case conclusion |
| `EvidenceRequest` vs `Deficiency` | request for additional/changed evidence vs observed product/test deficiency |

The v2.1 automated audit found **47 ObjectTypes**, **86 LinkTypes**, with no duplicate ObjectType/LinkType `apiName` and no duplicate ObjectType display name.

## 7. Frozen rule hashes

- `STRICT-V1`: `sha256:a077d5da6b1e8b2cb571cb2de134f470007eab05bc1c128083b53038a9e19121`
- `ARS-CASE01-E2M-v1`: `sha256:555086efe8b46667a5f6e215769932d7ad070c8ff3e2e856bc872f891780a558`

Neither hash is changed by the v2.1 freeze.

## 8. Change policy after v2.1

Allowed without architecture reopening:

- real identity / PKI or approved cryptographic signer adapters;
- FMI/SAL/IDL/LVC real adapters;
- observability, security and access-control hardening;
- performance/scalability work;
- browser/runtime automated tests;
- deployment packaging;
- UX refinement and accessibility;
- additional CASE data that instantiate existing object types and rules.

Requires an explicit architecture-change decision:

- a new top-level A–H-equivalent business layer;
- changing the eight formal CASE-01 business transitions;
- collapsing evidence sufficiency into performance pass/fail;
- allowing mutable historical EvidencePackage/Run provenance;
- allowing human review to rewrite an automated result in place.
