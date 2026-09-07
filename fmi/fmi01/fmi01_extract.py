#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import platform
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def local(tag: str) -> str:
    return tag.rsplit('}', 1)[-1]


def child(parent: ET.Element, name: str) -> ET.Element | None:
    for node in parent:
        if local(node.tag) == name:
            return node
    return None


def children(parent: ET.Element, name: str):
    return [node for node in parent if local(node.tag) == name]


def read_model_description(fmu: Path) -> tuple[ET.Element, str]:
    with zipfile.ZipFile(fmu) as zf:
        raw = zf.read('modelDescription.xml')
    return ET.fromstring(raw), hashlib.sha256(raw).hexdigest()


def parse_units(root: ET.Element) -> dict[str, dict]:
    out: dict[str, dict] = {}
    sec = child(root, 'UnitDefinitions')
    if sec is None:
        return out
    for u in children(sec, 'Unit'):
        out[u.attrib['name']] = dict(u.attrib)
    return out


def parse_types(root: ET.Element) -> dict[str, dict]:
    out: dict[str, dict] = {}
    sec = child(root, 'TypeDefinitions')
    if sec is None:
        return out
    for t in list(sec):
        d = dict(t.attrib)
        d['fmi_type'] = local(t.tag).removesuffix('Type')
        out[t.attrib['name']] = d
    return out


def parse_variables(root: ET.Element, types: dict[str, dict]) -> dict[str, dict]:
    sec = child(root, 'ModelVariables')
    if sec is None:
        return {}
    out = {}
    for v in list(sec):
        d = dict(v.attrib)
        d['fmi_type'] = local(v.tag)
        declared = d.get('declaredType')
        if declared and declared in types:
            t = types[declared]
            d.setdefault('unit', t.get('unit'))
            d.setdefault('quantity', t.get('quantity'))
        out[d['name']] = d
    return out


def parse_csv(path: Path) -> dict:
    with path.open(newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise RuntimeError('empty fmusim output')
    required = {'time', 'h', 'v'}
    if not required.issubset(rows[0]):
        raise RuntimeError(f'missing required output columns: {required - set(rows[0])}')
    vals = {k: [float(r[k]) for r in rows] for k in required}
    if not all(math.isfinite(x) for arr in vals.values() for x in arr):
        raise RuntimeError('non-finite fmusim output')
    return {
        'rows': len(rows),
        'time_start': vals['time'][0],
        'time_end': vals['time'][-1],
        'height_min_m': min(vals['h']),
        'height_max_m': max(vals['h']),
        'velocity_min_mps': min(vals['v']),
        'velocity_max_mps': max(vals['v']),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description='FMI-01: map FMI 3 metadata into a TMSU M3-native profile')
    ap.add_argument('--fmu', required=True, type=Path)
    ap.add_argument('--sidecar', required=True, type=Path)
    ap.add_argument('--simulation-csv', required=True, type=Path)
    ap.add_argument('--fmusim-version', required=True)
    ap.add_argument('--outdir', required=True, type=Path)
    args = ap.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)

    sidecar = json.loads(args.sidecar.read_text(encoding='utf-8'))
    root, model_description_sha = read_model_description(args.fmu)
    fmi_version = root.attrib.get('fmiVersion')
    model_name = root.attrib.get('modelName')
    instantiation_token = root.attrib.get('instantiationToken')
    cs = child(root, 'CoSimulation')
    if cs is None:
        raise RuntimeError('FMU does not expose FMI Co-Simulation')

    units = parse_units(root)
    types = parse_types(root)
    variables = parse_variables(root, types)

    mapped = {}
    errors = []
    for canonical, req in sidecar['canonical_variables'].items():
        src = req['fmi_variable']
        if src not in variables:
            errors.append(f'{canonical}: missing FMI variable {src}')
            continue
        v = variables[src]
        observed_type = v['fmi_type']
        observed_unit = v.get('unit')
        if observed_type != req['required_type']:
            errors.append(f'{canonical}: type {observed_type} != {req["required_type"]}')
        if observed_unit != req['required_unit']:
            errors.append(f'{canonical}: unit {observed_unit} != {req["required_unit"]}')
        mapped[canonical] = {
            'fmi_variable': src,
            'value_reference': v.get('valueReference'),
            'fmi_type': observed_type,
            'declared_type': v.get('declaredType'),
            'unit': observed_unit,
            'causality': v.get('causality'),
            'variability': v.get('variability'),
            'tmsu_only_semantics': {k: val for k, val in req.items() if k not in {'fmi_variable','required_type','required_unit'}},
        }

    sim_stats = parse_csv(args.simulation_csv)
    fmu_hash = sha256_file(args.fmu)
    sidecar_hash = sha256_file(args.sidecar)

    mapping = {
        'experiment': 'FMI-01 FMI 3.x TMSU onboarding',
        'claim_scope': 'transport/conformance mechanism demonstration; not model-fidelity validation',
        'capability_id': sidecar['capability_id'],
        'contract_id': sidecar['contract_id'],
        'semantic_profile_id': sidecar['semantic_profile_id'],
        'migration_path': sidecar['migration_path'],
        'fmi': {
            'version': fmi_version,
            'model_name': model_name,
            'instantiation_token': instantiation_token,
            'interface_type': 'CoSimulation',
            'model_identifier': cs.attrib.get('modelIdentifier'),
            'unit_definition_names': sorted(units),
            'type_definition_names': sorted(types),
            'model_variable_count': len(variables),
            'model_description_sha256': model_description_sha,
            'fmu_sha256': fmu_hash,
            'fmusim_version': args.fmusim_version,
        },
        'tmsu_mapping': mapped,
        'tmsu_increment_not_supplied_by_fmi': [
            'program-level Capability_ID',
            'domain concept identity and reference-frame/sign declarations',
            'intended-use boundary',
            'qualification/evidence state',
            'evidence dependencies and provenance policy'
        ],
        'simulation': sim_stats,
        'provenance': {
            'sidecar_sha256': sidecar_hash,
            'python': sys.version.split()[0],
            'platform': platform.platform(),
        },
        'errors': errors,
    }
    mapping['m3_native_criteria'] = {
        'approved_execution_profile': fmi_version is not None and fmi_version.startswith('3.') and cs is not None,
        'canonical_variables_resolved_from_machine_readable_fmi_metadata': len(mapped) == len(sidecar['canonical_variables']) and not errors,
        'no_model_specific_procedural_adapter': True,
        't_and_e_only_fields_supplied_by_sidecar': bool(sidecar.get('intended_use')) and bool(sidecar.get('capability_id')),
    }
    mapping['decision'] = 'PASS' if all(mapping['m3_native_criteria'].values()) and not errors else 'FAIL'

    (args.outdir / 'fmi_tmsu_mapping.json').write_text(json.dumps(mapping, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({'decision': mapping['decision'], 'fmi_version': fmi_version, 'model_name': model_name, 'mapped_variables': len(mapped), 'simulation_rows': sim_stats['rows']}, sort_keys=True))
    return 0 if mapping['decision'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
