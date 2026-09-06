#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import math
import subprocess
import sys
from pathlib import Path

STATION_WARNING = "unable to locate the Station class"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def render_case(template: str, distance_m: float, az_deg: float, rcs_m2: float, motion: str) -> str:
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
        "__TARGET_VELOCITY_MPS__": "150.0" if moving else "0.0",
        "__POSITION_FREEZE__": "false" if moving else "true",
    }
    rendered = template
    for token, value in replacements.items():
        rendered = rendered.replace(token, value)
    if "__" in rendered:
        raise RuntimeError("unresolved template token remains")
    return rendered


def trace_stats(data: bytes) -> dict:
    n_track_records = 0
    tracked_frames = 0
    max_tracks = 0
    first_track_frame = None
    for raw in data.decode("utf-8", errors="strict").splitlines():
        fields = raw.split("\t")
        if fields and fields[0] == "S" and len(fields) >= 3:
            frame = int(fields[1])
            n = int(fields[2])
            max_tracks = max(max_tracks, n)
            if n > 0:
                tracked_frames += 1
                if first_track_frame is None:
                    first_track_frame = frame
        elif fields and fields[0] == "T":
            n_track_records += 1
    return {
        "n_track_records": n_track_records,
        "tracked_frames": tracked_frames,
        "max_tracks": max_tracks,
        "first_track_frame": first_track_frame,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Behavior Preservation Evidence v1.0 matrix runner")
    ap.add_argument("--binary", required=True, type=Path)
    ap.add_argument("--template", required=True, type=Path)
    ap.add_argument("--wrapper", required=True, type=Path)
    ap.add_argument("--frames", type=int, default=500)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()

    binary = args.binary.resolve()
    template_path = args.template.resolve()
    wrapper = args.wrapper.resolve()
    outdir = args.outdir.resolve()
    scenarios_dir = outdir / "scenarios"
    outdir.mkdir(parents=True, exist_ok=True)
    scenarios_dir.mkdir(parents=True, exist_ok=True)

    template = template_path.read_text(encoding="utf-8")

    levels = {
        "distance_m": [10000.0, 20000.0],
        "azimuth_deg": [0.0, 20.0],
        "rcs_m2": [1.0, 4.0],
        "motion": ["static", "closing"],
    }

    rows = []
    for distance_m, azimuth_deg, rcs_m2, motion in itertools.product(
        levels["distance_m"], levels["azimuth_deg"], levels["rcs_m2"], levels["motion"]
    ):
        case_id = f"d{int(distance_m/1000):02d}_a{int(azimuth_deg):02d}_r{int(rcs_m2):02d}_{motion}"
        case_dir = outdir / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        scenario = scenarios_dir / f"{case_id}.edl"
        scenario.write_text(render_case(template, distance_m, azimuth_deg, rcs_m2, motion), encoding="utf-8")

        baseline_path = case_dir / "baseline.tsv"
        baseline_stderr_path = case_dir / "baseline.stderr.txt"
        wrapped_path = case_dir / "wrapped.tsv"
        wrapper_evidence_path = case_dir / "wrapper_evidence.json"
        wrapper_driver_stderr_path = case_dir / "wrapper_driver.stderr.txt"

        status = "pass"
        errors = []
        baseline = b""
        wrapped = b""
        wrapper_evidence = {}

        direct = subprocess.run(
            [str(binary), "--config", str(scenario), "--frames", str(args.frames)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        baseline = direct.stdout
        baseline_path.write_bytes(baseline)
        baseline_stderr = direct.stderr.decode("utf-8", errors="replace")
        baseline_stderr_path.write_text(baseline_stderr, encoding="utf-8")

        if direct.returncode != 0:
            errors.append(f"baseline_returncode={direct.returncode}")
        if STATION_WARNING in baseline_stderr:
            errors.append("station_warning_in_baseline")

        stats = trace_stats(baseline) if baseline else {
            "n_track_records": 0,
            "tracked_frames": 0,
            "max_tracks": 0,
            "first_track_frame": None,
        }
        if stats["n_track_records"] <= 0:
            errors.append("no_native_track_records")

        wrapped_driver = subprocess.run(
            [
                sys.executable,
                str(wrapper),
                "--binary", str(binary),
                "--config", str(scenario),
                "--frames", str(args.frames),
                "--output", str(wrapped_path),
                "--evidence", str(wrapper_evidence_path),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        wrapper_driver_stderr_path.write_bytes(wrapped_driver.stderr)
        if wrapped_driver.returncode != 0:
            errors.append(f"wrapper_returncode={wrapped_driver.returncode}")

        if wrapped_path.exists():
            wrapped = wrapped_path.read_bytes()
        if wrapper_evidence_path.exists():
            wrapper_evidence = json.loads(wrapper_evidence_path.read_text(encoding="utf-8"))
            if wrapper_evidence.get("station_warning_present"):
                errors.append("station_warning_in_wrapped_process")
        else:
            errors.append("missing_wrapper_evidence")

        equivalent = baseline == wrapped and len(baseline) > 0
        if not equivalent:
            errors.append("baseline_wrapped_trace_mismatch")

        if errors:
            status = "fail"

        rows.append({
            "case_id": case_id,
            "distance_m": distance_m,
            "azimuth_deg": azimuth_deg,
            "rcs_m2": rcs_m2,
            "motion": motion,
            "frames": args.frames,
            "status": status,
            "equivalent": equivalent,
            "D_byte": 0 if equivalent else 1,
            "baseline_sha256": sha256_bytes(baseline),
            "wrapped_sha256": sha256_bytes(wrapped),
            "scenario_sha256": sha256_bytes(scenario.read_bytes()),
            **stats,
            "baseline_station_warning": STATION_WARNING in baseline_stderr,
            "wrapped_station_warning": bool(wrapper_evidence.get("station_warning_present", False)),
            "errors": errors,
        })

    all_pass = all(row["status"] == "pass" for row in rows)
    distinct_baseline_traces = len({row["baseline_sha256"] for row in rows})
    summary = {
        "evidence_profile": "Behavior Preservation Evidence v1.0",
        "criterion": "byte-identical complete native TrackManager trace within each matched baseline/TMSU case",
        "observational_domain": [
            "track_count",
            "track_id",
            "range",
            "range_rate",
            "relative_azimuth",
            "elevation",
            "quality",
            "average_signal",
        ],
        "matrix_design": "2x2x2x2 full factorial",
        "levels": levels,
        "case_count": len(rows),
        "passed_cases": sum(row["status"] == "pass" for row in rows),
        "all_pass": all_pass,
        "all_D_byte_zero": all(row["D_byte"] == 0 for row in rows),
        "all_cases_have_tracks": all(row["n_track_records"] > 0 for row in rows),
        "station_warning_eliminated": all(
            not row["baseline_station_warning"] and not row["wrapped_station_warning"] for row in rows
        ),
        "distinct_baseline_traces": distinct_baseline_traces,
        "cases": rows,
    }

    (outdir / "behavior_preservation_v1.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    fieldnames = [
        "case_id", "distance_m", "azimuth_deg", "rcs_m2", "motion", "frames",
        "status", "equivalent", "D_byte", "n_track_records", "tracked_frames",
        "max_tracks", "first_track_frame", "baseline_station_warning",
        "wrapped_station_warning", "baseline_sha256", "wrapped_sha256", "scenario_sha256",
    ]
    with (outdir / "behavior_preservation_v1.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row[k] for k in fieldnames})

    print(json.dumps({
        "all_pass": all_pass,
        "case_count": len(rows),
        "passed_cases": summary["passed_cases"],
        "all_D_byte_zero": summary["all_D_byte_zero"],
        "all_cases_have_tracks": summary["all_cases_have_tracks"],
        "station_warning_eliminated": summary["station_warning_eliminated"],
        "distinct_baseline_traces": distinct_baseline_traces,
    }, sort_keys=True))

    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
