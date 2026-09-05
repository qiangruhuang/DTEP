#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description="Transparent external-process TMSU wrapper for the frozen OpenEaagles probe")
    ap.add_argument("--binary", required=True, type=Path)
    ap.add_argument("--config", required=True, type=Path)
    ap.add_argument("--frames", required=True, type=int)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--evidence", required=True, type=Path)
    args = ap.parse_args()

    binary = args.binary.resolve()
    config = args.config.resolve()
    cmd = [str(binary), "--config", str(config), "--frames", str(args.frames)]

    completed = subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(completed.stdout)

    stderr_text = completed.stderr.decode("utf-8", errors="replace")
    evidence = {
        "wrapper": "tmsu.external-process.transparent.v1",
        "command": cmd,
        "returncode": completed.returncode,
        "binary_sha256": sha256(binary),
        "scenario_sha256": sha256(config),
        "stdout_sha256": hashlib.sha256(completed.stdout).hexdigest(),
        "stderr_sha256": hashlib.sha256(completed.stderr).hexdigest(),
        "stderr_text": stderr_text,
        "station_warning_present": "unable to locate the Station class" in stderr_text,
        "frames": args.frames,
        "transformations_applied_to_stdout": 0,
    }
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if completed.returncode != 0:
        print(stderr_text)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
