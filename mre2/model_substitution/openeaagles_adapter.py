#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path

STATION_WARNING = "unable to locate the Station class"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def render_case(template: str, case: dict) -> str:
    distance_m = float(case["distance_m"])
    az_deg = float(case["azimuth_deg"])
    rcs_m2 = float(case["rcs_m2"])
    motion = case["motion"]
    az = math.radians(az_deg)
    x = distance_m * math.cos(az)
    y = distance_m * math.sin(az)
    moving = motion == "closing"
    heading = (180.0 + az_deg) % 360.0
    replacements = {
        "__RCS_M2__": f"{rcs_m2:.6f}",
        "__TARGET_X_M__": f"{x:.6f}",
        "__TARGET_Y_M__": f"{y:.6f}",
        "__TARGET_HEADING_DEG__": f"{heading:.6f}",
        "__TARGET_VELOCITY_MPS__": f"{float(case.get('closing_speed_mps', 150.0)):.6f}" if moving else "0.0",
        "__POSITION_FREEZE__": "false" if moving else "true",
    }
    rendered = template
    for token, value in replacements.items():
        rendered = rendered.replace(token, value)
    if "__" in rendered:
        raise RuntimeError("unresolved template token remains")
    return rendered


def canonicalize(raw: bytes, capability_id: str, implementation_id: str, expected_dt: float, expected_frames: int) -> bytes:
    lines = raw.decode("utf-8", errors="strict").splitlines()
    if not lines or not lines[0].startswith("META\t"):
        raise RuntimeError("native trace missing META record")
    meta = lines[0].split("\t")
    if len(meta) != 5 or meta[1] != "dt" or meta[3] != "frames":
        raise RuntimeError(f"unexpected native META record: {lines[0]}")
    native_dt = float(meta[2])
    native_frames = int(meta[4])
    if abs(native_dt - expected_dt) > 1e-15 or native_frames != expected_frames:
        raise RuntimeError("native time configuration differs from frozen trial")

    out = [f"META\t{native_dt:.17g}\t{native_frames}\t{capability_id}\t{implementation_id}"]
    for line in lines[1:]:
        fields = line.split("\t")
        if not fields:
            continue
        if fields[0] == "S":
            if len(fields) != 3:
                raise RuntimeError(f"invalid native S record: {line}")
            out.append(line)
        elif fields[0] == "T":
            if len(fields) != 9:
                raise RuntimeError(f"invalid native T record: {line}")
            out.append(line)
        else:
            raise RuntimeError(f"unknown native record type: {fields[0]}")
    return ("\n".join(out) + "\n").encode("utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="OpenEaagles TWS adapter for E2 substitution")
    ap.add_argument("--binding", required=True, type=Path)
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--case", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--evidence", required=True, type=Path)
    args = ap.parse_args()

    binding = json.loads(args.binding.read_text(encoding="utf-8"))
    trial = json.loads(args.trial.read_text(encoding="utf-8"))
    case = json.loads(args.case.read_text(encoding="utf-8"))

    binary = Path(binding["runtime"]["probe_binary"]).resolve()
    template_path = Path(binding["runtime"]["scenario_template"]).resolve()
    if not binary.exists():
        raise FileNotFoundError(binary)
    template = template_path.read_text(encoding="utf-8")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    scenario_path = args.output.parent / "rendered_openeaagles.edl"
    scenario_path.write_text(render_case(template, case), encoding="utf-8")

    proc = subprocess.run(
        [str(binary), "--config", str(scenario_path), "--frames", str(int(trial["execution"]["frames"]))],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    stderr_text = proc.stderr.decode("utf-8", errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(f"OpenEaagles probe failed with return code {proc.returncode}: {stderr_text}")
    if STATION_WARNING in stderr_text:
        raise RuntimeError("OpenEaagles emitted missing-Station lifecycle warning")

    canonical = canonicalize(
        proc.stdout,
        binding["capability_id"],
        binding["implementation_id"],
        float(trial["execution"]["dt_s"]),
        int(trial["execution"]["frames"]),
    )
    args.output.write_bytes(canonical)

    evidence = {
        "adapter": "openeaagles_adapter.py",
        "capability_id": binding["capability_id"],
        "implementation_id": binding["implementation_id"],
        "case_id": case["case_id"],
        "returncode": proc.returncode,
        "station_warning_present": STATION_WARNING in stderr_text,
        "stderr_bytes": len(proc.stderr),
        "native_trace_sha256": sha256_bytes(proc.stdout),
        "canonical_trace_sha256": sha256_bytes(canonical),
        "scenario_sha256": sha256_bytes(scenario_path.read_bytes()),
        "numeric_payload_transformations": 0,
        "canonicalization": "metadata header normalization only; S/T numeric payload copied verbatim",
        "bp01_evidence_set_id": binding.get("bp01", {}).get("evidence_set_id"),
    }
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
