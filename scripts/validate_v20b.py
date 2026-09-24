#!/usr/bin/env python3
import json, sqlite3, sys, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; errs=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def t(api): return con.execute('select id,objectCount from ObjectType where apiName=?',(api,)).fetchone()
def rows(api):
    tt=t(api)
    if not tt:return []
    out=[]
    for r in con.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=? order by pk',(tt['id'],)):
        try:d=json.loads(r['dataJson'] or '{}')
        except Exception as e: errs.append(f'{api}/{r["pk"]} invalid JSON {e}'); d={}
        out.append((r['pk'],r['title'],d))
    return out
def one(api,pk):
    for p,title,d in rows(api):
        if p==pk:return d
    return None

def sha(v):
    def canon(x):
        if isinstance(x,list): return '['+','.join(canon(i) for i in x)+']'
        if isinstance(x,dict): return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+canon(x[k]) for k in sorted(x))+'}'
        return json.dumps(x,ensure_ascii=False,separators=(',',':'))
    return 'sha256:'+hashlib.sha256(canon(v).encode()).hexdigest()

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
if not t('TestModelAssembly'): errs.append('missing TestModelAssembly ObjectType')
elif t('TestModelAssembly')['objectCount']!=len(rows('TestModelAssembly')): errs.append('TestModelAssembly objectCount mismatch')
if rows('TestModelAssembly'): errs.append('initial delivery must not pre-create TestModelAssembly before G2 handoff')

links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['baselineInstantiatesAssembly','assemblyUsesArtifact','assemblyUsesModel','assemblyUsesContract','scenarioUsesAssembly','runUsesAssembly','runUsesPrototypeBaseline']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

# Initial-state truthfulness: no retroactive provenance should be injected before the 3.0 intake is completed.
for spk in ['SC-BASE','SC-COA-01']:
    s=one('TestScenario',spk)
    if not s: errs.append(f'missing {spk}')
    elif 'testModelAssemblyRef' in s: errs.append(f'{spk} must not pre-bind assembly before G2')
legacy=one('TestRun','RUN-DOT-B-01')
if legacy and 'testModelAssemblyRef' in legacy: errs.append('legacy RUN-DOT-B-01 must not be retroactively backfilled')

# Source-level architecture contracts.
assembly=(ROOT/'src/lib/test-model-assembly.ts').read_text(encoding='utf-8')
dp30=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')
case=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
audit=(ROOT/'src/lib/run-instance.ts').read_text(encoding='utf-8')
scenario_ui=(ROOT/'src/components/platform/scenario-workspace.tsx').read_text(encoding='utf-8')
run_ui=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/decision-workspace/route.ts').read_text(encoding='utf-8')
for token in ['prototypeBaselineHash','modelBindings','sourceArtifactRef','interfaceContracts','assemblyHash','bindRunToCurrentAssembly','modelBindingSnapshots','modelProvenanceHash','frozen-at-run-creation']:
    if token not in assembly: errs.append(f'assembly implementation missing {token}')
for token in ['createCase01InitialAssemblies','testModelAssemblies']:
    if token not in dp30: errs.append(f'DP30 handoff missing {token}')
for token in ['bindRunToCurrentAssembly(runLiveData())','bindRunToCurrentAssembly(runLvcData())','createCase01StressAssemblyV2','bindRunToCurrentAssembly(runDigitalData())']:
    if token not in case: errs.append(f'CASE-01 runtime integration missing {token}')
for token in ['正式数字/LVC Run 未绑定 Test Model Assembly','缺少数字样机3.0基地 ModelBaseline 来源','modelBindingSnapshots','artifactProvenanceRefs','interfaceContractRefs']:
    if token not in audit: errs.append(f'Run audit missing {token}')
for token in ['Test Model Assembly · 场景模型装配与3.0来源','AssemblyCard','prototypeBaselineRef','sourceArtifactRef']:
    if token not in scenario_ui: errs.append(f'Scenario UI missing {token}')
for token in ['Test Model Assembly','3.0 ModelArtifact 来源','FMI / SAL / IDL 契约','modelProvenanceHash']:
    if token not in run_ui: errs.append(f'Run UI missing {token}')
for token in ["getEntries('TestModelAssembly')","getEntries('ModelBaseline')","getEntries('ModelArtifact')","getEntries('InterfaceContract')"]:
    if token not in api: errs.append(f'decision-workspace API missing {token}')

# Architecture invariant shadow-check using the actual initial Scenario/Model/Artifact data.
# This does not mutate the delivery DB; it verifies the intended assembly coverage.
models={pk:d for pk,_,d in rows('ModelAsset')}
arts={pk:d for pk,_,d in rows('ModelArtifact')}
contracts={pk:d for pk,_,d in rows('InterfaceContract')}
stress=one('TestScenario','SC-COA-01') or {}
stress_models=list(stress.get('models') or [])
if not any(str(x).startswith('MD-05@') for x in stress_models): stress_models.append('MD-05@'+str(models.get('MD-05',{}).get('version','current')))
expected_ids={str(x).split('@')[0] for x in stress_models}
if expected_ids != {'MD-01','MD-02','MD-05','MD-07','MD-08'}: errs.append(f'stress assembly coverage mismatch {expected_ids}')
# 3.0 promoted artifacts are intentionally only the SUT-origin models; external threat/comms remain library models.
if arts.get('ART-DP30-05',{}).get('promotedModelRef')!='MD-01': errs.append('ART-DP30-05 must promote to MD-01')
if arts.get('ART-DP30-09',{}).get('promotedModelRef')!='MD-08': errs.append('ART-DP30-09 must promote to MD-08')
kinds={d.get('kind') for d in contracts.values()}
if kinds!={'FMI','SAL','IDL'}: errs.append(f'contract kinds mismatch {kinds}')
contract_map={a:{d.get('kind') for d in contracts.values() if a in (d.get('artifactRefs') or [])} for a in ['ART-DP30-05','ART-DP30-09']}
if contract_map['ART-DP30-05']!={'FMI'}: errs.append(f'ART-DP30-05 contract mapping mismatch {contract_map["ART-DP30-05"]}')
if contract_map['ART-DP30-09']!={'SAL','IDL'}: errs.append(f'ART-DP30-09 contract mapping mismatch {contract_map["ART-DP30-09"]}')
digital_run_models={'MD-01','MD-02','MD-07','MD-08'}
if not digital_run_models.issubset(expected_ids): errs.append('formal digital Run model set is not covered by stress TestModelAssembly')

strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
print('SQLite integrity_check:',integrity)
print('Initial TestModelAssembly objects:',len(rows('TestModelAssembly')))
print('Initial Scenario assembly refs:',[(x,one('TestScenario',x).get('testModelAssemblyRef') if one('TestScenario',x) else None) for x in ['SC-BASE','SC-COA-01']])
print('Stress assembly shadow model set:',sorted(expected_ids))
print('Direct DP3.0 mappings: ART-DP30-05->MD-01, ART-DP30-09->MD-08')
print('Interface contracts:',sorted(kinds), 'artifact map:', {k:sorted(v) for k,v in contract_map.items()})
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
