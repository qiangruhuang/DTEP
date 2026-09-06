#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="LC-01 discriminating challenge for RadarSimPublic CV vs CA filters")
    ap.add_argument("--upstream-root", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    upstream_root = args.upstream_root.resolve()
    sys.path.insert(0, str(upstream_root))
    import numpy as np
    from src.radar import RadarParameters  # type: ignore
    from src.tracking.kalman_filters import (  # type: ignore
        initialize_constant_velocity_filter,
        initialize_constant_acceleration_filter,
    )

    dt = 0.02
    frames = 500
    az = math.radians(20.0)
    radial = np.array([math.cos(az), math.sin(az)], dtype=float)
    r0 = 20000.0
    closing0 = 150.0
    closing_accel = 15.0
    p0 = radial * r0
    v0 = -radial * closing0
    accel = -radial * closing_accel

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
    measurement_std = max(float(params.range_resolution), 1e-6)

    cv = initialize_constant_velocity_filter(
        dim=2, dt=dt, process_noise_std=1.0, measurement_noise_std=measurement_std
    )
    ca = initialize_constant_acceleration_filter(
        dim=2, dt=dt, process_noise_std=1.0, measurement_noise_std=measurement_std
    )
    cv.x[:] = np.array([p0[0], p0[1], v0[0], v0[1]], dtype=float)
    ca.x[:] = np.array([p0[0], p0[1], v0[0], v0[1], 0.0, 0.0], dtype=float)

    rows = []
    for frame in range(frames):
        t = frame * dt
        truth_p = p0 + v0 * t + 0.5 * accel * t * t
        truth_v = v0 + accel * t
        if frame > 0:
            cv.predict(dt)
            ca.predict(dt)
        cv.update(truth_p.copy())
        ca.update(truth_p.copy())

        def obs(x):
            p = np.asarray(x[:2], dtype=float)
            v = np.asarray(x[2:4], dtype=float)
            r = float(np.linalg.norm(p))
            rr = float(np.dot(p, v) / r) if r > 0 else 0.0
            return r, rr

        cv_r, cv_rr = obs(cv.x)
        ca_r, ca_rr = obs(ca.x)
        truth_r = float(np.linalg.norm(truth_p))
        truth_rr = float(np.dot(truth_p, truth_v) / truth_r)
        rows.append({
            "frame": frame,
            "t_s": t,
            "truth_range_m": truth_r,
            "truth_range_rate_mps": truth_rr,
            "cv_range_m": cv_r,
            "cv_range_rate_mps": cv_rr,
            "ca_range_m": ca_r,
            "ca_range_rate_mps": ca_rr,
        })

    warm = rows[10:]
    max_range_delta = max(abs(r["ca_range_m"] - r["cv_range_m"]) for r in warm)
    max_rr_delta = max(abs(r["ca_range_rate_mps"] - r["cv_range_rate_mps"]) for r in warm)

    def rmse(key: str, truth_key: str) -> float:
        return math.sqrt(sum((r[key] - r[truth_key]) ** 2 for r in warm) / len(warm))

    result = {
        "challenge_id": "LC01-MANEUVER-CHALLENGE-v1",
        "purpose": "discriminate constant-velocity and constant-acceleration tracking algorithms under a maneuver absent from the original E2 envelope",
        "upstream_commit_expected": "8b63f824a5744c1b3a3fca5e948fa7c59f897b17",
        "upstream_component_sha256": {
            "kalman_filters.py": sha256_file(upstream_root / "src/tracking/kalman_filters.py")
        },
        "scenario": {
            "dt_s": dt,
            "frames": frames,
            "initial_range_m": r0,
            "azimuth_deg": 20.0,
            "initial_closing_speed_mps": closing0,
            "closing_acceleration_mps2": closing_accel,
            "measurement_std_m": measurement_std,
        },
        "algorithm_a": "initialize_constant_velocity_filter",
        "algorithm_b": "initialize_constant_acceleration_filter",
        "comparison": {
            "max_abs_range_difference_m": max_range_delta,
            "max_abs_range_rate_difference_mps": max_rr_delta,
            "cv_range_rmse_m": rmse("cv_range_m", "truth_range_m"),
            "ca_range_rmse_m": rmse("ca_range_m", "truth_range_m"),
            "cv_range_rate_rmse_mps": rmse("cv_range_rate_mps", "truth_range_rate_mps"),
            "ca_range_rate_rmse_mps": rmse("ca_range_rate_mps", "truth_range_rate_mps"),
            "materially_discriminating": max_range_delta > 1e-3 or max_rr_delta > 1e-3,
        },
        "rows": rows,
        "inference_boundary": "This is a sensitivity/discrimination challenge, not evidence that either algorithm is operationally valid or generally superior."
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "materially_discriminating": result["comparison"]["materially_discriminating"],
        "max_abs_range_difference_m": max_range_delta,
        "max_abs_range_rate_difference_mps": max_rr_delta,
    }, sort_keys=True))
    return 0 if result["comparison"]["materially_discriminating"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
