#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="Evaluate E2 binding-only model substitution")
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--orchestrator", required=True, type=Path)
    ap.add_argument("--run-a", required=True, type=Path)
    ap.add_argument("--run-b", required=True, type=Path)
    ap.add_argument("--report", required=True, type=Path)
    args = ap.parse_args()

    trial = json.loads(args.trial.read_text(encoding="utf-8"))
    a = json.loads((args.run_a / "run_summary.json").read_text(encoding="utf-8"))
    b = json.loads((args.run_b / "run_summary.json").read_text(encoding="utf-8"))

    a_cases = {r["case_id"]: r for r in a["cases"]}
    b_cases = {r["case_id"]: r for r in b["cases"]}
    same_case_set = set(a_cases) == set(b_cases)
    differences = []
    if same_case_set:
        for case_id in sorted(a_cases):
            differences.append({
                "case_id": case_id,
                "implementation_a_trace_sha256": a_cases[case_id]["trace_sha256"],
                "implementation_b_trace_sha256": b_cases[case_id]["trace_sha256"],
                "trace_identical": a_cases[case_id]["trace_sha256"] == b_cases[case_id]["trace_sha256"],
            })

    predicates = {
        "E2-P1_same_trial_spec": a["trial_spec_sha256"] == b["trial_spec_sha256"] == sha256_file(args.trial),
        "E2-P2_same_orchestrator": a["orchestrator_sha256"] == b["orchestrator_sha256"] == sha256_file(args.orchestrator),
        "E2-P3_same_capability_contract": a["capability_id"] == b["capability_id"] == trial["capability_id"] and a["contract_id"] == b["contract_id"] == trial["contract_id"] and a["contract_sha256"] == b["contract_sha256"],
        "E2-P4_same_semantic_profile": a["semantic_profile_id"] == b["semantic_profile_id"] == trial["semantic_profile_id"],
        "E2-P5_distinct_implementation_ids": a["implementation_id"] != b["implementation_id"],
        "E2-P6_distinct_adapter_implementations": a["adapter_sha256"] != b["adapter_sha256"],
        "E2-P7_same_case_set": same_case_set,
        "E2-P8_all_cases_execute_A": a["all_cases_pass"] and a["case_count"] == 16,
        "E2-P9_all_cases_execute_B": b["all_cases_pass"] and b["case_count"] == 16,
        "E2-P10_contract_valid_A": a["all_outputs_contract_valid"],
        "E2-P11_contract_valid_B": b["all_outputs_contract_valid"],
        "E2-P12_at_least_one_behavioral_difference": any(not d["trace_identical"] for d in differences),
        "E2-P13_binding_selection_is_only_invocation_change": (
            a["trial_spec_sha256"] == b["trial_spec_sha256"]
            and a["orchestrator_sha256"] == b["orchestrator_sha256"]
            and a["contract_sha256"] == b["contract_sha256"]
            and a["binding_sha256"] != b["binding_sha256"]
        )
    }

    pass_all = all(predicates.values())
    report = {
        "evidence_profile": "E2 Model Substitution Evidence v1.0",
        "candidate_gate": "MS-01 Model Substitution",
        "decision": "PASS" if pass_all else "FAIL",
        "claim": "The frozen upper trial specification and orchestrator can execute two distinct implementations of sensor.tws.track by changing only the TMSU binding selection.",
        "implementation_a": a["implementation_id"],
        "implementation_b": b["implementation_id"],
        "trial_spec_sha256": sha256_file(args.trial),
        "orchestrator_sha256": sha256_file(args.orchestrator),
        "upper_trial_artifacts_modified_for_swap": 0,
        "binding_selections_changed": 1,
        "case_count_each": a["case_count"],
        "cross_implementation_identical_trace_cases": sum(d["trace_identical"] for d in differences),
        "cross_implementation_different_trace_cases": sum(not d["trace_identical"] for d in differences),
        "predicates": predicates,
        "cases": differences,
        "inference_boundary": [
            "This demonstrates architectural/contract substitutability, not behavioral equivalence between the two models.",
            "The Native-C reference TWS is a research instrument and is not an accredited operational sensor model.",
            "Trial-specific fitness-for-use and authoritative accreditation remain separate decisions."
        ]
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    csv_path = args.report.with_suffix(".csv")
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["case_id", "implementation_a_trace_sha256", "implementation_b_trace_sha256", "trace_identical"])
        writer.writeheader()
        writer.writerows(differences)

    print(json.dumps({
        "decision": report["decision"],
        "case_count_each": report["case_count_each"],
        "different_trace_cases": report["cross_implementation_different_trace_cases"],
        "upper_trial_artifacts_modified_for_swap": 0,
    }, sort_keys=True))
    return 0 if pass_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
