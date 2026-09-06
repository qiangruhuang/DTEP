#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RADAR_COMMIT="8b63f824a5744c1b3a3fca5e948fa7c59f897b17"
mkdir -p upstream build

if [[ ! -d upstream/RadarSimPublic/.git ]]; then
  git clone https://github.com/Murmur-ops/RadarSimPublic.git upstream/RadarSimPublic
fi
git -C upstream/RadarSimPublic fetch --all --tags
git -C upstream/RadarSimPublic checkout --detach "$RADAR_COMMIT"
test "$(git -C upstream/RadarSimPublic rev-parse HEAD)" = "$RADAR_COMMIT"

python3 - <<'PY'
try:
    import numpy
except Exception as exc:
    raise SystemExit('numpy is required; activate the reproduction venv and run: python -m pip install numpy') from exc
PY

mkdir -p build/sp01 build/eq01 build/rq5 build/ea01 build/vu01 build/lc01

run_sp01() {
  echo '=== SP-01 ==='
  rm -rf build/sp01
  python3 sp01/semantic_precheck/semantic_precheck.py --out build/sp01
  python3 - <<'PY'
import json
r=json.load(open('build/sp01/sp01_evidence.json'))
assert r['decision']=='PASS'
assert r['ablation']['injected_mismatch_correctly_rejected']==5
assert r['pass_conditions']['real_rf_ambiguity_returns_unknown'] is True
print('SP-01 PASS')
PY
}

run_eq01() {
  echo '=== EQ-01 ==='
  rm -rf build/eq01
  python3 mre3/evidence_qualification/eq01.py --root . --out build/eq01
  python3 - <<'PY'
import json
r=json.load(open('build/eq01/eq01_results.json'))
assert r['decision']=='PASS'
q={x['case_id']:x['decision'] for x in r['qualification_results']}
assert q['U1_architectural_tracking_within_evidence']=='QUALIFIED_WITHIN_EVIDENCE'
assert q['U2_rf_performance_decision']=='UNKNOWN'
assert q['U3_tracking_outside_executed_domain']=='UNKNOWN'
assert q['U4_known_semantic_conflict']=='NOT_QUALIFIED'
print('EQ-01 PASS')
PY
}

run_eb01() {
  echo '=== EB-01 ==='
  rm -rf build/rq5
  python3 mre2/model_substitution/orchestrator.py \
    --trial mre2/model_substitution/trial_spec.json \
    --binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
    --contract mre2/model_substitution/capability_contract.json \
    --outdir build/rq5/tmsu
  python3 rq5/engineering_burden/bespoke_orchestrator.py \
    --trial mre2/model_substitution/trial_spec.json \
    --contract mre2/model_substitution/capability_contract.json \
    --upstream-root upstream/RadarSimPublic \
    --outdir build/rq5/bespoke
  python3 rq5/engineering_burden/measure_burden.py \
    --tmsu-run build/rq5/tmsu \
    --bespoke-run build/rq5/bespoke \
    --generic-orchestrator mre2/model_substitution/orchestrator.py \
    --bespoke-orchestrator rq5/engineering_burden/bespoke_orchestrator.py \
    --adapter mre2/model_substitution/radarsimpublic_adapter.py \
    --binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
    --outdir build/rq5/evidence
  python3 - <<'PY'
import json
r=json.load(open('build/rq5/evidence/engineering_burden_result.json'))
assert r['decision']=='PASS'
assert r['functional_equivalence']['byte_identical_output_cases']==16
assert r['h1_time_claim']=='NOT_DIRECTLY_TESTED'
print('EB-01 PASS')
PY
}

