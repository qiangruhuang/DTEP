#!/usr/bin/env python3
import hashlib, json, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'
con=sqlite3.connect(DB); cur=con.cursor()
errors=[]; lines=[]

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()
def tid(api):
    r=cur.execute('select id from ObjectType where apiName=?',(api,)).fetchone(); return r[0] if r else None
def entries(api):
    t=tid(api)
    if not t:return {}
    out={}
    for pk,title,d in cur.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=?',(t,)):
        try: out[pk]={'title':title,'data':json.loads(d or '{}')}
        except Exception as e: errors.append(f'{api}/{pk}: invalid JSON {e}')
    return out

all_types={r[0] for r in cur.execute('select apiName from ObjectType')}
for api,n in [('TestRun',5),('EvidencePackage',3),('EvidenceGateRuleSet',2)]:
    if api not in all_types: errors.append(f'missing type {api}')
    else:
        c=len(entries(api)); lines.append(f'{api}: {c}')
        if c<n: errors.append(f'{api}: expected >= {n}, got {c}')

# Validate every ontology entry JSON.
for api in all_types:
    entries(api)

runs=entries('TestRun'); pkgs=entries('EvidencePackage'); rulesets=entries('EvidenceGateRuleSet')
events=entries('TestEvent'); scenarios=entries('TestScenario'); models=entries('ModelAsset'); measures=entries('Measure')
datasets={r[0]:{'quality':r[1]} for r in cur.execute('select path,qualityScore from TestDataset')}

for pk,r in runs.items():
    d=r['data']
    if d.get('eventId') not in events: errors.append(f'{pk}: event {d.get("eventId")} missing')
    if d.get('scenarioId') not in scenarios: errors.append(f'{pk}: scenario {d.get("scenarioId")} missing')
    for snap in d.get('modelSnapshot',[]):
        mid=str(snap).split('@')[0]
        if mid not in models: errors.append(f'{pk}: model {mid} missing')
    for path in d.get('inputDatasetRefs',[])+d.get('outputDatasetRefs',[]):
        if path not in datasets: errors.append(f'{pk}: dataset {path} missing')

for pk,p in pkgs.items():
    d=p['data']
    for x in d.get('runRefs',[]):
        if x not in runs: errors.append(f'{pk}: run {x} missing')
    for x in d.get('datasetRefs',[]):
        if x not in datasets: errors.append(f'{pk}: dataset {x} missing')
    for x in d.get('modelRefs',[]):
        if x not in models: errors.append(f'{pk}: model {x} missing')
    for x in d.get('scenarioRefs',[]):
        if x not in scenarios: errors.append(f'{pk}: scenario {x} missing')
    for x in d.get('measureRefs',[]):
        if x not in measures: errors.append(f'{pk}: measure {x} missing')
    if d.get('ruleSetRef') not in rulesets: errors.append(f'{pk}: ruleset {d.get("ruleSetRef")} missing')
    if str(d.get('status','')).startswith('已冻结'):
        if not d.get('manifest'): errors.append(f'{pk}: frozen without manifest')
        elif sha(d['manifest']) != d.get('packageHash'): errors.append(f'{pk}: package hash mismatch')
        else: lines.append(f'{pk}: frozen hash OK')

for pk,r in rulesets.items():
    d=r['data']; ids=[x.get('id') for x in d.get('rules',[])]
    if len(ids)!=len(set(ids)): errors.append(f'{pk}: duplicate rule ids')
    if 'formalEvidenceEligibility' not in ids: errors.append(f'{pk}: missing formalEvidenceEligibility')
    if str(d.get('status','')).startswith('已发布') and not d.get('publishedHash'): errors.append(f'{pk}: published without publishedHash')

