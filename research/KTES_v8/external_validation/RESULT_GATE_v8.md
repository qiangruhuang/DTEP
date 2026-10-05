# KTES v8 — External Engineering Validation Result Gate

Date: 2026-10-05  
Status: **BLOCKED — primary external-validation outcome is not present in the supplied JSON**  
Protocol status: frozen; no retuning or endpoint substitution permitted.

## 1. Frozen gate being evaluated

Phase 2A uses the official Anti-UAV410 test split (N=120), SiamFC as the frozen system under test, n=40 selected sequences, 500 paired design replays, and the pre-registered c-pKTES-Hedge contract. The primary per-sequence outcome is State Accuracy, `Y_i = SA_i`. Success AUC and 20-pixel precision are secondary descriptive outputs only and are not valid substitutes for the primary gate.

The structural support gate requires all of the following:

1. all non-certainty inclusion probabilities are positive;
2. median weight ESS >=18.5 and 5th-percentile ESS >=12;
3. profile SA error is not worse than stratified probability sampling by >0.01 SA units;
4. six-domain critical SA error is not worse than the better baseline by >0.02 SA units;
5. difficult-case hit is not >10 percentage points below the split-style baseline.

## 2. Supplied `performance.json` audit

- SHA-256: `7861cded4d79dfd37ce251e8167f81ce145ea8f9ed68d8dd1f4b252ca33d82a0`
- size: 19,063,146 bytes
- tracker blocks: 56
- SiamFC present: yes
- SiamFC `seq_wise` records: 120 (matches the protocol finite population)
- per-sequence fields: `precision_curve, precision_score, speed_fps, success_curve, success_rate, success_score`
- SA/state-accuracy field found: **no**
- SiamFC overall Success AUC: 0.346310048226
- SiamFC 20-pixel precision: 0.531745107618
- SiamFC success rate at IoU 0.5: 0.457292449499

The JSON is internally useful as a secondary-outcome consistency check, but it cannot close the frozen Phase 2A gate.

## 3. Why the gate remains blocked

The official Anti-UAV410 evaluator computes State Accuracy from the tracker predictions together with per-frame target existence and ground-truth boxes. In the official reporting path, `performance.json` stores Success/Precision curves and derived scores, while SA is computed separately. The supplied file therefore cannot reconstruct:

- the full-population mean `mu_SA`;
- the six challenge-domain SA means;
- the bottom-10% difficult-case set defined by sequence SA;
- per-replay profile and critical-domain SA errors;
- the pre-registered difficult-case-hit comparison.

Substituting sequence Success AUC for SA would change the frozen primary endpoint after outcome access and would invalidate the external-validation claim. It is therefore prohibited.

## 4. Exact artifact needed to close the result gate

One of the following is sufficient, without changing the protocol:

- a per-sequence State Accuracy export for the same 120 SiamFC test sequences (`sequence_name`, `SA_i`); or
- the 120 SiamFC tracker-result files together with the Anti-UAV410 test annotations needed by the official SA evaluator.

The official sequence-level attribute files can be sourced independently from the benchmark repository because they are outcome-blind design covariates. No KTES/R3/R5 constant will be re-selected.

## 5. Current academic interpretation

Phase 1/v7 controlled evidence remains frozen. Phase 2A protocol validity is intact, but the external-result gate is **not yet passed or failed**; it is blocked by missing primary-outcome data. No field-transportability claim is added to the manuscript at this stage.
