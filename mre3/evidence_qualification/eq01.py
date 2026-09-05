#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def candidate_evidence(registry: dict, implementation_id: str) -> list[dict]:
    out = []
    for item in registry["evidence_sets"].values():
        if item.get("decision") != "PASS":
            continue
        if item.get("candidate_implementation_id") == implementation_id:
            out.append(item)
            continue
        if implementation_id in item.get("implementation_ids", []):
            out.append(item)
            continue
        if item.get("implementation_id") == implementation_id:
            out.append(item)
    return out


def domain_contains(envelope: dict, requested: dict) -> bool:
    for key, req in requested.items():
        if key not in envelope:
            return False
        env = envelope[key]
        if not isinstance(req, list) or len(req) != 2 or not isinstance(env, list) or len(env) != 2:
            return False
        if float(req[0]) < float(env[0]) or float(req[1]) > float(env[1]):
            return False
    return True


def screen_case(case: dict, registry: dict) -> dict:
    implementation_id = case["implementation_id"]
    evidence = candidate_evidence(registry, implementation_id)
    supports = sorted({s for e in evidence for s in e.get("supports", [])})

    sp = next((e for e in evidence if "semantic_precheck" in e.get("supports", [])), None)
    semantic_reasons = []
    incompatible = []
    unknown = []
    for field in case["required_observables"]:
        status = case.get("semantic_overrides", {}).get(field)
        if status is None:
            status = (sp or {}).get("field_status", {}).get(field, "UNKNOWN")
        if status == "INCOMPATIBLE":
            incompatible.append(field)
        elif status != "COMPATIBLE":
            unknown.append(field)

    if incompatible:
        semantic_reasons.append({"code": "SEM-INCOMPATIBLE", "fields": incompatible})
    if unknown:
        semantic_reasons.append({"code": "SEM-UNKNOWN", "fields": unknown})

    absent_evidence = sorted(set(case["required_evidence"]) - set(supports))

    domain_ok = any(
        domain_contains(e["envelope"], case["requested_domain"])
        for e in evidence
        if "envelope" in e
    )

    reasons = list(semantic_reasons)
    if absent_evidence:
        reasons.append({"code": "EVIDENCE-ABSENT", "items": absent_evidence})
    if not domain_ok:
        reasons.append({"code": "DOMAIN-OUTSIDE-EVIDENCE", "requested_domain": case["requested_domain"]})

    if incompatible:
        decision = "NOT_QUALIFIED"
    elif unknown or absent_evidence or not domain_ok:
        decision = "UNKNOWN"
    else:
        decision = "QUALIFIED_WITHIN_EVIDENCE"

    return {
        "case_id": case["case_id"],
        "implementation_id": implementation_id,
        "use_class": case["use_class"],
        "decision": decision,
        "expected_decision": case["expected_decision"],
        "matched_expectation": decision == case["expected_decision"],
        "available_supports": supports,
        "reasons": reasons,
    }


def impact_decision(change: dict, deps: dict) -> dict:
    changed = set(change["changed_dimensions"])
    actual = {}
    for gate, gate_deps in deps.items():
        actual[gate] = "REASSESS" if changed.intersection(gate_deps) else "REUSE"
    expected = change["expected"]
    return {
        "change_id": change["change_id"],
        "changed_dimensions": change["changed_dimensions"],
        "actual": actual,
        "expected": expected,
        "matched_expectation": actual == expected,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="EQ-01 evidence-aware intended-use qualification and evidence-reuse experiment")
    ap.add_argument("--root", type=Path, default=Path("."))
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    root = args.root.resolve()
    base = root / "mre3/evidence_qualification"
    registry_path = base / "evidence_registry.json"
    profile_path = base / "qualification_profile.json"
    use_cases_path = base / "intended_use_cases.json"
    change_cases_path = base / "change_cases.json"

    registry = load(registry_path)
    profile = load(profile_path)
    use_cases = load(use_cases_path)["cases"]
    change_doc = load(change_cases_path)

    # Evidence registry must point to files that exist in the checked-out branch.
    evidence_report_hashes = {}
    for gate, e in registry["evidence_sets"].items():
        report = root / e["report"]
        if not report.exists():
            raise RuntimeError(f"missing referenced evidence report for {gate}: {report}")
        evidence_report_hashes[gate] = sha256(report)

    qualification_results = [screen_case(c, registry) for c in use_cases]
    impact_results = [impact_decision(c, change_doc["gate_dependencies"]) for c in change_doc["changes"]]

    q_ok = all(r["matched_expectation"] for r in qualification_results)
    i_ok = all(r["matched_expectation"] for r in impact_results)

    reuse_cells = sum(
        1
        for r in impact_results
        for v in r["actual"].values()
        if v == "REUSE"
    )
    total_cells = sum(len(r["actual"]) for r in impact_results)
    reassess_cells = total_cells - reuse_cells

    result = {
        "experiment_id": "EQ-01",
        "research_target": ["RQ4", "H5"],
        "profile_id": profile["profile_id"],
        "qualification_results": qualification_results,
        "change_impact_results": impact_results,
        "metrics": {
            "qualification_cases_matching_preregistered_expectation": sum(r["matched_expectation"] for r in qualification_results),
            "qualification_case_count": len(qualification_results),
            "change_cases_matching_preregistered_expectation": sum(r["matched_expectation"] for r in impact_results),
            "change_case_count": len(impact_results),
            "gate_change_cells_total": total_cells,
            "gate_change_cells_reused": reuse_cells,
            "gate_change_cells_reassessed": reassess_cells,
            "selective_evidence_reuse_fraction": reuse_cells / total_cells if total_cells else 0.0,
            "naive_full_reassessment_cells": total_cells,
            "avoided_reassessment_cells_under_preregistered_dependency_rules": reuse_cells,
        },
        "evidence_report_sha256": evidence_report_hashes,
        "input_sha256": {
            "evidence_registry.json": sha256(registry_path),
            "qualification_profile.json": sha256(profile_path),
            "intended_use_cases.json": sha256(use_cases_path),
            "change_cases.json": sha256(change_cases_path),
        },
        "decision": "PASS" if q_ok and i_ok else "FAIL",
        "boundary": profile["important_boundary"],
    }

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "eq01_results.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    with (args.out / "qualification_results.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["case_id", "use_class", "decision", "expected", "matched", "reason_codes"])
        for r in qualification_results:
            w.writerow([r["case_id"], r["use_class"], r["decision"], r["expected_decision"], r["matched_expectation"], ";".join(x["code"] for x in r["reasons"])])

    with (args.out / "change_impact_results.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["change_id", "BP-01", "SP-01", "MS-01", "matched"])
        for r in impact_results:
            w.writerow([r["change_id"], r["actual"]["BP-01"], r["actual"]["SP-01"], r["actual"]["MS-01"], r["matched_expectation"]])

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["decision"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
