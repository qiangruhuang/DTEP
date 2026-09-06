#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def first_difference(a: bytes, b: bytes):
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i, a[i], b[i]
    if len(a) != len(b):
        return n, a[n] if n < len(a) else None, b[n] if n < len(b) else None
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Exact comparator for frozen OpenEaagles native behavior traces")
    ap.add_argument("reference", type=Path)
    ap.add_argument("candidate", type=Path)
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()

    ref = args.reference.read_bytes()
    cand = args.candidate.read_bytes()
    diff = first_difference(ref, cand)
    equivalent = diff is None

    report = {
        "equivalent": equivalent,
        "criterion": "byte-identical native trace",
        "reference_sha256": digest(ref),
        "candidate_sha256": digest(cand),
        "reference_bytes": len(ref),
        "candidate_bytes": len(cand),
        "first_difference": None if diff is None else {"offset": diff[0], "reference_byte": diff[1], "candidate_byte": diff[2]},
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, sort_keys=True))
    return 0 if equivalent else 1


if __name__ == "__main__":
    raise SystemExit(main())
