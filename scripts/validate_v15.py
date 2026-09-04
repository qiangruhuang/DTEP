#!/usr/bin/env python3
import hashlib,json,sqlite3,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()

con=sqlite3.connect(DB); con.row_factory=sqlite3.Row
errs=[]

def all_entries(api):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if not r: return []
    return [{'pk':x['pk'],'title':x['title'],'data':json.loads(x['dataJson'] or '{}')} for x in con.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=?',(r['id'],))]
def one(api,pk):
    xs=[x for x in all_entries(api) if x['pk']==pk]
    if not xs: errs.append(f'missing {api}/{pk}'); return {'pk':pk,'title':'','data':{}}
    return xs[0]

runs=all_entries('TestRun'); models=all_entries('ModelAsset'); rule=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1'); pkg=one('EvidencePackage','EP-CASE01-M13-V0.4')
p=pkg['data']; manifest=p.get('manifest') or {}
if p.get('packageHash')!=sha(manifest): errs.append('V0.4 package hash mismatch')
if not str(p.get('status','')).startswith('已冻结'): errs.append('V0.4 not frozen')
if rule['data'].get('version')!='1.0' or rule['data'].get('status')!='已发布/原型': errs.append('STRICT-V1 unexpectedly changed')

# Validate strict rule published hash is internally consistent.
published={k:rule['data'].get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}
if rule['data'].get('publishedHash')!=sha(published): errs.append('STRICT-V1 published hash mismatch')

# Frozen snapshots must exist and resolve all package refs.
for field,snapfield,key in [('runRefs','runSnapshots','pk'),('modelRefs','modelSnapshots','pk'),('datasetRefs','datasetSnapshots','path')]:
    wanted=list(p.get(field) or []); got={str(x.get(key)) for x in manifest.get(snapfield,[]) or []}
    miss=[x for x in wanted if x not in got]
    if miss: errs.append(f'{snapfield} missing: {miss}')

runmap={x['pk']:x for x in manifest.get('runSnapshots',[])}
modelmap={x['pk']:x for x in manifest.get('modelSnapshots',[])}
dsmap={x['path']:x for x in manifest.get('datasetSnapshots',[])}
required=p.get('requiredRunRefs') or p.get('runRefs') or []
reqruns=[runmap.get(x) for x in required]
if None in reqruns: errs.append('required run snapshot unresolved')
accepted_classes={'正式证据','条件使用'}
if any(r and r['data'].get('formalEvidenceClass') not in accepted_classes for r in reqruns): errs.append('formal evidence eligibility failed')
if any(r and r['data'].get('status') not in {'已完成','数据分析中'} for r in reqruns): errs.append('run maturity failed')
if any(dsmap.get(x,{}).get('qualityScore',0)<90 for x in p.get('datasetRefs',[])): errs.append('dataset quality failed')
modelids=p.get('modelRefs',[])
if any(not str(modelmap.get(x,{}).get('data',{}).get('intendedUse','')).strip() for x in modelids): errs.append('intended use failed')
checks=[]
for r in reqruns:
    if r: checks += [c for c in r['data'].get('modelDomainChecks',[]) if c.get('model') in modelids]
for mid in modelids:
    if not any(c.get('model')==mid for c in checks): errs.append(f'model domain check missing {mid}')
if any(c.get('inDomain') is False for c in checks): errs.append('model validation domain failed')
if any(modelmap.get(x,{}).get('data',{}).get('accreditation') not in {'已认可','有条件认可'} for x in modelids): errs.append('model accreditation failed')
anchors=[runmap.get(x) for x in p.get('liveAnchorRefs',[])]
usable=[r for r in anchors if r and r['data'].get('executionMode') in {'Live','LVC'} and r['data'].get('status') in {'已完成','数据分析中','预演完成'}]
if len(usable)<1: errs.append('live anchor failed')
if p.get('analysis',{}).get('statisticalReady') is not True: errs.append('statistical readiness failed')

# Expected business state transition.
if p.get('gateDecision')!='通过': errs.append('V0.4 gateDecision should PASS')
case=one('DigitalTestCase','CASE-01')['data']
if case.get('finalGateDecision')!='通过': errs.append('CASE final gate should PASS')
if case.get('performanceDecision')!='未达到要求': errs.append('CASE performance decision must remain NOT MET')
for mid,ver in [('MD-02','CH-3.5'),('MD-07','DE-4.1'),('MD-08','MT-1.3')]:
    m=one('ModelAsset',mid)['data']
    if m.get('version')!=ver or m.get('accreditation')!='已认可': errs.append(f'{mid} closure state wrong')
for rid in ['RUN-LIVE-002-02','RUN-LVC-004-FRM-01','RUN-DOT-S-02']:
    r=one('TestRun',rid)['data']
    if r.get('status')!='已完成': errs.append(f'{rid} not completed')

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check: '+str(integrity))
print('SQLite integrity_check:',integrity)
print('TestRun:',len(runs),'EvidencePackage:',len(all_entries('EvidencePackage')),'RuleSet:',len(all_entries('EvidenceGateRuleSet')))
print('V0.4 package hash:', 'OK' if p.get('packageHash')==sha(manifest) else 'FAIL')
print('STRICT-V1 published hash:', 'OK' if rule['data'].get('publishedHash')==sha(published) else 'FAIL')
print('V0.4 strict gate expected: 通过 (hard=0, soft=0)')
print('Performance decision:',case.get('performanceDecision'))
print('Prototype data notice:',case.get('prototypeDataNotice'))
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