# Lightweight mirror of gate semantics to verify expected CASE-01 behavior.
def gate(package_id, ruleset_id):
    p=pkgs[package_id]['data']; rs=rulesets[ruleset_id]['data']; checks=[]
    req=p.get('requiredRunRefs') or p.get('runRefs',[]); rr=[runs[x]['data'] for x in req if x in runs]
    synthetic=any(x.get('executionMode') in ('Digital','LVC') for x in rr)
    for rule in [x for x in rs.get('rules',[]) if x.get('enabled',True)]:
        t=rule['type']; sev=rule['severity']; prm=rule.get('params') or {}; ok=True; applicable=True
        if t=='runCoverage': ok=len(rr)>=prm.get('minRuns',1) and len(rr)==len(req)
        elif t=='formalEvidenceEligibility': ok=bool(rr) and all(x.get('formalEvidenceClass') in prm.get('acceptedClasses',['正式证据','条件使用']) for x in rr)
        elif t=='datasetQuality':
            refs=p.get('datasetRefs',[]); vals=[datasets[x]['quality'] for x in refs if x in datasets]
            ok=bool(refs) and len(vals)==len(refs) and min(vals)>=prm.get('minQuality',90)
        elif t=='runMaturity': ok=bool(rr) and all(x.get('status') in prm.get('acceptedStatuses',['已完成','数据分析中','预演完成']) for x in rr)
        elif t=='packageIntegrity': ok=str(p.get('status','')).startswith('已冻结') and bool(p.get('manifest')) and sha(p['manifest'])==p.get('packageHash')
        elif t=='modelIntendedUse':
            if not synthetic: applicable=False
            else: ok=all(x in models and bool(models[x]['data'].get('intendedUse')) for x in p.get('modelRefs',[]))
        elif t=='modelValidationDomain':
            if not synthetic: applicable=False
            else:
                mids=p.get('modelRefs',[]); cs=[c for x in rr for c in x.get('modelDomainChecks',[]) if c.get('model') in mids]
                ok=all(any(c.get('model')==m for c in cs) for m in mids) and not any(c.get('inDomain') is False for c in cs)
        elif t=='modelAccreditation':
            if not synthetic: applicable=False
            else: ok=all(x in models and models[x]['data'].get('accreditation') in prm.get('accepted',['已认可','有条件认可']) for x in p.get('modelRefs',[]))
        elif t=='liveAnchor':
            if not synthetic: applicable=False
            else:
                ar=[runs[x]['data'] for x in p.get('liveAnchorRefs',[]) if x in runs]
                usable=sum(1 for x in ar if x.get('executionMode') in ('Live','LVC') and x.get('status') in ('已完成','数据分析中','预演完成'))
                ok=usable>=prm.get('minAnchors',1)
        elif t=='statisticalReadiness': ok=(p.get('analysis') or {}).get('statisticalReady') is True
        if applicable: checks.append((t,sev,ok))
    hard=[x for x in checks if not x[2] and x[1]=='hard']; soft=[x for x in checks if not x[2] and x[1]=='soft']
    return '阻塞' if hard else ('有条件通过' if soft else '通过'), hard, soft

for pkg in ['EP-CASE01-M13-V0.2','EP-CASE01-M13-V0.3','EP-CASE01-M03-V0.2']:
    for rs in ['GRS-CASE01-STRICT-V1','GRS-CASE01-EXPLORE-V1']:
        dec,hard,soft=gate(pkg,rs); lines.append(f'{pkg} × {rs}: {dec} (hard={len(hard)}, soft={len(soft)})')

# Expected demonstration boundaries.
strict_v03=gate('EP-CASE01-M13-V0.3','GRS-CASE01-STRICT-V1')[0]
explore_v03=gate('EP-CASE01-M13-V0.3','GRS-CASE01-EXPLORE-V1')[0]
if strict_v03!='阻塞': errors.append('V0.3 strict gate must be blocked')
if explore_v03 not in ('有条件通过','阻塞'): errors.append('V0.3 explore gate unexpected')

print('\n'.join(lines))
print(f'ERRORS: {len(errors)}')
for e in errors: print('ERROR:',e)
con.close()
raise SystemExit(1 if errors else 0)
