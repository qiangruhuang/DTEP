#!/usr/bin/env python3
import json, sqlite3, sys
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

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
for api in ['TestEnvironmentAssembly','LVCFederationConfiguration']:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
# Delivery must remain at pre-G2 initial state; do not pre-create environment provenance.
if rows('TestEnvironmentAssembly'): errs.append('initial delivery must not pre-create TestEnvironmentAssembly before G2 handoff')
if rows('LVCFederationConfiguration'): errs.append('initial delivery must not pre-create LVCFederationConfiguration before G2 handoff')
for spk in ['SC-BASE','SC-COA-01']:
    s=one('TestScenario',spk)
    if not s: errs.append(f'missing {spk}')
    elif 'testEnvironmentAssemblyRef' in s: errs.append(f'{spk} must not pre-bind environment assembly before G2')

links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['modelAssemblyFeedsEnvironment','environmentUsesFederation','scenarioUsesEnvironment','runUsesEnvironment','runUsesFederation','federationUsesContract']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

resources={r['code'] for r in con.execute('select code from TestResource')}
for r in ['R-01','R-04','R-05','R-06','R-09']:
    if r not in resources: errs.append(f'missing required TestResource {r}')

lib=(ROOT/'src/lib/test-environment-assembly.ts').read_text(encoding='utf-8')
dp30=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')
case=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
audit=(ROOT/'src/lib/run-instance.ts').read_text(encoding='utf-8')
scenario=(ROOT/'src/components/platform/scenario-workspace.tsx').read_text(encoding='utf-8')
runui=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/decision-workspace/route.ts').read_text(encoding='utf-8')
for token in ['TestEnvironmentAssembly','LVCFederationConfiguration','HLA / IEEE 1516','DIS / IEEE 1278','TENA','DDS','IDL-CASE01-LVC-v1','TIME-MASTER-01','executionProfiles','bindRunToCurrentEnvironment','environmentProvenanceHash','frozen-at-run-creation','securityBoundary']:
    if token not in lib: errs.append(f'environment implementation missing {token}')
for token in ['createCase01InitialEnvironmentAssemblies','testEnvironmentAssemblies','clearCase01EnvironmentAssemblies']:
    if token not in dp30: errs.append(f'DP30 handoff/reset missing {token}')
for token in ['bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLiveData()))','bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLvcData()))','createCase01StressEnvironmentV2','bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runDigitalData()))']:
    if token not in case: errs.append(f'CASE-01 environment integration missing {token}')
for token in ['缺少 Test Environment Assembly','正式 LVC Run 缺少 LVC Federation Configuration','IDL Topic Set','logicalNetworkSnapshot','securityBoundarySnapshot','environmentProvenanceHash']:
    if token not in audit: errs.append(f'Run environment audit missing {token}')
for token in ['Test Environment Assembly · LVC Federation Configuration','EnvironmentCard','HLA/DIS/TENA/DDS','environmentHash']:
    if token not in scenario: errs.append(f'Scenario environment UI missing {token}')
for token in ['Test Environment Assembly','LVC Federation','环境资源快照','LVC Federation 网关','environmentProvenanceHash']:
    if token not in runui: errs.append(f'Run environment UI missing {token}')
for token in ["getEntries('TestEnvironmentAssembly')","getEntries('LVCFederationConfiguration')","db.testResource.findMany"]:
    if token not in api: errs.append(f'decision-workspace API missing {token}')

# Preserve prior governance boundaries.
legacy=one('TestRun','RUN-DOT-B-01')
if legacy and 'testEnvironmentAssemblyRef' in legacy: errs.append('legacy RUN-DOT-B-01 must not be retroactively backfilled with environment provenance')
strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
print('SQLite integrity_check:',integrity)
print('Initial TestEnvironmentAssembly objects:',len(rows('TestEnvironmentAssembly')))
print('Initial LVCFederationConfiguration objects:',len(rows('LVCFederationConfiguration')))
print('Required resources:',sorted(resources.intersection({'R-01','R-04','R-05','R-06','R-09'})))
print('Gateway protocols shadow-check: HLA / DIS / TENA / DDS')
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
