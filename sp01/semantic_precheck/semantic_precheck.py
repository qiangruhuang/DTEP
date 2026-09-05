#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
from pathlib import Path

REQUIRED_DESCRIPTOR_KEYS = {
    "concept", "concept_relation", "datatype", "unit",
    "reference_frame", "time_basis", "sign_convention"
}

FROZEN_UPPER_HASHES = {
    "mre2/model_substitution/trial_spec.json": "af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf",
    "mre2/model_substitution/orchestrator.py": "b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db",
    "mre2/model_substitution/capability_contract.json": "f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def materialize(base: dict, case: dict) -> dict:
    candidate = copy.deepcopy(base)
    candidate["candidate_id"] = case["case_id"]
    if case.get("implementation_id"):
        candidate["implementation_id"] = case["implementation_id"]
    for mutation in case.get("mutations", []):
        field = mutation["field"]
        dimension = mutation["dimension"]
        candidate["fields"][field][dimension] = mutation["value"]
    return candidate


def structural_validate(candidate: dict, canonical: dict) -> tuple[str, list[str]]:
    reasons: list[str] = []
    for key in ("candidate_id", "capability_id", "contract_id", "semantic_profile_id", "implementation_id", "fields"):
        if key not in candidate:
            reasons.append(f"STRUCT-MISSING:{key}")
    if reasons:
        return "FAIL", reasons
    if not isinstance(candidate["fields"], dict):
        return "FAIL", ["STRUCT-FIELDS-NOT-OBJECT"]
    if set(candidate["fields"]) != set(canonical["fields"]):
        return "FAIL", ["STRUCT-FIELD-SET-MISMATCH"]
    for field, descriptor in candidate["fields"].items():
        if not isinstance(descriptor, dict):
            reasons.append(f"STRUCT-DESCRIPTOR-NOT-OBJECT:{field}")
            continue
        missing = REQUIRED_DESCRIPTOR_KEYS - set(descriptor)
        if missing:
            reasons.append(f"STRUCT-MISSING-DESCRIPTOR:{field}:{','.join(sorted(missing))}")
        for key in REQUIRED_DESCRIPTOR_KEYS & set(descriptor):
            if not isinstance(descriptor[key], str):
                reasons.append(f"STRUCT-NONSTRING:{field}:{key}")
    return ("PASS", []) if not reasons else ("FAIL", reasons)


def semantic_precheck(candidate: dict, canonical: dict) -> tuple[str, list[str]]:
    reasons: list[str] = []
    unknowns: list[str] = []

    if candidate["capability_id"] != canonical["capability_id"]:
        reasons.append("SEM-CAPABILITY-ID-MISMATCH")
    if candidate["contract_id"] != canonical["contract_id"]:
        reasons.append("SEM-CONTRACT-ID-MISMATCH")
    if candidate["semantic_profile_id"] != canonical["profile_id"]:
        reasons.append("SEM-PROFILE-ID-MISMATCH")

    for field, required in canonical["fields"].items():
        actual = candidate["fields"][field]
        for dimension, code in (
            ("datatype", "SEM-DATATYPE"),
            ("unit", "SEM-UNIT"),
            ("reference_frame", "SEM-FRAME"),
            ("time_basis", "SEM-TIME"),
            ("sign_convention", "SEM-SIGN"),
        ):
            if actual[dimension] != required[dimension]:
                reasons.append(f"{code}:{field}:{actual[dimension]}!={required[dimension]}")

        relation = actual.get("concept_relation", "unknown")
        if relation == "different":
            reasons.append(f"SEM-CONCEPT:{field}:different")
        elif relation == "unknown":
            unknowns.append(f"SEM-CONCEPT-UNKNOWN:{field}:{actual['concept']}?={required['concept']}")
        elif relation == "equivalent":
            if actual["concept"] != required["concept"] and not actual.get("equivalence_evidence"):
                unknowns.append(f"SEM-CONCEPT-EVIDENCE-MISSING:{field}:{actual['concept']}?={required['concept']}")
        else:
            unknowns.append(f"SEM-CONCEPT-RELATION-UNKNOWN:{field}:{relation}")

    if reasons:
        return "INCOMPATIBLE", reasons + unknowns
    if unknowns:
        return "UNKNOWN", unknowns
    return "COMPATIBLE", []


def main() -> int:
    ap = argparse.ArgumentParser(description="SP-01 semantic-precheck ablation")
    ap.add_argument("--canonical", type=Path, default=Path("sp01/semantic_precheck/canonical_semantic_profile.json"))
    ap.add_argument("--cases", type=Path, default=Path("sp01/semantic_precheck/sp01_cases.json"))
    ap.add_argument("--out", type=Path, default=Path("build/sp01"))
    args = ap.parse_args()

    canonical = json.loads(args.canonical.read_text(encoding="utf-8"))
    experiment = json.loads(args.cases.read_text(encoding="utf-8"))
    args.out.mkdir(parents=True, exist_ok=True)

    frozen_hashes = {}
    frozen_ok = True
    for name, expected in FROZEN_UPPER_HASHES.items():
        actual = sha256(Path(name))
        frozen_hashes[name] = {"expected": expected, "actual": actual, "match": actual == expected}
        frozen_ok &= actual == expected

    results = []
    injected_total = 0
    injected_correct = 0
    positive_ok = False
    ambiguity_ok = False

    for case in experiment["cases"]:
        candidate = materialize(experiment["base_candidate"], case)
        structural_decision, structural_reasons = structural_validate(candidate, canonical)
        if structural_decision == "PASS":
            semantic_decision, semantic_reasons = semantic_precheck(candidate, canonical)
        else:
            semantic_decision, semantic_reasons = "NOT_EVALUATED", []

        expected_ok = (
            structural_decision == case["expected_structural"]
            and semantic_decision == case["expected_semantic"]
        )

        if case["kind"] == "injected_mismatch":
            injected_total += 1
            if structural_decision == "PASS" and semantic_decision == "INCOMPATIBLE":
                injected_correct += 1
        elif case["kind"] == "positive_control":
            positive_ok = expected_ok
        elif case["kind"] == "real_ambiguity_control":
            ambiguity_ok = expected_ok

        results.append({
            "case_id": case["case_id"],
            "kind": case["kind"],
            "implementation_id": candidate["implementation_id"],
            "semantic_profile_id": candidate["semantic_profile_id"],
            "structural_decision": structural_decision,
            "semantic_decision": semantic_decision,
            "expected_structural": case["expected_structural"],
            "expected_semantic": case["expected_semantic"],
            "expected_ok": expected_ok,
            "structural_reasons": structural_reasons,
            "semantic_reasons": semantic_reasons,
            "mutations": case.get("mutations", []),
            "evidence_note": case.get("evidence_note"),
        })

    detection_rate = injected_correct / injected_total if injected_total else 0.0
    all_structural_pass = all(r["structural_decision"] == "PASS" for r in results)
    all_expected = all(r["expected_ok"] for r in results)
    same_profile_id = len({r["semantic_profile_id"] for r in results}) == 1

    pass_conditions = {
        "frozen_upper_trial_hashes_match": frozen_ok,
        "all_cases_pass_structural_arm": all_structural_pass,
        "same_semantic_profile_id_across_all_ablation_cases": same_profile_id,
        "positive_control_is_compatible": positive_ok,
        "five_of_five_injected_mismatches_rejected": injected_total == 5 and injected_correct == 5,
        "real_rf_ambiguity_returns_unknown": ambiguity_ok,
        "all_preregistered_expected_decisions_met": all_expected,
    }
    decision = "PASS" if all(pass_conditions.values()) else "FAIL"

    evidence = {
        "experiment_id": experiment["experiment_id"],
        "decision": decision,
        "research_target": "RQ3 / H4",
        "ablation": {
            "arm_a": "structural metadata validation only",
            "arm_b": "structural validation plus semantic precheck",
            "injected_mismatch_count": injected_total,
            "injected_mismatch_correctly_rejected": injected_correct,
            "semantic_detection_rate": detection_rate,
        },
        "pass_conditions": pass_conditions,
        "frozen_upper_trial_hashes": frozen_hashes,
        "canonical_profile_sha256": sha256(args.canonical),
        "case_spec_sha256": sha256(args.cases),
        "results": results,
        "inference_boundary": "SP-01 tests pre-execution semantic-declaration checking. It does not prove that any asserted concept mapping is physically valid unless equivalence evidence is supplied.",
    }
    (args.out / "sp01_evidence.json").write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    with (args.out / "sp01_case_results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["case_id", "kind", "structural", "semantic", "expected", "ok"])
        for r in results:
            writer.writerow([r["case_id"], r["kind"], r["structural_decision"], r["semantic_decision"], r["expected_semantic"], r["expected_ok"]])

    print(json.dumps({
        "decision": decision,
        "detection_rate": detection_rate,
        "injected_correct": f"{injected_correct}/{injected_total}",
        "positive_ok": positive_ok,
        "ambiguity_ok": ambiguity_ok,
        "all_structural_pass": all_structural_pass,
    }, sort_keys=True))
    return 0 if decision == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
