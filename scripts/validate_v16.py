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
def entry(api,pk):
    t=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if not t: return None
    r=con.execute('select title,dataJson from ObjectEntry where objectTypeId=? and pk=?',(t['id'],pk)).fetchone()
    return {'title':r['title'],'data':json.loads(r['dataJson'] or '{}')} if r else None

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
case=entry('DigitalTestCase','CASE-01')
if not case or case['data'].get('status')!='证据闭环中': errs.append('initial CASE-01 is not V0.3 evidence-closure state')
if entry('EvidencePackage','EP-CASE01-M13-V0.4') is not None: errs.append('V0.4 must not exist in initial demo state')
if entry('TestRun','RUN-LIVE-002-02') is not None: errs.append('formal Live retest must not pre-exist')
if entry('TestRun','RUN-LVC-004-FRM-01') is not None: errs.append('formal LVC run must not pre-exist')
dot=entry('TestRun','RUN-DOT-S-02')
if not dot or dot['data'].get('status')!='待执行': errs.append('RUN-DOT-S-02 must begin as planned/pending')
for mid in ['MD-02','MD-07','MD-08']:
    m=entry('ModelAsset',mid)
    if not m or m['data'].get('accreditation')!='待认可': errs.append(f'{mid} must begin pending accreditation')
gate=entry('EvidenceGate','EG-M13')
if not gate or gate['data'].get('decision')!='阻塞': errs.append('EG-M13 must begin BLOCKED')

rule=entry('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
if not rule: errs.append('STRICT-V1 missing')
else:
    d=rule['data']; published={k:d.get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}
    if d.get('publishedHash')!=sha(published): errs.append('STRICT-V1 published hash mismatch')

src=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
route=(ROOT/'src/app/api/case01-state-machine/route.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/case01-state-machine.tsx').read_text(encoding='utf-8')
inspector=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
package_api=(ROOT/'src/app/api/evidence-package/route.ts').read_text(encoding='utf-8')
gate_api=(ROOT/'src/app/api/evidence-gate-service/route.ts').read_text(encoding='utf-8')
steps=['live-retest','lvc-anchor','vva-accredit','digital-5000','draft-package','freeze-package','strict-gate','freeze-conclusion']
for step in steps:
    if step not in src: errs.append(f'state step missing in service: {step}')
if '动作越序' not in src: errs.append('server-side out-of-order guard missing')
if "operation === 'reset'" not in route or "operation !== 'execute'" not in route: errs.append('state machine API operations incomplete')
if '执行当前步骤' not in ui or '重置演示' not in ui or 'Action Log' not in ui: errs.append('clickable state machine controls incomplete')
if 'onClick={freezePackage}' in inspector or 'onClick={commitEvaluation}' in inspector: errs.append('manual V0.4 mutation bypass still present')
if 'EP-CASE01-M13-V0.4 由 CASE-01 状态机受控冻结' not in package_api: errs.append('direct V0.4 freeze API bypass not blocked')
if '正式门控写回由 CASE-01 状态机控制' not in gate_api: errs.append('direct V0.4 gate commit API bypass not blocked')

baseline=json.loads((ROOT/'src/lib/case01-v03-baseline.json').read_text(encoding='utf-8'))
for item in baseline['entries']:
    current=entry(item['apiName'],item['pk'])
    if not current or current['data']!=item['data']:
        errs.append(f'packaged DB differs from reset baseline: {item["apiName"]}/{item["pk"]}')

print('SQLite integrity_check:',integrity)
print('Initial state: V0.3 / BLOCKED')
print('STRICT-V1 hash:', 'OK' if rule and rule['data'].get('publishedHash')==sha({k:rule['data'].get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}) else 'FAIL')
print('State machine steps:',len(steps))
print('Server out-of-order guard:', 'OK' if '动作越序' in src else 'FAIL')
print('Manual V0.4 UI bypass removed:', 'OK' if 'onClick={freezePackage}' not in inspector and 'onClick={commitEvaluation}' not in inspector else 'FAIL')
print('Direct V0.4 API bypass blocked:', 'OK' if 'EP-CASE01-M13-V0.4 由 CASE-01 状态机受控冻结' in package_api and '正式门控写回由 CASE-01 状态机控制' in gate_api else 'FAIL')
print('Packaged DB baseline snapshot:', 'OK' if not any('packaged DB differs' in e for e in errs) else 'FAIL')
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
