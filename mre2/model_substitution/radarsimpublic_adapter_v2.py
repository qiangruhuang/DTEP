#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from radarsimpublic_adapter import main as adapter_v1_main


REVISION_ID = "radarsimpublic-adapter-v2-provenance-only"


def arg_value(flag: str) -> str | None:
    try:
        i = sys.argv.index(flag)
    except ValueError:
        return None
    return sys.argv[i + 1] if i + 1 < len(sys.argv) else None


def main() -> int:
    rc = adapter_v1_main()
    if rc != 0:
        return rc

    evidence_arg = arg_value("--evidence")
    if evidence_arg:
        p = Path(evidence_arg)
        evidence = json.loads(p.read_text(encoding="utf-8"))
        evidence["adapter_revision"] = REVISION_ID
        evidence["revision_scope"] = "provenance metadata only; canonical trace generation delegates unchanged to radarsimpublic_adapter.py"
        evidence["canonical_output_transform_added"] = False
        p.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