run_ea01() {
  echo '=== EA-01 ==='
  rm -rf build/ea01
  python3 research/ea01/ea01_evidence_accumulation.py \
    --ledger research/ea01/evidence_ledger.json \
    --changes research/ea01/change_events.json \
    --outdir build/ea01
  python3 - <<'PY'
import json
r=json.load(open('build/ea01/ea01_summary.json'))
assert r['decision']=='PASS'
assert r['frozen_evidence_records']==5
assert r['historical_retention_fraction']==1.0
assert r['real_unknown_preserved'] is True
print('EA-01 PASS')
PY
}

run_vu01() {
  echo '=== VU-01b ==='
  rm -rf build/vu01
  python3 mre2/model_substitution/orchestrator.py \
    --trial mre2/model_substitution/trial_spec.json \
    --binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
    --contract mre2/model_substitution/capability_contract.json \
    --outdir build/vu01/run_v2
  python3 research/vu01/vu01_delta_requalification.py \
    --baseline-hashes research/vu01/ms01_v2_radarsimpublic_trace_hashes.json \
    --old-binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
    --new-binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
    --trial mre2/model_substitution/trial_spec.json \
    --orchestrator mre2/model_substitution/orchestrator.py \
    --contract mre2/model_substitution/capability_contract.json \
    --new-run build/vu01/run_v2 \
    --out build/vu01/vu01_result.json
  python3 - <<'PY'
import json
r=json.load(open('build/vu01/vu01_result.json'))
assert r['decision']=='PASS'
assert r['trace_comparison']['numeric_9dp_equivalent_cases']==16
assert r['trace_comparison']['negative_control']['rejected'] is True
print('VU-01b PASS')
PY
}

run_lc01() {
  echo '=== LC-01 ==='
  rm -rf build/lc01
  mkdir -p build/lc01
  python3 research/lc01/ca_state_probe.py \
    --upstream-root upstream/RadarSimPublic \
    --out build/lc01/ca_state_probe.json
  python3 mre2/model_substitution/orchestrator.py \
    --trial mre2/model_substitution/trial_spec.json \
    --binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
    --contract mre2/model_substitution/capability_contract.json \
    --outdir build/lc01/cv
  python3 mre2/model_substitution/orchestrator.py \
    --trial mre2/model_substitution/trial_spec.json \
    --binding mre2/model_substitution/bindings/radarsimpublic_tws_ca.json \
    --contract mre2/model_substitution/capability_contract.json \
    --outdir build/lc01/ca
  python3 research/lc01/algorithm_discrimination_challenge.py \
    --upstream-root upstream/RadarSimPublic \
    --out build/lc01/algorithm_challenge.json
  python3 research/lc01/lc01_carry_forward_boundary.py \
    --old-binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
    --new-binding mre2/model_substitution/bindings/radarsimpublic_tws_ca.json \
    --trial mre2/model_substitution/trial_spec.json \
    --orchestrator mre2/model_substitution/orchestrator.py \
    --contract mre2/model_substitution/capability_contract.json \
    --old-run build/lc01/cv \
    --new-run build/lc01/ca \
    --challenge build/lc01/algorithm_challenge.json \
    --out build/lc01/lc01_result.json
  python3 - <<'PY'
import json
r=json.load(open('build/lc01/lc01_result.json'))
assert r['decision']=='PASS'
assert r['carry_forward']['automatic_carry_forward_allowed'] is False
assert r['current_evidence_state']['kinematic_intended_use_CA']=='UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE'
assert r['current_evidence_state']['RF_semantic_relation']=='UNKNOWN'
print('LC-01 PASS')
PY
}

case "${1:-all-python}" in
  sp01) run_sp01 ;;
  eq01) run_eq01 ;;
  eb01) run_eb01 ;;
  ea01) run_ea01 ;;
  vu01) run_vu01 ;;
  lc01) run_lc01 ;;
  all-python)
    run_sp01
    run_eq01
    run_eb01
    run_ea01
    run_vu01
    run_lc01
    ;;
  *)
    echo "Usage: $0 [all-python|sp01|eq01|eb01|ea01|vu01|lc01]" >&2
    exit 2
    ;;
esac
