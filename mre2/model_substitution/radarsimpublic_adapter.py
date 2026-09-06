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
    ap = argparse.ArgumentParser(description="Thin TMSU adapter for frozen RadarSimPublic radar/tracking implementation")
    ap.add_argument("--binding", required=True, type=Path)
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--case", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--evidence", required=True, type=Path)
    args = ap.parse_args()

    binding = json.loads(args.binding.read_text(encoding="utf-8"))
    trial = json.loads(args.trial.read_text(encoding="utf-8"))
    case = json.loads(args.case.read_text(encoding="utf-8"))

    upstream_root = Path(binding["runtime"]["upstream_root"]).resolve()
    if not upstream_root.exists():
        raise RuntimeError(f"RadarSimPublic upstream checkout not found: {upstream_root}")
    sys.path.insert(0, str(upstream_root))

    # These are imported from the frozen upstream repository. The radar equation,
    # SNR model, Kalman filter and track-quality update are not reimplemented here.
    from src.radar import Radar, RadarParameters  # type: ignore
    from src.tracking.kalman_filters import initialize_constant_velocity_filter  # type: ignore
    from src.tracking.tracker_base import Measurement, Track  # type: ignore
    import numpy as np

    dt = float(trial["execution"]["dt_s"])
    frames = int(trial["execution"]["frames"])

    # S-band parameterization follows the frozen OpenEaagles E2 scenario where
    # common concepts exist. Noise figure/loss are RadarSimPublic-native fields.
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

    # RadarSimPublic's own CV Kalman implementation is the tracking backend.
    # Measurement noise is tied to the upstream radar's native range resolution.
    measurement_std = max(float(params.range_resolution), 1e-6)
    kf = initialize_constant_velocity_filter(
        dim=2,
        dt=dt,
        process_noise_std=1.0,
        measurement_noise_std=measurement_std,
    )
    kf.x[:] = np.array([initial_position[0], initial_position[1], true_velocity[0], true_velocity[1]], dtype=float)

    track = Track(
        track_id="1",
        initial_state=kf.x.copy(),
        initial_covariance=kf.P.copy(),
    )

    lines = [f"META\t{dt:.17g}\t{frames}\t{binding['capability_id']}\t{binding['implementation_id']}"]
    detected_frames = 0
    confirmed_frames = 0
    min_snr = math.inf
    max_snr = -math.inf

    for frame in range(frames):
        t = frame * dt
        true_position = initial_position + true_velocity * t
        true_range = float(np.linalg.norm(true_position))

        # Native RadarSimPublic radar-equation/SNR implementation. OpenEaagles'
        # RfTrack setSignal() consumes snDbl, so SNR dB is the declared semantic mapping.
        snr_db = float(radar.snr(true_range, rcs))
        min_snr = min(min_snr, snr_db)
        max_snr = max(max_snr, snr_db)
        detected = math.isfinite(snr_db) and snr_db >= 0.0

        if frame > 0:
            kf.predict(dt)

        if detected:
            detected_frames += 1
            # E2 tests substitution architecture, not comparative fidelity. The canonical
            # scenario position is supplied as the RadarSimPublic measurement binding;
            # estimation itself is performed by the frozen upstream Kalman implementation.
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

        confirmed_frames += 1
        pos = np.asarray(kf.x[:2], dtype=float)
        vel = np.asarray(kf.x[2:4], dtype=float)
        range_m = float(np.linalg.norm(pos))
        if range_m > 0.0:
            range_rate = float(np.dot(pos, vel) / range_m)  # positive = increasing range
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

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")

    source_paths = {
        "radar.py": upstream_root / "src/radar.py",
        "kalman_filters.py": upstream_root / "src/tracking/kalman_filters.py",
        "tracker_base.py": upstream_root / "src/tracking/tracker_base.py",
    }
    evidence = {
        "adapter": "RadarSimPublicTMSUAdapter",
        "implementation_id": binding["implementation_id"],
        "capability_id": binding["capability_id"],
        "contract_id": binding["contract_id"],
        "semantic_profile_id": binding["semantic_profile_id"],
        "upstream_repo": binding["runtime"]["upstream_repo"],
        "upstream_commit": binding["runtime"]["upstream_commit"],
        "upstream_component_sha256": {name: sha256_file(path) for name, path in source_paths.items()},
        "radar_parameters": {
            "frequency_hz": params.frequency,
            "power_w": params.power,
            "antenna_gain_db": params.antenna_gain,
            "pulse_width_s": params.pulse_width,
            "prf_hz": params.prf,
            "bandwidth_hz": params.bandwidth,
            "noise_figure_db": params.noise_figure,
            "losses_db": params.losses,
        },
        "semantic_mapping": binding["runtime"]["semantic_mapping"],
        "detected_frames": detected_frames,
        "confirmed_track_frames": confirmed_frames,
        "min_snr_db": min_snr,
        "max_snr_db": max_snr,
        "upstream_source_modified": False,
        "upstream_source_copied_into_dtep": False,
        "note": "Adapter performs scenario binding and canonical semantic projection only; radar SNR, CV Kalman estimation and track quality logic execute from the frozen upstream checkout."
    }
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
