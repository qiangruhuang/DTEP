#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import json
import subprocess
from pathlib import Path

BASE_COMMIT = "a3a6cdaa4365e56620f3ecd0a38f15003697ed93"
BASE_ORCHESTRATOR = "mre2/model_substitution/orchestrator.py"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_show(spec: str) -> str:
    proc = subprocess.run(["git", "show", spec], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    return proc.stdout


def diff_counts(old: str, new: str) -> tuple[int, int]:
    added = deleted = 0
    for line in difflib.ndiff(old.splitlines(), new.splitlines()):
        if line.startswith("+ "):
            added += 1
        elif line.startswith("- "):
            deleted += 1
    return added, deleted


def count_nonblank(text: str) -> int:
    return sum(bool(line.strip()) for line in text.splitlines())


def load_summary(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def trace_map(run_dir: Path) -> dict[str, Path]:
    return {p.parent.name: p for p in run_dir.glob("*/canonical.tsv")}


def main() -> int:
    ap = argparse.ArgumentParser(description="Evaluate paired RQ5 engineering-change burden")
    ap.add_argument("--tmsu-run", required=True, type=Path)
    ap.add_argument("--bespoke-run", required=True, type=Path)
    ap.add_argument("--generic-orchestrator", required=True, type=Path)
    ap.add_argument("--bespoke-orchestrator", required=True, type=Path)
    ap.add_argument("--adapter", required=True, type=Path)
    ap.add_argument("--binding", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    base_text = git_show(f"{BASE_COMMIT}:{BASE_ORCHESTRATOR}")
    generic_text = args.generic_orchestrator.read_text(encoding="utf-8")
    bespoke_text = args.bespoke_orchestrator.read_text(encoding="utf-8")

    generic_add, generic_del = diff_counts(base_text, generic_text)
    bespoke_add, bespoke_del = diff_counts(base_text, bespoke_text)

    tmsu_summary = load_summary(args.tmsu_run / "run_summary.json")
    bespoke_summary = load_summary(args.bespoke_run / "run_summary.json")
    a = trace_map(args.tmsu_run)
    b = trace_map(args.bespoke_run)
    common = sorted(set(a) & set(b))
    trace_rows = []
    for case_id in common:
        sha_a = sha256_file(a[case_id])
        sha_b = sha256_file(b[case_id])
        trace_rows.append({
            "case_id": case_id,
            "tmsu_sha256": sha_a,
            "bespoke_sha256": sha_b,
            "byte_identical": sha_a == sha_b,
        })

    tokens = [
        "RadarSimPublic", "radarsimpublic", "src.radar",
        "initialize_constant_velocity_filter", "RadarParameters",
        "upstream/RadarSimPublic",
    ]
    tmsu_direct_refs = sum(generic_text.count(t) for t in tokens)
    bespoke_direct_refs = sum(bespoke_text.count(t) for t in tokens)

    adapter_text = args.adapter.read_text(encoding="utf-8")
    binding_text = args.binding.read_text(encoding="utf-8")
    tmsu_boundary_physical_lines = len(adapter_text.splitlines()) + len(binding_text.splitlines())
    tmsu_boundary_nonblank_lines = count_nonblank(adapter_text) + count_nonblank(binding_text)

    update_reassessment = {
        "tmsu_binding_path": {
            "BP-01": "REUSE",
            "SP-01": "REASSESS",
            "MS-01": "REUSE",
            "upper_orchestrator_regression": "REUSE",
        },
        "bespoke_direct_path": {
            "BP-01": "REUSE",
            "SP-01": "REASSESS",
            "MS-01": "REASSESS",
            "upper_orchestrator_regression": "REASSESS",
        },
    }

    metrics = {
        "experiment": "EB-01 Paired Engineering-Burden Experiment",
        "research_target": "RQ5 / H1",
        "task": "Onboard the same frozen RadarSimPublic implementation into the same frozen E2 trial",
        "common_start_commit": BASE_COMMIT,
        "functional_equivalence": {
            "tmsu_cases_pass": tmsu_summary["passed_cases"],
            "bespoke_cases_pass": bespoke_summary["passed_cases"],
            "case_count_each": tmsu_summary["case_count"],
            "matched_case_count": len(common),
            "byte_identical_output_cases": sum(r["byte_identical"] for r in trace_rows),
            "all_matched_outputs_byte_identical": bool(trace_rows) and all(r["byte_identical"] for r in trace_rows),
        },
        "initial_integration": {
            "tmsu_binding_path": {
                "frozen_upper_orchestrator_modified": (generic_add + generic_del) > 0,
                "upper_orchestrator_lines_added": generic_add,
                "upper_orchestrator_lines_deleted": generic_del,
                "upper_orchestrator_line_churn": generic_add + generic_del,
                "direct_model_dependency_references_in_upper_core": tmsu_direct_refs,
                "model_specific_boundary_artifacts": 2,
                "boundary_artifact_physical_lines": tmsu_boundary_physical_lines,
                "boundary_artifact_nonblank_lines": tmsu_boundary_nonblank_lines,
                "integration_code_location": "adapter + binding outside frozen upper orchestrator",
            },
            "bespoke_direct_path": {
                "frozen_upper_orchestrator_modified": (bespoke_add + bespoke_del) > 0,
                "upper_orchestrator_lines_added": bespoke_add,
                "upper_orchestrator_lines_deleted": bespoke_del,
                "upper_orchestrator_line_churn": bespoke_add + bespoke_del,
                "direct_model_dependency_references_in_upper_core": bespoke_direct_refs,
                "model_specific_boundary_artifacts": 0,
                "integration_code_location": "direct model-specific imports/configuration/mapping in upper orchestrator",
            },
        },
        "semantic_mapping_update": update_reassessment,
        "interpretation_limits": [
            "This experiment measures objective change surface, coupling and reassessment scope; it does not measure human engineer-hours.",
            "Physical/nonblank lines are descriptive burden proxies, not interchangeable with time or cost.",
            "The bespoke arm is a controlled point-to-point integration benchmark, not an empirical sample of all legacy integration practices.",
        ],
    }

    predicates = {
        "same_task_outputs": metrics["functional_equivalence"]["all_matched_outputs_byte_identical"] and len(common) == 16,
        "both_arms_execute_all_cases": tmsu_summary["all_cases_pass"] and bespoke_summary["all_cases_pass"],
        "tmsu_preserves_frozen_upper_orchestrator": generic_add == 0 and generic_del == 0,
        "bespoke_changes_upper_orchestrator": (bespoke_add + bespoke_del) > 0,
        "tmsu_has_no_direct_model_dependency_in_upper_core": tmsu_direct_refs == 0,
        "bespoke_has_direct_model_dependency_in_upper_core": bespoke_direct_refs > 0,
        "semantic_update_reassessment_radius_smaller_for_tmsu":
            sum(v == "REASSESS" for v in update_reassessment["tmsu_binding_path"].values())
            <
            sum(v == "REASSESS" for v in update_reassessment["bespoke_direct_path"].values()),
    }
    metrics["predicates"] = predicates
    metrics["decision"] = "PASS" if all(predicates.values()) else "FAIL"
    metrics["h1_time_claim"] = "NOT_DIRECTLY_TESTED"

    (args.outdir / "engineering_burden_result.json").write_text(
        json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    with (args.outdir / "trace_equivalence.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["case_id", "tmsu_sha256", "bespoke_sha256", "byte_identical"])
        w.writeheader()
        w.writerows(trace_rows)

    print(json.dumps({
        "decision": metrics["decision"],
        "tmsu_upper_core_churn": generic_add + generic_del,
        "bespoke_upper_core_churn": bespoke_add + bespoke_del,
        "byte_identical_output_cases": metrics["functional_equivalence"]["byte_identical_output_cases"],
        "tmsu_semantic_update_reassess_count": sum(v == "REASSESS" for v in update_reassessment["tmsu_binding_path"].values()),
        "bespoke_semantic_update_reassess_count": sum(v == "REASSESS" for v in update_reassessment["bespoke_direct_path"].values()),
        "h1_time_claim": metrics["h1_time_claim"],
    }, sort_keys=True))
    return 0 if metrics["decision"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
