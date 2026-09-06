#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import sys
from pathlib import Path

IMPLEMENTATION_ID = "radarsimpublic.radar-kf@8b63f82"
UPSTREAM_COMMIT = "8b63f824a5744c1b3a3fca5e948fa7c59f897b17"

def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_trace(path: Path, trial: dict) -> dict:
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
    if meta[3] != trial["capability_id"] or meta[4] != IMPLEMENTATION_ID:
        raise RuntimeError("identity in META does not match bespoke integration")

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

def run_radarsimpublic_direct(trial: dict, case: dict, upstream_root: Path, trace_path: Path) -> None:
    """Direct point-to-point integration of one concrete implementation into upper trial code."""
    if str(upstream_root) not in sys.path:
        sys.path.insert(0, str(upstream_root))
    from src.radar import Radar, RadarParameters  # type: ignore
    from src.tracking.kalman_filters import initialize_constant_velocity_filter  # type: ignore
    from src.tracking.tracker_base import Measurement, Track  # type: ignore
    import numpy as np

    dt = float(trial["execution"]["dt_s"])
    frames = int(trial["execution"]["frames"])
    params = RadarParameters(
        frequency=3.0e9,
        power=500.0e3,
        antenna_gain=42.0,
        pulse_width=0.01e-3,
        prf=500.0,
        bandwidth=2.0e9,
        noise_figure=3.0,
        losses=3.0,
    )
    radar = Radar(params)
    az = math.radians(float(case["azimuth_deg"]))
    r0 = float(case["distance_m"])
    rcs = float(case["rcs_m2"])
    closing = float(case["closing_speed_mps"]) if case["motion"] == "closing" else 0.0
    radial = np.array([math.cos(az), math.sin(az)], dtype=float)
    initial_position = radial * r0
    true_velocity = -radial * closing
    measurement_std = max(float(params.range_resolution), 1e-6)
    kf = initialize_constant_velocity_filter(
        dim=2, dt=dt, process_noise_std=1.0, measurement_noise_std=measurement_std
    )
    kf.x[:] = np.array(
        [initial_position[0], initial_position[1], true_velocity[0], true_velocity[1]], dtype=float
    )
    track = Track(track_id="1", initial_state=kf.x.copy(), initial_covariance=kf.P.copy())

    lines = [f"META\t{dt:.17g}\t{frames}\t{trial['capability_id']}\t{IMPLEMENTATION_ID}"]
    for frame in range(frames):
        t = frame * dt
        true_position = initial_position + true_velocity * t
        true_range = float(np.linalg.norm(true_position))
        snr_db = float(radar.snr(true_range, rcs))
        detected = math.isfinite(snr_db) and snr_db >= 0.0
        if frame > 0:
            kf.predict(dt)
        if detected:
            z = true_position.copy()
            kf.update(z)
            meas = Measurement(
                position=z,
                velocity=true_velocity.copy(),
                timestamp=t,
                covariance=np.eye(2) * measurement_std**2,
                snr=snr_db,
                range_rate=-closing,
                azimuth=az,
                elevation=0.0,
            )
            track.update_state(kf.x.copy(), kf.P.copy(), measurement=meas, timestamp=t)
            track.update_quality_metrics(float(kf.log_likelihood), kf.y.copy())

        confirmed = detected and track.is_confirmed()
        if not confirmed:
            lines.append(f"S\t{frame}\t0")
            continue

        pos = np.asarray(kf.x[:2], dtype=float)
        vel = np.asarray(kf.x[2:4], dtype=float)
        range_m = float(np.linalg.norm(pos))
        if range_m > 0.0:
            range_rate = float(np.dot(pos, vel) / range_m)
            rel_az = float(math.atan2(pos[1], pos[0]))
        else:
            range_rate = 0.0
            rel_az = 0.0
        quality = min(1.0, max(0.0, float(track.track_score)))
        lines.append(f"S\t{frame}\t1")
        lines.append(
            "T\t{}\t1\t{:.17g}\t{:.17g}\t{:.17g}\t0\t{:.17g}\t{:.17g}".format(
                frame, range_m, range_rate, rel_az, quality, snr_db
            )
        )
    trace_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

def main() -> int:
    ap = argparse.ArgumentParser(description="Bespoke point-to-point E2 trial orchestrator")
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--contract", required=True, type=Path)
    ap.add_argument("--upstream-root", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()

    trial_path = args.trial.resolve()
    contract_path = args.contract.resolve()
    upstream_root = args.upstream_root.resolve()
    outdir = args.outdir.resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    trial = json.loads(trial_path.read_text(encoding="utf-8"))
    contract = json.loads(contract_path.read_text(encoding="utf-8"))

    if contract["capability_id"] != trial["capability_id"] or contract["contract_id"] != trial["contract_id"]:
        raise RuntimeError("contract identity does not match trial")
    if contract["semantic_profile_id"] != trial["semantic_profile_id"]:
        raise RuntimeError("contract semantic profile does not match trial")
    if not upstream_root.exists():
        raise RuntimeError("RadarSimPublic upstream checkout missing")

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
        case_path.write_text(json.dumps(case, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        errors = []
        stats = {}
        try:
            run_radarsimpublic_direct(trial, case, upstream_root, trace_path)
            stats = validate_trace(trace_path, trial)
        except Exception as exc:
            errors.append(str(exc))

        rows.append({
            "case_id": case["case_id"],
            "status": "pass" if not errors else "fail",
            "trace_sha256": sha256_file(trace_path) if trace_path.exists() else None,
            "case_sha256": sha256_file(case_path),
            **stats,
            "errors": errors,
        })

    summary = {
        "experiment": "RQ5 paired engineering-burden benchmark — bespoke arm",
        "trial_id": trial["trial_id"],
        "capability_id": trial["capability_id"],
        "contract_id": trial["contract_id"],
        "semantic_profile_id": trial["semantic_profile_id"],
        "implementation_id": IMPLEMENTATION_ID,
        "upstream_commit": UPSTREAM_COMMIT,
        "integration_style": "direct model-specific imports/configuration/mapping in upper trial orchestrator",
        "trial_spec_sha256": sha256_file(trial_path),
        "orchestrator_sha256": sha256_file(Path(__file__).resolve()),
        "contract_sha256": sha256_file(contract_path),
        "case_count": len(rows),
        "passed_cases": sum(r["status"] == "pass" for r in rows),
        "all_cases_pass": all(r["status"] == "pass" for r in rows),
        "all_outputs_contract_valid": all(r.get("contract_valid") is True for r in rows),
        "cases": rows,
    }
    (outdir / "run_summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "implementation_id": summary["implementation_id"],
        "case_count": summary["case_count"],
        "passed_cases": summary["passed_cases"],
        "all_cases_pass": summary["all_cases_pass"],
        "all_outputs_contract_valid": summary["all_outputs_contract_valid"],
    }, sort_keys=True))
    return 0 if summary["all_cases_pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
