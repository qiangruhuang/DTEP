#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description="Create a deliberately non-equivalent trace for comparator sensitivity testing")
    ap.add_argument("source", type=Path)
    ap.add_argument("target", type=Path)
    args = ap.parse_args()

    lines = args.source.read_text(encoding="utf-8").splitlines()
    changed = False
    for i, line in enumerate(lines):
        if line.startswith("T\t"):
            fields = line.split("\t")
            if len(fields) >= 4:
                fields[3] = str(float(fields[3]) + 1.0)
                lines[i] = "\t".join(fields)
                changed = True
                break
    if not changed:
        for i, line in enumerate(lines):
            if line.startswith("S\t"):
                fields = line.split("\t")
                if len(fields) >= 3:
                    fields[2] = str(int(fields[2]) + 1)
                    lines[i] = "\t".join(fields)
                    changed = True
                    break
    if not changed:
        raise RuntimeError("No mutable behavior record found")

    args.target.parent.mkdir(parents=True, exist_ok=True)
    args.target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
