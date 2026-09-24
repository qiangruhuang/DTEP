#!/usr/bin/env python3
import hashlib, json, sqlite3, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'
errs=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()
def type_id(api):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone(); return r['id'] if r else None
def entry(api,pk):
    tid=type_id(api)
    if not tid: return None
    r=con.execute('select title,dataJson from ObjectEntry where objectTypeId=? and pk=?',(tid,pk)).fetchone()
    return {'pk':pk,'title':r['title'],'data':json.loads(r['dataJson'] or '{}')} if r else None
def entries(api):
    tid=type_id(api)
    if not tid: return []
    return [{'pk':r['pk'],'title':r['title'],'data':json.loads(r['dataJson'] or '{}')} for r in con.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=?',(tid,))]

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
case=entry('DigitalTestCase','CASE-01')
if not case or case['data'].get('status')!='证据闭环中': errs.append('delivery DB must remain V0.3 / evidence-closure initial state')
if entry('EvidencePackage','EP-CASE01-M13-V0.4') is not None: errs.append('V0.4 must not pre-exist in delivery DB')
active=entry('EvidencePackage','EP-CASE01-M13-V0.3')
if not active: errs.append('active V0.3 Evidence Package missing')
rule=entry('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
if not rule: errs.append('STRICT-V1 missing')
else:
    published={k:rule['data'].get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}
    if rule['data'].get('publishedHash')!=sha(published): errs.append('STRICT-V1 published hash mismatch')

# Independent V0.3 strict-gate expectation used by the audit view.
hard=[]
if active:
    p=active['data']; runmap={x['pk']:x for x in entries('TestRun')}; modelmap={x['pk']:x for x in entries('ModelAsset')}
    required=p.get('requiredRunRefs') or p.get('runRefs') or []
    req=[runmap.get(x) for x in required]
    accepted={'正式证据','条件使用'}
    if any(r is None or r['data'].get('formalEvidenceClass') not in accepted for r in req): hard.append('formalEvidenceEligibility')
    if not str(p.get('status','')).startswith('已冻结') or not p.get('manifest') or not p.get('packageHash'): hard.append('packageIntegrity')
    mids=p.get('modelRefs') or []
    checks=[]
    for r in req:
        if r: checks += [c for c in r['data'].get('modelDomainChecks',[]) if c.get('model') in mids]
    if any(not any(c.get('model')==mid for c in checks) for mid in mids) or any(c.get('inDomain') is False for c in checks): hard.append('modelValidationDomain')
    if any(modelmap.get(mid,{}).get('data',{}).get('accreditation') not in {'已认可','有条件认可'} for mid in mids): hard.append('modelAccreditation')
    anchors=[runmap.get(x) for x in p.get('liveAnchorRefs',[])]
    usable=[r for r in anchors if r and r['data'].get('executionMode') in {'Live','LVC'} and r['data'].get('status') in {'已完成','数据分析中','预演完成'}]
    if len(usable)<1: hard.append('liveAnchor')
if len(hard)!=5: errs.append(f'V0.3 expected 5 hard failures, got {hard}')

# Source-level Decision Provenance contracts.
files={
    'service': ROOT/'src/lib/decision-provenance.ts',
    'api': ROOT/'src/app/api/decision-provenance/route.ts',
    'ui': ROOT/'src/components/platform/decision-provenance.tsx',
    'platform': ROOT/'src/lib/platform.ts',
    'page': ROOT/'src/app/page.tsx',
    'case': ROOT/'src/components/platform/digital-case.tsx',
}
for name,path in files.items():
    if not path.exists(): errs.append(f'missing {name}: {path}')
texts={name:path.read_text(encoding='utf-8') if path.exists() else '' for name,path in files.items()}
for token in ['frozen-manifest','live-draft','runSnapshots','modelSnapshots','datasetSnapshots','ruleSetSnapshot','lastGateEvaluation','stepRefs','businessChain','packageHashValid']:
    if token not in texts['service']: errs.append(f'provenance service token missing: {token}')
for token in ['鉴定审计视图 / Decision Provenance','反向决策证据图','四链汇合 · 8 步鉴定治理矩阵','完整性锚点','关联治理步骤','读取冻结 Manifest']:
    if token not in texts['ui']: errs.append(f'provenance UI token missing: {token}')
if "decisionProvenance" not in texts['platform'] or '鉴定审计 / Decision Provenance' not in texts['platform']: errs.append('Decision Provenance module registration missing')
if 'DecisionProvenanceModule' not in texts['page']: errs.append('Decision Provenance page wiring missing')
if "onNavigate('decisionProvenance')" not in texts['case']: errs.append('CASE-01 audit-view entry point missing')
if "getDecisionProvenance" not in texts['api']: errs.append('Decision Provenance API wiring missing')

print('SQLite integrity_check:',integrity)
print('Delivery decision root: V0.3 / BLOCKED')
print('Active Evidence Package: EP-CASE01-M13-V0.3')
print('STRICT-V1 hash:', 'OK' if rule and rule['data'].get('publishedHash')==sha({k:rule['data'].get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}) else 'FAIL')
print('V0.3 expected hard failures:',len(hard),hard)
print('Decision Provenance API/UI:', 'OK' if not [e for e in errs if 'provenance' in e.lower() or 'Decision' in e] else 'FAIL')
print('Frozen-manifest historical semantics:', 'OK' if all(x in texts['service'] for x in ['runSnapshots','modelSnapshots','datasetSnapshots','ruleSetSnapshot']) else 'FAIL')
print('Evidence-to-governance cross links:', 'OK' if 'stepRefs' in texts['service'] and '关联治理步骤' in texts['ui'] else 'FAIL')
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
