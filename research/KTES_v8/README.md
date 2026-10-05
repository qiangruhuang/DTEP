# KTES v8 external-validation research snapshot

This branch records the current KTES research state after the adversarial-review repair cycle.

## Status

- v7 controlled-method evidence: **frozen**
- Phase 2 external engineering validation protocol: **frozen**
- supplied Anti-UAV410 `performance.json`: **audited**
- Phase 2A result gate: **BLOCKED**, because the supplied JSON does not contain the pre-registered per-sequence State Accuracy (`SA_i`) endpoint
- no endpoint substitution, hyperparameter retuning, or post-outcome redesign has been performed

The gate-critical v8 files are kept browsable in this directory. Frozen v7 research artifacts remain the source of truth for the controlled-method evidence.

## Browsable files

- `external_validation/RESULT_GATE_v8.md` — formal result-gate decision
- `protocol/KTES_Phase2_External_Validation_Protocol_v1.0.md` — frozen protocol
- `protocol/KTES_Phase2_Frozen_Contract_v1.0.json` — immutable method contract
- `data/performance_manifest_v8.json` — evidence hash and schema audit
- `scripts/audit_performance_json.py` — deterministic audit for the supplied JSON
- `paper/HANDOFF_v7.md` — frozen v7 handoff
- `paper/RESEARCH_REVISION_v7.md` — frozen v7 research revision

## Supplied evidence

The original `performance.json` is 19,063,146 bytes and is not duplicated in Git history. Verify it against:

`SHA256 7861cded4d79dfd37ce251e8167f81ce145ea8f9ed68d8dd1f4b252ca33d82a0`

The file contains SiamFC results for all 120 test sequences, but its sequence-level schema contains only Success/Precision metrics, not State Accuracy.

## Reproducibility

```bash
python scripts/audit_performance_json.py /path/to/performance.json
```

With the currently supplied JSON, the expected terminal state is `RESULT GATE BLOCKED`. Closing the frozen Phase 2A gate requires per-sequence `SA_i` for the same 120 SiamFC test sequences, or the tracker-result files plus annotations needed by the official SA evaluator.
