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


def behavior_lines(path: Path, decimals: int = 9) -> list[str]:
    out: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        fields = raw.split("\t")
        if not fields:
            continue
        if fields[0] == "META":
            # Implementation identity is intentionally different in LC-01;
            # behavior comparison is therefore performed on S/T records only.
            continue
        if fields[0] == "S":
            out.append(raw)
        elif fields[0] == "T":
            nums = [float(x) for x in fields[3:]]
            out.append("\t".join(fields[:3] + [f"{x:.{decimals}f}" for x in nums]))
        else:
            raise RuntimeError(f"unknown record: {raw}")
    return out


def behavior_hash(path: Path, decimals: int = 9) -> str:
    payload = ("\n".join(behavior_lines(path, decimals)) + "\n").encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="LC-01 carry-forward boundary evaluator")
    ap.add_argument("--old-binding", required=True, type=Path)
    ap.add_argument("--new-binding", required=True, type=Path)
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--orchestrator", required=True, type=Path)
    ap.add_argument("--contract", required=True, type=Path)
    ap.add_argument("--old-run", required=True, type=Path)
    ap.add_argument("--new-run", required=True, type=Path)
    ap.add_argument("--challenge", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    old_binding = load(args.old_binding)
    new_binding = load(args.new_binding)
    old_run = load(args.old_run / "run_summary.json")
    new_run = load(args.new_run / "run_summary.json")
    challenge = load(args.challenge)

    frozen = {
        "trial_spec_sha256": "af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf",
        "orchestrator_sha256": "b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db",
        "contract_sha256": "f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b"
    }

    old_cases = {c["case_id"]: c for c in old_run["cases"]}
    new_cases = {c["case_id"]: c for c in new_run["cases"]}
    case_ids = sorted(set(old_cases) & set(new_cases))
    comparisons = []
    for case_id in case_ids:
        old_trace = args.old_run / case_id / "canonical.tsv"
        new_trace = args.new_run / case_id / "canonical.tsv"
        h_old = behavior_hash(old_trace)
        h_new = behavior_hash(new_trace)
        comparisons.append({
            "case_id": case_id,
            "old_behavior_hash_9dp": h_old,
            "new_behavior_hash_9dp": h_new,
            "behavior_equal_9dp": h_old == h_new,
            "old_case_pass": old_cases[case_id].get("status") == "pass" and old_cases[case_id].get("contract_valid") is True,
            "new_case_pass": new_cases[case_id].get("status") == "pass" and new_cases[case_id].get("contract_valid") is True,
        })

    semantic_mapping_same = old_binding["runtime"]["semantic_mapping"] == new_binding["runtime"]["semantic_mapping"]
    upstream_same = old_binding["runtime"]["upstream_commit"] == new_binding["runtime"]["upstream_commit"]
    algorithm_changed = (
        "initialize_constant_velocity_filter" in old_binding["runtime"]["model_components"]
        and "initialize_constant_acceleration_filter" in new_binding["runtime"]["model_components"]
    )
    implementation_changed = old_binding["implementation_id"] != new_binding["implementation_id"]

    prior_e2_equal = sum(r["behavior_equal_9dp"] for r in comparisons)
    all_old_pass = len(comparisons) == 16 and all(r["old_case_pass"] for r in comparisons)
    all_new_pass = len(comparisons) == 16 and all(r["new_case_pass"] for r in comparisons)
    challenge_discriminates = bool(challenge["comparison"]["materially_discriminating"])

    # Lifecycle decision is intentionally not based on whether the old envelope happens
    # to return similar traces. A declared model-algorithm/implementation change crosses
    # the VU-01 carry-forward boundary and requires fresh implementation-level evidence.
    carry_forward_allowed = not (algorithm_changed or implementation_changed)

    current = {
        "BP-01": "ACTIVE_FROM_ORIGINAL_EVIDENCE",
        "SP-01": "ACTIVE_FROM_ORIGINAL_EVIDENCE" if semantic_mapping_same else "STALE",
        "MS-01-v2-CV": "HISTORICAL_STALE_FOR_CA_CONFIGURATION",
        "MS-01-CA": "PASS_FRESH_EXECUTION" if all_new_pass else "UNKNOWN",
        "EQ-01-v1-CV": "HISTORICAL_STALE_FOR_CA_CONFIGURATION",
        "kinematic_intended_use_CA": "UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE",
        "RF_semantic_relation": "UNKNOWN",
        "RF_performance_intended_use_CA": "UNKNOWN",
        "EB-01-v1-CV": "HISTORICAL_STALE_FOR_CA_CONFIGURATION",
    }

    predicates = {
        "LC01-P1_same_upstream_repository_commit": upstream_same,
        "LC01-P2_same_capability_contract_semantic_profile": all(old_binding[k] == new_binding[k] for k in ["capability_id", "contract_id", "semantic_profile_id"]),
        "LC01-P3_same_declared_semantic_mapping": semantic_mapping_same,
        "LC01-P4_substantive_algorithm_component_changed": algorithm_changed,
        "LC01-P5_implementation_identity_changed": implementation_changed,
        "LC01-P6_frozen_upper_trial_unchanged": sha256_file(args.trial) == frozen["trial_spec_sha256"] and sha256_file(args.orchestrator) == frozen["orchestrator_sha256"] and sha256_file(args.contract) == frozen["contract_sha256"],
        "LC01-P7_old_configuration_executes_all_frozen_cases": all_old_pass,
        "LC01-P8_new_algorithm_executes_all_frozen_cases": all_new_pass,
        "LC01-P9_maneuver_challenge_discriminates_algorithms": challenge_discriminates,
        "LC01-P10_automatic_carry_forward_rejected": carry_forward_allowed is False,
        "LC01-P11_unaffected_semantic_unknown_preserved": current["RF_semantic_relation"] == "UNKNOWN",
        "LC01-P12_new_intended_use_not_blindly_inherited": current["kinematic_intended_use_CA"] == "UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE",
    }
    decision = "PASS" if all(predicates.values()) else "FAIL"

    report = {
        "experiment": "LC-01 Lifecycle Carry-Forward Boundary under Model-Algorithm Change",
        "decision": decision,
        "change_class": "MODEL_ALGORITHM",
        "old_configuration": {
            "implementation_id": old_binding["implementation_id"],
            "algorithm": "initialize_constant_velocity_filter",
            "binding_version": old_binding.get("binding_version"),
        },
        "new_configuration": {
            "implementation_id": new_binding["implementation_id"],
            "algorithm": "initialize_constant_acceleration_filter",
            "binding_version": new_binding.get("binding_version"),
        },
        "frozen_context": frozen,
        "old_e2_envelope": {
            "case_count": len(comparisons),
            "old_cases_pass": sum(r["old_case_pass"] for r in comparisons),
            "new_cases_pass": sum(r["new_case_pass"] for r in comparisons),
            "behavior_equal_9dp_cases": prior_e2_equal,
            "behavior_different_9dp_cases": len(comparisons) - prior_e2_equal,
            "interpretation": "The old E2 envelope is recorded as an execution/contract check. Its trace similarity or difference is not sufficient by itself to authorize carry-forward after an algorithm identity change.",
            "comparisons": comparisons,
        },
        "discriminating_challenge": challenge["comparison"],
        "carry_forward": {
            "automatic_carry_forward_allowed": carry_forward_allowed,
            "decision": "REJECTED_FRESH_IMPLEMENTATION_QUALIFICATION_REQUIRED" if not carry_forward_allowed else "ALLOWED",
            "reused_without_reexecution": ["BP-01", "SP-01"] if semantic_mapping_same else ["BP-01"],
            "historical_stale_for_new_configuration": ["MS-01-v2-CV", "EQ-01-v1-CV", "EB-01-v1-CV", "VU-01b-CV"],
            "freshly_reestablished": ["MS-01 architectural execution for CA"] if all_new_pass else [],
            "still_required": ["fresh CA behavior/fitness-for-use evidence before kinematic intended-use qualification"],
        },
        "current_evidence_state": current,
        "predicates": predicates,
        "supported_inference": "A substantive model-algorithm change crosses the provenance-only carry-forward envelope. Unaffected evidence can remain active, but prior implementation-specific qualification cannot be inherited merely because the upper contract and semantic mapping are unchanged or because the old scenario envelope is non-discriminating.",
        "inference_boundary": [
            "LC-01 does not prove the constant-acceleration filter is better or worse than the constant-velocity filter.",
            "The maneuver challenge is a discrimination control, not an operational model-validity study.",
            "Fuller requalification means fresh affected implementation-level evidence, not a complete reset of unrelated BP-01/SP-01 evidence.",
        ]
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "decision": decision,
        "old_e2_behavior_equal_9dp": f"{prior_e2_equal}/{len(comparisons)}",
        "challenge_discriminates": challenge_discriminates,
        "carry_forward": report["carry_forward"]["decision"],
        "new_architectural_execution": current["MS-01-CA"],
        "new_kinematic_intended_use": current["kinematic_intended_use_CA"],
    }, sort_keys=True))
    return 0 if decision == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
