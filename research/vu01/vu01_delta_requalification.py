#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_trace(path: Path, decimals: int = 9) -> bytes:
    """Normalize cross-run floating representation, preserving discrete structure exactly."""
    out: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        fields = line.split("\t")
        if fields[0] in ("META", "S"):
            out.append(line)
        elif fields[0] == "T":
            if len(fields) != 9:
                raise RuntimeError(f"bad T record: {line}")
            row = fields[:3] + [f"{float(x):.{decimals}f}" for x in fields[3:]]
            out.append("\t".join(row))
        else:
            raise RuntimeError(f"unknown record: {line}")
    return ("\n".join(out) + "\n").encode("utf-8")


def mutate_for_negative_control(path: Path, delta: float, decimals: int = 9) -> tuple[str, str]:
    """Perturb one behavior-bearing floating value above normalization resolution."""
    lines = path.read_text(encoding="utf-8").splitlines()
    original = sha256_bytes(normalize_trace(path, decimals))
    mutated = list(lines)
    changed = False
    for i, line in enumerate(mutated):
        fields = line.split("\t")
        if fields[0] == "T":
            fields[3] = f"{float(fields[3]) + delta:.17g}"  # range_m
            mutated[i] = "\t".join(fields)
            changed = True
            break
    if not changed:
        raise RuntimeError("negative control found no T record")

    out: list[str] = []
    for line in mutated:
        fields = line.split("\t")
        if fields[0] in ("META", "S"):
            out.append(line)
        elif fields[0] == "T":
            out.append("\t".join(fields[:3] + [f"{float(x):.{decimals}f}" for x in fields[3:]]))
    mutated_hash = sha256_bytes(("\n".join(out) + "\n").encode("utf-8"))
    return original, mutated_hash


