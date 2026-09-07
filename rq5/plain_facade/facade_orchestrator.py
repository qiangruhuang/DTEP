#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import subprocess
import sys
from pathlib import Path

IMPLEMENTATION_ID = 'radarsimpublic.radar-kf@8b63f82'


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_case(distance_m: float, azimuth_deg: float, rcs_m2: float, motion: str, closing_speed_mps: float) -> dict:
    return {'case_id': f'd{int(distance_m/1000):02d}_a{int(azimuth_deg):02d}_r{int(rcs_m2):02d}_{motion}', 'distance_m': distance_m, 'azimuth_deg': azimuth_deg, 'rcs_m2': rcs_m2, 'motion': motion, 'closing_speed_mps': closing_speed_mps}


def validate_trace(path: Path, trial: dict) -> bool:
    lines = path.read_text(encoding='utf-8').splitlines()
    if not lines:
        return False
    meta = lines[0].split('\t')
    if len(meta) != 5 or meta[0] != 'META' or meta[3] != trial['capability_id'] or meta[4] != IMPLEMENTATION_ID:
        return False
    summaries = {}
    tracks = {}
    for line in lines[1:]:
        f = line.split('\t')
        if f[0] == 'S':
            summaries[int(f[1])] = int(f[2])
        elif f[0] == 'T':
            vals = [float(x) for x in f[3:9]]
            if not all(math.isfinite(x) for x in vals):
                return False
            tracks[int(f[1])] = tracks.get(int(f[1]), 0) + 1
        else:
            return False
    frames = int(trial['execution']['frames'])
    return set(summaries) == set(range(frames)) and all(summaries[i] == tracks.get(i, 0) for i in range(frames)) and sum(tracks.values()) > 0


def main() -> int:
    ap = argparse.ArgumentParser(description='Binding-neutral plain-facade E2 orchestrator; no semantic/evidence governance')
    ap.add_argument('--trial', required=True, type=Path)
    ap.add_argument('--facade', required=True, type=Path)
    ap.add_argument('--upstream-root', required=True, type=Path)
    ap.add_argument('--outdir', required=True, type=Path)
    args = ap.parse_args()
    trial = json.loads(args.trial.read_text(encoding='utf-8'))
    args.outdir.mkdir(parents=True, exist_ok=True)
    levels = trial['scenario_matrix']
    cases = [make_case(d, a, r, m, float(levels['closing_speed_mps'])) for d, a, r, m in itertools.product(levels['distance_m'], levels['azimuth_deg'], levels['rcs_m2'], levels['motion'])]
    rows = []
    for case in cases:
        case_dir = args.outdir / case['case_id']
        case_dir.mkdir(parents=True, exist_ok=True)
        case_path = case_dir / 'case.json'
        trace_path = case_dir / 'canonical.tsv'
        case_path.write_text(json.dumps(case, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        proc = subprocess.run([sys.executable, str(args.facade), '--trial', str(args.trial), '--case', str(case_path), '--upstream-root', str(args.upstream_root), '--output', str(trace_path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        valid = proc.returncode == 0 and trace_path.exists() and validate_trace(trace_path, trial)
        rows.append({'case_id': case['case_id'], 'status': 'pass' if valid else 'fail', 'trace_sha256': sha256_file(trace_path) if trace_path.exists() else None, 'returncode': proc.returncode, 'stderr': proc.stderr.decode(errors='replace')})
    summary = {'experiment': 'BL-01 plain facade arm', 'capability_id': trial['capability_id'], 'implementation_id': IMPLEMENTATION_ID, 'integration_style': 'generic plain software facade with no TMSU semantic/intended-use/evidence governance', 'case_count': len(rows), 'passed_cases': sum(r['status'] == 'pass' for r in rows), 'all_cases_pass': all(r['status'] == 'pass' for r in rows), 'cases': rows}
    (args.outdir / 'run_summary.json').write_text(json.dumps(summary, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({k: summary[k] for k in ['case_count','passed_cases','all_cases_pass']}, sort_keys=True))
    return 0 if summary['all_cases_pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
