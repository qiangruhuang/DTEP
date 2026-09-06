#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import subprocess
import sys
from pathlib import Path


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_trace(path: Path, trial: dict, binding: dict) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        raise RuntimeError("empty canonical trace")

    meta = lines[0].split("\t")
    if len(meta) != 5 or meta[0] != "META":
        raise RuntimeError("invalid META record")
    dt = float(meta[1])
    frames = int(meta[2])
    if abs(dt - float(trial["execution"]["dt_s"])) > 1e-15:
        raise RuntimeError("dt violates trial contract")
    if frames != int(trial["execution"]["frames"]):
        raise RuntimeError("frame count violates trial contract")
    if meta[3] != binding["capability_id"] or meta[4] != binding["implementation_id"]:
        raise RuntimeError("identity in META does not match binding")

    summaries: dict[int, int] = {}
    tracks_by_frame: dict[int, int] = {}
    n_tracks = 0
    first_track_frame = None

    for line in lines[1:]:
        fields = line.split("\t")
        if fields[0] == "S":
            if len(fields) != 3:
                raise RuntimeError(f"bad S record: {line}")
            frame = int(fields[1])
            count = int(fields[2])
            if frame < 0 or frame >= frames or count < 0 or frame in summaries:
                raise RuntimeError(f"invalid S record: {line}")
            summaries[frame] = count
        elif fields[0] == "T":
            if len(fields) != 9:
                raise RuntimeError(f"bad T record: {line}")
            frame = int(fields[1])
            int(fields[2])
            range_m = float(fields[3])
            range_rate = float(fields[4])
            az = float(fields[5])
            el = float(fields[6])
            quality = float(fields[7])
            signal = float(fields[8])
            nums = [range_m, range_rate, az, el, quality, signal]
            if not all(math.isfinite(v) for v in nums):
                raise RuntimeError(f"non-finite T record: {line}")
            if range_m < 0 or not (0.0 <= quality <= 1.0):
                raise RuntimeError(f"semantic constraint violation: {line}")
            if frame < 0 or frame >= frames:
                raise RuntimeError(f"track frame outside execution range: {line}")
            tracks_by_frame[frame] = tracks_by_frame.get(frame, 0) + 1
            n_tracks += 1
            if first_track_frame is None:
                first_track_frame = frame
        else:
            raise RuntimeError(f"unknown canonical record: {line}")

    if set(summaries) != set(range(frames)):
        raise RuntimeError("canonical trace does not contain exactly one S record for every frame")
    for frame in range(frames):
        if summaries[frame] != tracks_by_frame.get(frame, 0):
            raise RuntimeError(f"track_count mismatch at frame {frame}")
    if n_tracks <= 0:
        raise RuntimeError("trace contains no behavior-bearing track records")

    return {
        "frames": frames,
        "n_track_records": n_tracks,
        "first_track_frame": first_track_frame,
        "max_track_count": max(summaries.values()),
        "contract_valid": True,
    }


def make_case(distance_m: float, azimuth_deg: float, rcs_m2: float, motion: str, closing_speed_mps: float) -> dict:
    return {
        "case_id": f"d{int(distance_m/1000):02d}_a{int(azimuth_deg):02d}_r{int(rcs_m2):02d}_{motion}",
        "distance_m": distance_m,
        "azimuth_deg": azimuth_deg,
        "rcs_m2": rcs_m2,
        "motion": motion,
        "closing_speed_mps": closing_speed_mps,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Binding-neutral E2 TMSU trial orchestrator")
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--binding", required=True, type=Path)
    ap.add_argument("--contract", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()

    trial_path = args.trial.resolve()
    binding_path = args.binding.resolve()
    contract_path = args.contract.resolve()
    outdir = args.outdir.resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    trial = json.loads(trial_path.read_text(encoding="utf-8"))
    binding = json.loads(binding_path.read_text(encoding="utf-8"))
    contract = json.loads(contract_path.read_text(encoding="utf-8"))

    for key in ("capability_id", "contract_id", "semantic_profile_id"):
        if trial[key] != binding[key]:
            raise RuntimeError(f"binding {key} does not match frozen trial")
    if contract["capability_id"] != trial["capability_id"] or contract["contract_id"] != trial["contract_id"]:
        raise RuntimeError("contract identity does not match trial")
    if contract["semantic_profile_id"] != trial["semantic_profile_id"]:
        raise RuntimeError("contract semantic profile does not match trial")

    adapter = Path(binding["adapter"]).resolve()
    levels = trial["scenario_matrix"]
    cases = [
        make_case(d, a, r, m, float(levels["closing_speed_mps"]))
        for d, a, r, m in itertools.product(
            levels["distance_m"], levels["azimuth_deg"], levels["rcs_m2"], levels["motion"]
        )
    ]

    rows = []
    for case in cases:
        case_dir = outdir / case["case_id"]
        case_dir.mkdir(parents=True, exist_ok=True)
        case_path = case_dir / "case.json"
        trace_path = case_dir / "canonical.tsv"
        evidence_path = case_dir / "adapter_evidence.json"
        stderr_path = case_dir / "adapter.stderr.txt"
        case_path.write_text(json.dumps(case, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        proc = subprocess.run(
            [
                sys.executable, str(adapter),
                "--binding", str(binding_path),
                "--trial", str(trial_path),
                "--case", str(case_path),
                "--output", str(trace_path),
                "--evidence", str(evidence_path),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        stderr_path.write_bytes(proc.stderr)
        errors = []
        stats = {}
        if proc.returncode != 0:
            errors.append(f"adapter_returncode={proc.returncode}")
        if not trace_path.exists():
            errors.append("missing_canonical_trace")
        else:
            try:
                stats = validate_trace(trace_path, trial, binding)
            except Exception as exc:
                errors.append(f"contract_validation={exc}")

        rows.append({
            "case_id": case["case_id"],
            "status": "pass" if not errors else "fail",
            "trace_sha256": sha256_file(trace_path) if trace_path.exists() else None,
            "case_sha256": sha256_file(case_path),
            "adapter_returncode": proc.returncode,
            "stderr_bytes": len(proc.stderr),
            **stats,
            "errors": errors,
        })

    summary = {
        "experiment": "E2 Model Substitution",
        "trial_id": trial["trial_id"],
        "capability_id": trial["capability_id"],
        "contract_id": trial["contract_id"],
        "semantic_profile_id": trial["semantic_profile_id"],
        "implementation_id": binding["implementation_id"],
        "migration_path": binding["migration_path"],
        "trial_spec_sha256": sha256_file(trial_path),
        "orchestrator_sha256": sha256_file(Path(__file__).resolve()),
        "contract_sha256": sha256_file(contract_path),
        "binding_sha256": sha256_file(binding_path),
        "adapter_sha256": sha256_file(adapter),
        "case_count": len(rows),
        "passed_cases": sum(r["status"] == "pass" for r in rows),
        "all_cases_pass": all(r["status"] == "pass" for r in rows),
        "all_outputs_contract_valid": all(r.get("contract_valid") is True for r in rows),
        "cases": rows,
    }
    (outdir / "run_summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ["implementation_id", "case_count", "passed_cases", "all_cases_pass", "all_outputs_contract_valid"]}, sort_keys=True))
    return 0 if summary["all_cases_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
