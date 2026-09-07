#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path

ATOL_TIME = 1e-15
ATOL_VALUE = 1e-12
REQUIRED_RUNS = 10


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path: Path) -> tuple[list[str], list[dict[str, float]]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise RuntimeError(f"missing CSV header: {path}")
        fields = list(reader.fieldnames)
        rows = [{k: float(v) for k, v in row.items()} for row in reader]
    if not rows:
        raise RuntimeError(f"empty CSV: {path}")
    return fields, rows


def compare_rows(
    a_fields: list[str],
    a_rows: list[dict[str, float]],
    b_fields: list[str],
    b_rows: list[dict[str, float]],
) -> dict:
    errors: list[str] = []
    if a_fields != b_fields:
        errors.append("column_mismatch")
    if len(a_rows) != len(b_rows):
        errors.append("row_count_mismatch")
    max_time = 0.0
    max_value = 0.0
    if not errors:
        if "time" not in a_fields or "h" not in a_fields or "v" not in a_fields:
            errors.append("required_columns_missing")
        else:
            for ra, rb in zip(a_rows, b_rows):
                max_time = max(max_time, abs(ra["time"] - rb["time"]))
                max_value = max(max_value, abs(ra["h"] - rb["h"]), abs(ra["v"] - rb["v"]))
    passed = not errors and max_time <= ATOL_TIME and max_value <= ATOL_VALUE
    return {
        "passed": passed,
        "errors": errors,
        "max_abs_time_difference_s": max_time,
        "max_abs_state_difference": max_value,
        "time_tolerance_s": ATOL_TIME,
        "state_absolute_tolerance": ATOL_VALUE,
    }


def load_runs(directory: Path) -> list[Path]:
    runs = sorted(directory.glob("run_*.csv"))
    if len(runs) != REQUIRED_RUNS:
        raise RuntimeError(f"expected {REQUIRED_RUNS} repeats in {directory}, found {len(runs)}")
    return runs


def identity_differences(a: dict, b: dict) -> list[str]:
    keys = sorted(set(a) | set(b))
    return [k for k in keys if a.get(k) != b.get(k)]


def main() -> int:
    ap = argparse.ArgumentParser(description="ENV-01 minimal execution-environment lifecycle experiment")
    ap.add_argument("--baseline-dir", required=True, type=Path)
    ap.add_argument("--changed-dir", required=True, type=Path)
    ap.add_argument("--baseline-env", required=True, type=Path)
    ap.add_argument("--changed-env", required=True, type=Path)
    ap.add_argument("--dependency-map", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    baseline_runs = load_runs(args.baseline_dir)
    changed_runs = load_runs(args.changed_dir)
    baseline_hashes = [sha256_file(p) for p in baseline_runs]
    changed_hashes = [sha256_file(p) for p in changed_runs]
    baseline_repeat_stable = len(set(baseline_hashes)) == 1
    changed_repeat_stable = len(set(changed_hashes)) == 1

    base_fields, base_rows = read_csv(baseline_runs[0])
    cross_rows = []
    for p in changed_runs:
        fields, rows = read_csv(p)
        cmp = compare_rows(base_fields, base_rows, fields, rows)
        cross_rows.append({"changed_run": p.name, **cmp})
    cross_environment_equivalent = all(r["passed"] for r in cross_rows)
    cross_environment_byte_identical = baseline_hashes[0] == changed_hashes[0]

    # Frozen negative control: one state value is changed by 1e-6, which must exceed the 1e-12 gate.
    neg_rows = [dict(r) for r in base_rows]
    neg_rows[len(neg_rows) // 2]["h"] += 1e-6
    negative_control = compare_rows(base_fields, base_rows, base_fields, neg_rows)
    negative_control_detected = not negative_control["passed"]

    baseline_env = json.loads(args.baseline_env.read_text(encoding="utf-8"))
    changed_env = json.loads(args.changed_env.read_text(encoding="utf-8"))
    env_diff = identity_differences(baseline_env, changed_env)
    host_fields = ["os", "kernel", "architecture", "runner_name"]
    host_held_constant = all(baseline_env.get(k) == changed_env.get(k) for k in host_fields)
    runtime_changed = (
        baseline_env.get("fmusim_version") != changed_env.get("fmusim_version")
        and baseline_env.get("fmusim_binary_sha256") != changed_env.get("fmusim_binary_sha256")
    )

    dependency_map = json.loads(args.dependency_map.read_text(encoding="utf-8"))
    changed_types = set(dependency_map["change_classes"].get("EXECUTION_ENVIRONMENT", []))
    source_dependencies = {
        "CAPABILITY",
        "IMPLEMENTATION",
        "EXECUTION_ENVIRONMENT",
        "EVIDENCE_METHOD",
    }
    semantic_control_dependencies = {"SEMANTIC_PROFILE", "CAPABILITY_CONTRACT"}
    source_intersection = sorted(source_dependencies & changed_types)
    control_intersection = sorted(semantic_control_dependencies & changed_types)

    source_before = "ACTIVE"
    source_after_change = "STALE" if source_intersection else "ACTIVE"
    semantic_control_after_change = "STALE" if control_intersection else "ACTIVE"

    delta_gate_pass = (
        baseline_repeat_stable
        and changed_repeat_stable
        and cross_environment_equivalent
        and negative_control_detected
        and host_held_constant
        and runtime_changed
        and changed_types == {"EXECUTION_ENVIRONMENT"}
        and source_after_change == "STALE"
        and semantic_control_after_change == "ACTIVE"
    )
    restored_current_lifecycle = "ACTIVE" if delta_gate_pass else "STALE"
    restored_current_decision = "PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE" if delta_gate_pass else "UNKNOWN"

    repeat_rows = []
    for arm, paths, hashes in [
        ("source_fmusim_0.9.0", baseline_runs, baseline_hashes),
        ("changed_fmusim_0.10.0", changed_runs, changed_hashes),
    ]:
        for p, h in zip(paths, hashes):
            repeat_rows.append({"environment": arm, "run": p.name, "sha256": h})

    result = {
        "experiment": "ENV-01 minimal execution-environment closure",
        "change_class": "EXECUTION_ENVIRONMENT",
        "inference_boundary": "one deterministic FMI 3.0 Co-Simulation micro-demonstration and one fmusim runtime-version transition on the same hosted runner",
        "environment_identity": {
            "source": baseline_env,
            "changed": changed_env,
            "differing_fields": env_diff,
            "host_fields_held_constant": host_held_constant,
            "runtime_version_and_binary_changed": runtime_changed,
        },
        "same_machine_repeat": {
            "runs_per_environment": REQUIRED_RUNS,
            "source_all_byte_identical": baseline_repeat_stable,
            "changed_all_byte_identical": changed_repeat_stable,
            "source_unique_trace_hashes": len(set(baseline_hashes)),
            "changed_unique_trace_hashes": len(set(changed_hashes)),
        },
        "cross_environment_delta": {
            "all_changed_runs_numerically_equivalent_to_source_reference": cross_environment_equivalent,
            "source_and_changed_reference_byte_identical": cross_environment_byte_identical,
            "comparisons": cross_rows,
        },
        "negative_control": {
            "perturbation": "one h value +1e-6",
            "detected": negative_control_detected,
            "comparator_result": negative_control,
        },
        "dependency_analysis": {
            "declared_changed_typed_artifacts": sorted(changed_types),
            "source_execution_evidence_dependencies": sorted(source_dependencies),
            "source_dependency_intersection": source_intersection,
            "semantic_control_dependencies": sorted(semantic_control_dependencies),
            "semantic_control_intersection": control_intersection,
        },
        "lifecycle_transition": {
            "source_execution_evidence": {
                "before_change": source_before,
                "after_environment_change": source_after_change,
                "historical_provenance_retained": True,
            },
            "restored_current_claim": {
                "lifecycle": restored_current_lifecycle,
                "decision": restored_current_decision,
                "restoration_basis": "typed runtime-change delta evidence under frozen numerical comparator",
            },
            "unaffected_semantic_control": {
                "after_environment_change": semantic_control_after_change,
                "reassessment_required": semantic_control_after_change != "ACTIVE",
            },
        },
        "decision": "PASS" if delta_gate_pass else "FAIL",
        "limits": [
            "No claim is made for operating-system, hardware-architecture, compiler, HLA, stochastic-model, or arbitrary numerical-stack portability.",
            "The experiment tests evidence lifecycle behavior, not physical-model fidelity.",
            "Successful delta evidence restores only the affected execution/conformance claim; it does not create broader fitness-for-use qualification.",
        ],
    }

    (args.outdir / "env01_result.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    with (args.outdir / "repeat_hashes.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["environment", "run", "sha256"])
        w.writeheader()
        w.writerows(repeat_rows)

    print(json.dumps({
        "decision": result["decision"],
        "source_repeat_stable": baseline_repeat_stable,
        "changed_repeat_stable": changed_repeat_stable,
        "cross_environment_equivalent": cross_environment_equivalent,
        "cross_environment_byte_identical": cross_environment_byte_identical,
        "negative_control_detected": negative_control_detected,
        "source_after_change": source_after_change,
        "restored_decision": restored_current_decision,
    }, sort_keys=True))
    return 0 if result["decision"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
