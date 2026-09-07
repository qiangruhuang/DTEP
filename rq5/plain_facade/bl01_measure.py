#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def traces(run: Path) -> dict[str, Path]:
    return {p.parent.name: p for p in run.glob('*/canonical.tsv')}


def nonblank(path: Path) -> int:
    return sum(bool(x.strip()) for x in path.read_text(encoding='utf-8').splitlines())


def count_refs(path: Path) -> int:
    text = path.read_text(encoding='utf-8')
    tokens = ['RadarSimPublic', 'radarsimpublic', 'src.radar', 'initialize_constant_velocity_filter', 'RadarParameters', 'upstream/RadarSimPublic']
    return sum(text.count(t) for t in tokens)


def main() -> int:
    ap = argparse.ArgumentParser(description='BL-01 three-arm ablation: direct vs plain facade vs SAL/TMSU')
    ap.add_argument('--direct-run', required=True, type=Path)
    ap.add_argument('--facade-run', required=True, type=Path)
    ap.add_argument('--tmsu-run', required=True, type=Path)
    ap.add_argument('--direct-core', required=True, type=Path)
    ap.add_argument('--facade-core', required=True, type=Path)
    ap.add_argument('--tmsu-core', required=True, type=Path)
    ap.add_argument('--facade-boundary', required=True, type=Path)
    ap.add_argument('--tmsu-adapter', required=True, type=Path)
    ap.add_argument('--tmsu-binding', required=True, type=Path)
    ap.add_argument('--outdir', required=True, type=Path)
    args = ap.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    maps = {k: traces(v) for k,v in {'direct':args.direct_run,'facade':args.facade_run,'tmsu':args.tmsu_run}.items()}
    common = sorted(set(maps['direct']) & set(maps['facade']) & set(maps['tmsu']))
    rows = []
    for cid in common:
        h = {arm: sha256_file(maps[arm][cid]) for arm in maps}
        rows.append({'case_id': cid, **{f'{arm}_sha256': val for arm,val in h.items()}, 'all_three_byte_identical': len(set(h.values())) == 1})

    software = {
        'direct': {'upper_core_direct_model_refs': count_refs(args.direct_core), 'boundary_nonblank_lines': 0},
        'plain_facade': {'upper_core_direct_model_refs': count_refs(args.facade_core), 'boundary_nonblank_lines': nonblank(args.facade_boundary)},
        'sal_tmsu': {'upper_core_direct_model_refs': count_refs(args.tmsu_core), 'boundary_nonblank_lines': nonblank(args.tmsu_adapter) + nonblank(args.tmsu_binding)},
    }
    governance = {
        'direct': {'semantic_profile': False, 'unknown_state': False, 'intended_use_gate': False, 'typed_evidence_dependencies': False, 'lifecycle_rule': False},
        'plain_facade': {'semantic_profile': False, 'unknown_state': False, 'intended_use_gate': False, 'typed_evidence_dependencies': False, 'lifecycle_rule': False},
        'sal_tmsu': {'semantic_profile': True, 'unknown_state': True, 'intended_use_gate': True, 'typed_evidence_dependencies': True, 'lifecycle_rule': True},
    }
    result = {
        'experiment': 'BL-01 three-arm abstraction/governance ablation',
        'functional_equivalence': {'matched_cases': len(common), 'all_three_byte_identical_cases': sum(r['all_three_byte_identical'] for r in rows), 'all_three_byte_identical': len(common) == 16 and all(r['all_three_byte_identical'] for r in rows)},
        'software_localization': software,
        't_and_e_governance_features': governance,
        'interpretation': 'A competent plain facade matches SAL/TMSU on keeping concrete-model references out of the shared upper core in this controlled case. The incremental SAL/TMSU contribution tested here is the T&E governance attached to that boundary, not generic adapter isolation.',
        'limits': ['Boundary LOC is descriptive and not a cost metric.', 'The plain-facade arm is a deliberately competent software-engineering baseline, not an industry sample.', 'Governance-feature presence is a mechanism ablation, not an estimate of program-level economic benefit.'],
    }
    result['decision'] = 'PASS' if result['functional_equivalence']['all_three_byte_identical'] and software['plain_facade']['upper_core_direct_model_refs'] == 0 and software['sal_tmsu']['upper_core_direct_model_refs'] == 0 and software['direct']['upper_core_direct_model_refs'] > 0 else 'FAIL'
    (args.outdir / 'bl01_result.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    with (args.outdir / 'trace_equivalence.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ['case_id'])
        w.writeheader(); w.writerows(rows)
    print(json.dumps({'decision': result['decision'], 'matched_cases': len(common), 'byte_identical_cases': result['functional_equivalence']['all_three_byte_identical_cases'], 'direct_refs': software['direct']['upper_core_direct_model_refs'], 'facade_refs': software['plain_facade']['upper_core_direct_model_refs'], 'tmsu_refs': software['sal_tmsu']['upper_core_direct_model_refs']}, sort_keys=True))
    return 0 if result['decision'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