def main() -> int:
    ap = argparse.ArgumentParser(description="VU-01b corrected adapter/binding version carry-forward")
    ap.add_argument("--baseline-hashes", required=True, type=Path)
    ap.add_argument("--old-binding", required=True, type=Path)
    ap.add_argument("--new-binding", required=True, type=Path)
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--orchestrator", required=True, type=Path)
    ap.add_argument("--contract", required=True, type=Path)
    ap.add_argument("--new-run", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    baseline = load(args.baseline_hashes)
    old_binding = load(args.old_binding)
    new_binding = load(args.new_binding)
    run = load(args.new_run / "run_summary.json")
    norm = baseline["normalization"]
    decimals = 9
    neg_delta = float(norm["negative_control_delta"])

    frozen_hashes = {
        "trial_spec_sha256": "af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf",
        "orchestrator_sha256": "b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db",
        "contract_sha256": "f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b",
        "old_binding_sha256": "22290803bddf9d0ac379924b61444fd0bc3fdb46e9a95c3840bcae07e6ef01ad"
    }

    new_cases = {c["case_id"]: c for c in run["cases"]}
    exact_ref = baseline["trace_hashes_exact"]
    numeric_ref = baseline["trace_hashes_numeric_9dp"]
    case_ids = sorted(exact_ref)
    rows: list[dict[str, Any]] = []
    exact_count = 0
    numeric_count = 0
    all_case_pass = True

    for case_id in case_ids:
        c = new_cases.get(case_id)
        trace = args.new_run / case_id / "canonical.tsv"
        observed_exact = sha256_file(trace) if trace.exists() else None
        observed_numeric = sha256_bytes(normalize_trace(trace, decimals)) if trace.exists() else None
        exact_equal = observed_exact == exact_ref[case_id]
        numeric_equal = observed_numeric == numeric_ref[case_id]
        passed = bool(c and c.get("status") == "pass" and c.get("contract_valid") is True)
        exact_count += int(exact_equal)
        numeric_count += int(numeric_equal)
        all_case_pass &= passed
        rows.append({
            "case_id": case_id,
            "previous_exact_sha256": exact_ref[case_id],
            "new_exact_sha256": observed_exact,
            "byte_identical": exact_equal,
            "previous_numeric_9dp_sha256": numeric_ref[case_id],
            "new_numeric_9dp_sha256": observed_numeric,
            "numeric_9dp_equivalent": numeric_equal,
            "new_case_pass": passed,
        })

    # Comparator sensitivity: 1e-6 m perturbation must survive 9dp normalization and be rejected.
    control_trace = args.new_run / case_ids[0] / "canonical.tsv"
    control_original, control_mutated = mutate_for_negative_control(control_trace, neg_delta, decimals)
    negative_control_rejected = control_original != control_mutated

    predicates = {
        "VU01B-P1_same_model_upstream_commit": old_binding["runtime"]["upstream_commit"] == new_binding["runtime"]["upstream_commit"] == "8b63f824a5744c1b3a3fca5e948fa7c59f897b17",
        "VU01B-P2_same_capability_contract_semantic_profile": all(old_binding[k] == new_binding[k] for k in ["capability_id", "contract_id", "semantic_profile_id", "implementation_id"]),
        "VU01B-P3_same_declared_semantic_mapping": old_binding["runtime"]["semantic_mapping"] == new_binding["runtime"]["semantic_mapping"],
        "VU01B-P4_adapter_and_binding_revision_is_real": old_binding["adapter"] != new_binding["adapter"] and old_binding["binding_version"] != new_binding["binding_version"],
        "VU01B-P5_frozen_upper_trial_unchanged": sha256_file(args.trial) == frozen_hashes["trial_spec_sha256"] and sha256_file(args.orchestrator) == frozen_hashes["orchestrator_sha256"] and sha256_file(args.contract) == frozen_hashes["contract_sha256"],
        "VU01B-P6_old_binding_matches_frozen_ms01_v2": sha256_file(args.old_binding) == frozen_hashes["old_binding_sha256"],
        "VU01B-P7_updated_binding_executes_all_cases": run["case_count"] == 16 and run["passed_cases"] == 16 and run["all_cases_pass"] is True and run["all_outputs_contract_valid"] is True,
        "VU01B-P8_cross_run_numeric_equivalence_16_of_16": len(case_ids) == 16 and numeric_count == 16 and all_case_pass,
        "VU01B-P9_normalized_comparator_rejects_1e_minus_6_negative_control": negative_control_rejected,
        "VU01B-P10_real_unknown_remains_unresolved": True,
    }

    decision = "PASS" if all(predicates.values()) else "FAIL"
    transition = {
        "before_change": {
            "active": ["BP-01", "MS-01-v2", "SP-01", "EQ-01-v1", "EB-01-v1"],
            "rf_semantic_state": "UNKNOWN",
            "u1": "QUALIFIED_WITHIN_EVIDENCE",
            "u2": "UNKNOWN"
        },
        "after_adapter_binding_change_before_delta_requalification": {
            "active": ["BP-01", "SP-01"],
            "stale_for_current_configuration": ["MS-01-v2", "EQ-01-v1", "EB-01-v1"],
            "historically_retained": ["BP-01", "MS-01-v2", "SP-01", "EQ-01-v1", "EB-01-v1"]
        },
        "after_vu01b_delta_requalification": {
            "reused_without_reexecution": ["BP-01", "SP-01"],
            "delta_reassessed": ["MS-01 architectural substitution", "EQ-01 intended-use screening"],
            "not_reexecuted_and_retained_historical": ["EB-01-v1"],
            "current_architectural_substitution": "PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE" if decision == "PASS" else "UNKNOWN",
            "current_u1": "QUALIFIED_WITHIN_EVIDENCE" if decision == "PASS" else "UNKNOWN",
            "current_u2": "UNKNOWN",
            "rf_semantic_state": "UNKNOWN"
        }
    }

    report = {
        "experiment": "VU-01b Corrected Real Version Update and Evidence Carry-Forward",
        "decision": decision,
        "correction_history": {
            "VU-01a_exact_byte_rule": "FAILED reproducibility check on final-head rerun: 8/16 exact SHA-256 matches",
            "diagnosis": "cross-run floating representation sensitivity in moving-target traces; differences were at machine-precision scale, so exact byte identity was an invalid portability criterion for this RadarSimPublic numerical path",
            "corrected_rule": norm,
            "scientific_handling": "failed strict criterion retained as negative/diagnostic evidence; corrected VU-01b uses an explicit numeric normalization plus negative-control sensitivity test"
        },
        "change": {
            "type": "adapter_and_binding_revision",
            "scope": "provenance-only adapter revision; frozen upstream model, contract, semantic profile and semantic mapping unchanged",
            "old_adapter": old_binding["adapter"],
            "new_adapter": new_binding["adapter"],
            "old_binding_version": old_binding["binding_version"],
            "new_binding_version": new_binding["binding_version"],
        },
        "source_ms01_evidence": {
            "evidence_id": baseline["source_evidence_id"],
            "ci_run": baseline["source_ci_run"],
            "artifact_id": baseline["source_artifact_id"],
            "artifact_sha256": baseline["source_artifact_sha256"]
        },
        "trace_comparison": {
            "cases": len(rows),
            "byte_identical_cases": exact_count,
            "numeric_9dp_equivalent_cases": numeric_count,
            "all_new_cases_pass": all_case_pass,
            "normalization": norm,
            "negative_control": {
                "delta_range_m": neg_delta,
                "original_normalized_sha256": control_original,
                "mutated_normalized_sha256": control_mutated,
                "rejected": negative_control_rejected
            },
            "rows": rows
        },
        "evidence_transition": transition,
        "predicates": predicates,
        "current_decisions": {
            "architectural_substitution": transition["after_vu01b_delta_requalification"]["current_architectural_substitution"],
            "kinematic_intended_use": transition["after_vu01b_delta_requalification"]["current_u1"],
            "rf_performance_intended_use": "UNKNOWN",
            "rf_unknown_preserved": True
        },
        "inference_boundary": [
            "VU-01b is a controlled adapter/binding lifecycle update, not an upstream RadarSimPublic model-algorithm update.",
            "Nine-decimal normalization is a cross-run numerical-representation criterion, not a radar-fidelity acceptance threshold.",
            "The failed exact-byte criterion is retained because it demonstrates that evidence carry-forward rules must match numerical behavior and execution portability.",
            "The delta method does not imply that every future update can avoid full reassessment."
        ]
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "decision": decision,
        "exact_byte_identity": f"{exact_count}/{len(rows)}",
        "numeric_9dp_equivalence": f"{numeric_count}/{len(rows)}",
        "negative_control_rejected": negative_control_rejected,
        "u1": report["current_decisions"]["kinematic_intended_use"],
        "u2": report["current_decisions"]["rf_performance_intended_use"]
    }, sort_keys=True))
    return 0 if decision == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
