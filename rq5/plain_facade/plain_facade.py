#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

IMPLEMENTATION_ID = 'radarsimpublic.radar-kf@8b63f82'


def main() -> int:
    ap = argparse.ArgumentParser(description='Plain software facade for frozen RadarSimPublic; intentionally no TMSU governance metadata')
    ap.add_argument('--trial', required=True, type=Path)
    ap.add_argument('--case', required=True, type=Path)
    ap.add_argument('--upstream-root', required=True, type=Path)
    ap.add_argument('--output', required=True, type=Path)
    args = ap.parse_args()

    trial = json.loads(args.trial.read_text(encoding='utf-8'))
    case = json.loads(args.case.read_text(encoding='utf-8'))
    upstream_root = args.upstream_root.resolve()
    if not upstream_root.exists():
        raise RuntimeError(f'RadarSimPublic upstream checkout not found: {upstream_root}')
    sys.path.insert(0, str(upstream_root))

    from src.radar import Radar, RadarParameters  # type: ignore
    from src.tracking.kalman_filters import initialize_constant_velocity_filter  # type: ignore
    from src.tracking.tracker_base import Measurement, Track  # type: ignore
    import numpy as np

    dt = float(trial['execution']['dt_s'])
    frames = int(trial['execution']['frames'])
    params = RadarParameters(frequency=3.0e9, power=500.0e3, antenna_gain=42.0, pulse_width=0.01e-3, prf=500.0, bandwidth=2.0e9, noise_figure=3.0, losses=3.0)
    radar = Radar(params)
    az = math.radians(float(case['azimuth_deg']))
    r0 = float(case['distance_m'])
    rcs = float(case['rcs_m2'])
    closing = float(case['closing_speed_mps']) if case['motion'] == 'closing' else 0.0
    radial = np.array([math.cos(az), math.sin(az)], dtype=float)
    initial_position = radial * r0
    true_velocity = -radial * closing
    measurement_std = max(float(params.range_resolution), 1e-6)
    kf = initialize_constant_velocity_filter(dim=2, dt=dt, process_noise_std=1.0, measurement_noise_std=measurement_std)
    kf.x[:] = np.array([initial_position[0], initial_position[1], true_velocity[0], true_velocity[1]], dtype=float)
    track = Track(track_id='1', initial_state=kf.x.copy(), initial_covariance=kf.P.copy())

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
            meas = Measurement(position=z, velocity=true_velocity.copy(), timestamp=t, covariance=np.eye(2) * measurement_std**2, snr=snr_db, range_rate=-closing, azimuth=az, elevation=0.0)
            track.update_state(kf.x.copy(), kf.P.copy(), measurement=meas, timestamp=t)
            track.update_quality_metrics(float(kf.log_likelihood), kf.y.copy())
        if not (detected and track.is_confirmed()):
            lines.append(f'S\t{frame}\t0')
            continue
        pos = np.asarray(kf.x[:2], dtype=float)
        vel = np.asarray(kf.x[2:4], dtype=float)
        range_m = float(np.linalg.norm(pos))
        range_rate = float(np.dot(pos, vel) / range_m) if range_m > 0 else 0.0
        rel_az = float(math.atan2(pos[1], pos[0])) if range_m > 0 else 0.0
        quality = min(1.0, max(0.0, float(track.track_score)))
        lines.append(f'S\t{frame}\t1')
        lines.append('T\t{}\t1\t{:.17g}\t{:.17g}\t{:.17g}\t0\t{:.17g}\t{:.17g}'.format(frame, range_m, range_rate, rel_az, quality, snr_db))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
