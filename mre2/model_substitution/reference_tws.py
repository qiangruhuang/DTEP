#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="Independent deterministic reference TWS implementation")
    ap.add_argument("--binding", required=True, type=Path)
    ap.add_argument("--trial", required=True, type=Path)
    ap.add_argument("--case", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--evidence", required=True, type=Path)
    args = ap.parse_args()

    binding = json.loads(args.binding.read_text(encoding="utf-8"))
    trial = json.loads(args.trial.read_text(encoding="utf-8"))
    case = json.loads(args.case.read_text(encoding="utf-8"))

    dt = float(trial["execution"]["dt_s"])
    frames = int(trial["execution"]["frames"])
    first_track_frame = int(binding["runtime"]["first_track_frame"])
    initial_range = float(case["distance_m"])
    azimuth_rad = math.radians(float(case["azimuth_deg"]))
    rcs_m2 = float(case["rcs_m2"])
    closing_speed = float(case.get("closing_speed_mps", 150.0)) if case["motion"] == "closing" else 0.0

    lines = [f"META\t{dt:.17g}\t{frames}\t{binding['capability_id']}\t{binding['implementation_id']}"]
    track_id = 9001
    track_records = 0

    for frame in range(frames):
        has_track = frame >= first_track_frame
        lines.append(f"S\t{frame}\t{1 if has_track else 0}")
        if not has_track:
            continue

        elapsed = (frame + 1) * dt
        range_m = max(0.0, initial_range - closing_speed * elapsed)
        range_rate_mps = -closing_speed
        average_signal_db = 20.0 + 10.0 * math.log10(rcs_m2) - 40.0 * math.log10(max(range_m, 1.0) / 10000.0)
        quality = max(0.0, min(1.0, 0.50 + average_signal_db / 40.0))
        elevation_rad = 0.0
        lines.append(
            "T\t{}\t{}\t{:.17g}\t{:.17g}\t{:.17g}\t{:.17g}\t{:.17g}\t{:.17g}".format(
                frame,
                track_id,
                range_m,
                range_rate_mps,
                azimuth_rad,
                elevation_rad,
                quality,
                average_signal_db,
            )
        )
        track_records += 1

    data = ("\n".join(lines) + "\n").encode("utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(data)

    evidence = {
        "adapter": "reference_tws.py",
        "capability_id": binding["capability_id"],
        "implementation_id": binding["implementation_id"],
        "case_id": case["case_id"],
        "canonical_trace_sha256": sha256_bytes(data),
        "track_records": track_records,
        "model_class": "deterministic analytic reference tracker",
        "validation_status": "research instrument only; not operationally accredited",
    }
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
