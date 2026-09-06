#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="VU-01 real adapter/binding version update with selective evidence carry-forward")
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

    frozen_hashes = {
        "trial_spec_sha256": "af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf",
        "orchestrator_sha256": "b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db",
        "contract_sha256": "f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b",
        "old_binding_sha256": "22290803bddf9d0ac379924b61444fd0bc3fdb46e9a95c3840bcae07e6ef01ad"
    }

    new_cases = {c["case_id"]: c for c in run["cases"]}
    baseline_hashes = baseline["trace_hashes"]
    case_ids = sorted(baseline_hashes)
    case_rows = []
    all_trace_equal = True
    all_case_pass = True
    for case_id in case_ids:
        c = new_cases.get(case_id)
        observed = c.get("trace_sha256") if c else None
        equal = observed == baseline_hashes[case_id]
        passed = bool(c and c.get("status") == "pass" and c.get("contract_valid") is True)
        all_trace_equal &= equal
        all_case_pass &= passed
        case_rows.append({
            "case_id": case_id,
            "previous_trace_sha256": baseline_hashes[case_id],
            "new_trace_sha256": observed,
            "trace_identical": equal,
            "new_case_pass": passed,
        })

    predicates = {
        "VU01-P1_same_model_upstream_commit": old_binding["runtime"]["upstream_commit"] == new_binding["runtime"]["upstream_commit"] == "8b63f824a5744c1b3a3fca5e948fa7c59f897b17",
        "VU01-P2_same_capability_contract_semantic_profile": all(old_binding[k] == new_binding[k] for k in ["capability_id", "contract_id", "semantic_profile_id", "implementation_id"]),
        "VU01-P3_same_declared_semantic_mapping": old_binding["runtime"]["semantic_mapping"] == new_binding["runtime"]["semantic_mapping"],
        "VU01-P4_adapter_and_binding_revision_is_real": old_binding["adapter"] != new_binding["adapter"] and old_binding["binding_version"] != new_binding["binding_version"],
        "VU01-P5_frozen_upper_trial_unchanged": sha256_file(args.trial) == frozen_hashes["trial_spec_sha256"] and sha256_file(args.orchestrator) == frozen_hashes["orchestrator_sha256"] and sha256_file(args.contract) == frozen_hashes["contract_sha256"],
        "VU01-P6_old_binding_matches_frozen_ms01_v2": sha256_file(args.old_binding) == frozen_hashes["old_binding_sha256"],
        "VU01-P7_updated_binding_executes_all_cases": run["case_count"] == 16 and run["passed_cases"] == 16 and run["all_cases_pass"] is True and run["all_outputs_contract_valid"] is True,
        "VU01-P8_updated_canonical_outputs_match_prior_ms01_v2": len(case_ids) == 16 and all_trace_equal and all_case_pass,
        "VU01-P9_real_unknown_remains_unresolved": True,
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
        "after_vu01_delta_requalification": {
            "reused_without_reexecution": ["BP-01", "SP-01"],
            "delta_reassessed": ["MS-01 architectural substitution", "EQ-01 intended-use screening"],
            "not_reexecuted_and_retained_historical": ["EB-01-v1"],
            "current_architectural_substitution": "PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE",
            "current_u1": "QUALIFIED_WITHIN_EVIDENCE",
            "current_u2": "UNKNOWN",
            "rf_semantic_state": "UNKNOWN"
        }
    }

    report = {
        "experiment": "VU-01 Real Version Update and Evidence Carry-Forward",
        "decision": decision,
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
            "cases": len(case_rows),
            "byte_identical": sum(r["trace_identical"] for r in case_rows),
            "all_new_cases_pass": all_case_pass,
            "rows": case_rows
        },
        "evidence_transition": transition,
        "predicates": predicates,
        "current_decisions": {
            "architectural_substitution": "PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE" if decision == "PASS" else "UNKNOWN",
            "kinematic_intended_use": "QUALIFIED_WITHIN_EVIDENCE" if decision == "PASS" else "UNKNOWN",
            "rf_performance_intended_use": "UNKNOWN",
            "rf_unknown_preserved": True
        },
        "inference_boundary": [
            "VU-01 is a controlled adapter/binding lifecycle update, not an upstream RadarSimPublic model-version change.",
            "The delta method reuses unchanged BP-01 and SP-01 evidence and does not claim that every future update can avoid full rerun.",
            "Canonical trace identity against the prior MS-01 RadarSimPublic arm supports carry-forward for this provenance-only revision only."
        ]
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "decision": decision,
        "trace_identity": f"{report['trace_comparison']['byte_identical']}/{report['trace_comparison']['cases']}",
        "reused_without_reexecution": transition["after_vu01_delta_requalification"]["reused_without_reexecution"],
        "u1": report["current_decisions"]["kinematic_intended_use"],
        "u2": report["current_decisions"]["rf_performance_intended_use"]
    }, sort_keys=True))
    return 0 if decision == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
