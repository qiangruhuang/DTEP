# DTEP v2.1 Evidence Audit

## Audit conclusion

The frozen A–H architecture is internally coherent for the CASE-01 demonstration. No audited path was found that collapses **evidence validity/sufficiency** into **equipment performance pass/fail**. Historical evidence remains snapshot-based, machine adjudication remains immutable, and human final adjudication is additive.

This is an architecture/source-code/SQLite audit. It is **not** a claim that a full Next.js/browser runtime E2E has passed.

## 1. Evidence semantics

The CASE-01 end state intentionally preserves the following separation:

```text
Run Data Quality                 READY_FOR_EVIDENCE
Automated Adjudication           READY_FOR_RUN_SIGNOFF
M-13 machine result              83.2%
M-13 threshold                   >= 85%
M-13 performance                 NOT_MET / 未达标
EvidencePackage V0.4             FROZEN
STRICT-V1 Evidence Gate          PASS
Expert final disposition         CONFIRM_WITH_QUALIFICATION
Formal performance conclusion    未达到要求（scope frozen）
```

`STRICT-V1 = PASS` therefore means the package is sufficient to support a formal conclusion; it does not reverse `M-13 = 83.2% < 85%`.

## 2. Machine-to-human integrity

The human-review layer enforces the following:

- machine finding remains stored and referenced;
- `machineDecisionPreserved = true`;
- policy is `NO_IN_PLACE_OVERRIDE`;
- reviewer disagreement creates a separate ExpertOpinion;
- more-evidence requests create `EvidenceRequest`;
- rule challenges result in `REFER_RULE_REVIEW`, not rewriting the published rule;
- only `CONFIRM` or `CONFIRM_WITH_QUALIFICATION` is eligible for final-approval workflow;
- final approval binds the human-final-adjudication ref/hash into the approval subject context.

The deterministic CASE-01 demonstration uses **3/3 independent reviews**, with `1 CONCUR + 2 CONCUR_WITH_QUALIFICATION`, resulting in `CONFIRM_WITH_QUALIFICATION`. The machine result remains 83.2% / NOT_MET.

## 3. Frozen-history integrity

Audited invariants:

- frozen EvidencePackage evaluates against its manifest snapshots;
- formal Run snapshots bind model/environment/readiness/control/data-quality/adjudication state;
- frozen hashes are carried forward rather than recomputed from mutable current objects;
- legacy Runs are not backfilled to claim provenance that did not exist when they ran;
- v2.1 human-review records are zero in the delivery database, so the package is delivered in a pre-execution state.

## 4. Approval and responsibility audit

The final responsibility chain is distinct:

```text
Automated rule execution
        ↓
3 independent expert opinions
        ↓
Evaluation authority / panel chair
        ↓
FinalAdjudicationDecision
        ↓
Final approver
        ↓
DigitalTestCase conclusion freeze
```

The final approver does not become the author of the machine calculation, and the panel does not become the executor of the Run.

## 5. Decision Provenance audit

The final trace is designed to traverse:

```text
Final Decision
  ↑ Human Final Adjudication / Expert Opinions
  ↑ Evidence Gate / STRICT-V1
  ↑ Frozen Evidence Package
  ↑ Formal TestRun
  ↑ Automated Adjudication / RunMeasureResult
  ↑ MeasureObservation / frozen RuleSet
  ↑ Event Reconstruction / Data Quality
  ↑ Run Control / Readiness
  ↑ LVC Federation / Test Environment Assembly
  ↑ Test Model Assembly
  ↑ ModelBaseline / ModelArtifact / FMI-SAL-IDL contracts
  ↑ Digital Prototype 3.0 Delivery
```

This establishes one audit path from final decision back to delivered digital model provenance and the run/event facts supporting the decision.

## 6. Architecture inventory audit

- ObjectTypes: **47**
- LinkTypes: **86**
- duplicate ObjectType/LinkType apiName: **0**
- duplicate ObjectType displayName: **0**
- expert reviewers in role directory: **3**
- initial `ReviewPanelSession`: **0**
- initial `ExpertOpinion`: **0**
- initial `EvidenceRequest`: **0**
- initial `FinalAdjudicationDecision`: **0**

Potential semantic overlaps were reviewed in `ARCHITECTURE_FREEZE_v2.1.md`; no object was removed merely because names were adjacent when responsibilities differed.

## 7. Hash audit

- Architecture freeze: `sha256:8553ddbfc7facae50202c5d5e38ea9f90cdc7ead9d3f29015738f09a4286c2c4`
- STRICT-V1: `sha256:a077d5da6b1e8b2cb571cb2de134f470007eab05bc1c128083b53038a9e19121`
- Automated adjudication: `sha256:555086efe8b46667a5f6e215769932d7ad070c8ff3e2e856bc872f891780a558`
- Deterministic E2E chain: `sha256:0d328fb47e52b4c5a76c4683f21329c3cba4a5811d0755ca456ef95b8f6f166f`

## 8. Known limitations / not overstated

1. Demo signing remains a SHA-256 attestation mechanism, **not** real PKI/CAC/legally non-repudiable digital signature.
2. The current E2E demonstration is deterministic architecture-shadow execution, not a browser-driven live Next.js E2E.
3. Project dependencies are not installed in the delivery environment; full `next build` is therefore not claimed.
4. Expert Review Board is a prototype T&E governance design; it is not claimed as a requirement stated by the source standard.
5. Real FMI/SAL/IDL/HLA/DIS/TENA/DDS adapters remain deployment integrations rather than being proven by this UI prototype.
