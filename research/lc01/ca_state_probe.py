#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def shape(x):
    return list(getattr(x, "shape", ()))


def main() -> int:
    ap = argparse.ArgumentParser(description="Diagnose RadarSimPublic CA filter state/matrix dimensions without patching upstream source")
    ap.add_argument("--upstream-root", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    upstream_root = args.upstream_root.resolve()
    sys.path.insert(0, str(upstream_root))
    import numpy as np
    from src.tracking.kalman_filters import initialize_constant_acceleration_filter  # type: ignore
    from src.tracking.tracker_base import Track, Measurement  # type: ignore

    dt = 0.02
    z0 = np.array([20000.0, 0.0], dtype=float)
    v0 = np.array([-150.0, 0.0], dtype=float)
    kf = initialize_constant_acceleration_filter(
        dim=2, dt=dt, process_noise_std=1.0, measurement_noise_std=0.075
    )

    records = []
    def snap(label: str):
        records.append({
            "label": label,
            "x": shape(kf.x),
            "P": shape(kf.P),
            "F": shape(kf.F),
            "H": shape(kf.H),
            "Q": shape(kf.Q),
            "R": shape(kf.R),
        })

    snap("initialized")
    kf.x = np.array([20000.0, 0.0, -150.0, 0.0, 0.0, 0.0], dtype=float)
    snap("after_state_assignment")

    track = Track(track_id="probe", initial_state=kf.x.copy(), initial_covariance=kf.P.copy())
    snap("after_track_construct")

    kf.update(z0)
    snap("after_first_update")

    meas = Measurement(
        position=z0.copy(), velocity=v0.copy(), timestamp=0.0,
        covariance=np.eye(2) * 0.075**2, snr=20.0,
        range_rate=-150.0, azimuth=0.0, elevation=0.0,
    )
    track.update_state(kf.x.copy(), kf.P.copy(), measurement=meas, timestamp=0.0)
    track.update_quality_metrics(float(kf.log_likelihood), kf.y.copy())
    snap("after_track_update")

    predict_error = None
    try:
        kf.predict(dt)
        snap("after_first_predict")
    except Exception as exc:
        predict_error = f"{type(exc).__name__}: {exc}"
        snap("predict_failed")

    expected = {
        "x": [6], "P": [6, 6], "F": [6, 6], "H": [2, 6], "Q": [6, 6], "R": [2, 2]
    }
    initialized = records[0]
    initialized_consistent = all(initialized[k] == v for k, v in expected.items())
    after_update = next(r for r in records if r["label"] == "after_first_update")
    update_preserved = all(after_update[k] == v for k, v in expected.items())

    result = {
        "probe": "LC01-CA-STATE-SHAPE",
        "upstream_commit_expected": "8b63f824a5744c1b3a3fca5e948fa7c59f897b17",
        "expected_dimensions": expected,
        "records": records,
        "initialized_consistent": initialized_consistent,
        "first_update_preserved_dimensions": update_preserved,
        "first_predict_succeeded": predict_error is None,
        "predict_error": predict_error,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    return 0 if initialized_consistent and update_preserved and predict_error is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
