#!/usr/bin/env python3
import hashlib, json, re, sqlite3, sys
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
def type_row(api): return con.execute('select id,objectCount from ObjectType where apiName=?',(api,)).fetchone()
def entry(api,pk):
    t=type_row(api)
    if not t: return None
    r=con.execute('select title,dataJson from ObjectEntry where objectTypeId=? and pk=?',(t['id'],pk)).fetchone()
    return {'title':r['title'],'data':json.loads(r['dataJson'] or '{}')} if r else None
def count(api):
    t=type_row(api)
    return 0 if not t else con.execute('select count(*) from ObjectEntry where objectTypeId=?',(t['id'],)).fetchone()[0]
def case_rows(api, case_id='CASE-01'):
    t=type_row(api)
    if not t: return []
    out=[]
    for r in con.execute('select dataJson from ObjectEntry where objectTypeId=?',(t['id'],)):
        d=json.loads(r['dataJson'] or '{}')
        if d.get('caseId')==case_id: out.append(d)
    return out

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')

# Initial business state must remain v1.6 V0.3/BLOCKED.
case=entry('DigitalTestCase','CASE-01')
if not case or case['data'].get('status')!='证据闭环中': errs.append('CASE-01 initial status is not evidence-closure / V0.3')
if entry('EvidencePackage','EP-CASE01-M13-V0.4') is not None: errs.append('V0.4 must not pre-exist')
for pk in ['RUN-LIVE-002-02','RUN-LVC-004-FRM-01']:
    if entry('TestRun',pk) is not None: errs.append(f'{pk} must not pre-exist')
dot=entry('TestRun','RUN-DOT-S-02')
if not dot or dot['data'].get('status')!='待执行': errs.append('RUN-DOT-S-02 must begin pending')
for mid in ['MD-02','MD-07','MD-08']:
    m=entry('ModelAsset',mid)
    if not m or m['data'].get('accreditation')!='待认可': errs.append(f'{mid} must begin pending accreditation')
gate=entry('EvidenceGate','EG-M13')
if not gate or gate['data'].get('decision')!='阻塞': errs.append('EG-M13 must begin BLOCKED')

# Governance ontology and clean start.
for api in ['WorkflowPrincipal','ApprovalRecord','SignatureRecord']:
    if not type_row(api): errs.append(f'{api} object type missing')
if len(case_rows('WorkflowPrincipal'))!=9: errs.append('CASE-01 WorkflowPrincipal count must be 9')
if len(case_rows('ApprovalRecord'))!=0: errs.append('CASE-01 ApprovalRecord must start empty')
if len(case_rows('SignatureRecord'))!=0: errs.append('CASE-01 SignatureRecord must start empty')

expected_roles={'test-executor','lvc-controller','model-owner','accreditation-authority','digital-operator','evidence-manager','test-director','evaluation-authority','final-approver'}
actual_roles=set()
for d in case_rows('WorkflowPrincipal'):
    actual_roles.add(d.get('roleId'))
if actual_roles!=expected_roles: errs.append(f'role directory mismatch: {actual_roles}')

# STRICT-V1 remains immutable.
rule=entry('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
if not rule: errs.append('STRICT-V1 missing')
else:
    d=rule['data']; published={k:d.get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}
    if d.get('publishedHash')!=sha(published): errs.append('STRICT-V1 published hash mismatch')

# Source-level governance contracts.
gov=(ROOT/'src/lib/case01-governance.ts').read_text(encoding='utf-8')
state=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
route=(ROOT/'src/app/api/case01-state-machine/route.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/case01-state-machine.tsx').read_text(encoding='utf-8')
package_api=(ROOT/'src/app/api/evidence-package/route.ts').read_text(encoding='utf-8')
gate_api=(ROOT/'src/app/api/evidence-gate-service/route.ts').read_text(encoding='utf-8')

steps=['live-retest','lvc-anchor','vva-accredit','digital-5000','draft-package','freeze-package','strict-gate','freeze-conclusion']
for step in steps:
    if f"'{step}'" not in gov: errs.append(f'governance policy missing: {step}')
    if step not in state: errs.append(f'state step missing: {step}')
if gov.count('separationOfDuty: true') < 7: errs.append('independent-approval separation-of-duty policies incomplete')
for token in ['requestStepApproval','approveStep','assertStepExecutionAuthorized','recordStepExecutionSignature','subjectDigest','signatureHash','DEMO-SHA256-ATTESTATION-v1','签署记录禁止原地覆盖','审批记录缺少申请或批准签署凭据','审批签署记录不可解析','审批签署完整性校验失败','signatureIntegrityValid']:
    if token not in gov and token not in state: errs.append(f'governance implementation token missing: {token}')
if 'approval.data.requestedBy === actor.id' not in gov: errs.append('self-approval server guard missing')
if 'hasStepExecutionSignature' not in state: errs.append('signature-gated state progression missing')
if '动作越序' not in state: errs.append('server out-of-order guard missing')
for op in ["'request-approval'","'approve'","'execute'"]:
    if op not in route: errs.append(f'API operation missing: {op}')
if 'actorId' not in route: errs.append('API actor identity parameter missing')
for text in ['当前演示身份','提交审批并签署','批准并签署','执行并签署','审批链','签署链','DEMO ROLE SWITCH']:
    if text not in ui: errs.append(f'UI governance control missing: {text}')
if 'EP-CASE01-M13-V0.4 由 CASE-01 状态机受控冻结' not in package_api: errs.append('direct V0.4 freeze bypass guard missing')
if '正式门控写回由 CASE-01 状态机控制' not in gate_api: errs.append('direct formal gate bypass guard missing')

# Baseline core business entries remain byte-for-structure equivalent to reset snapshot.
baseline=json.loads((ROOT/'src/lib/case01-v03-baseline.json').read_text(encoding='utf-8'))
for item in baseline['entries']:
    current=entry(item['apiName'],item['pk'])
    if not current or current['data']!=item['data']:
        errs.append(f'packaged DB differs from v0.3 baseline: {item["apiName"]}/{item["pk"]}')

print('SQLite integrity_check:',integrity)
print('Initial CASE-01:',case['data'].get('status') if case else 'MISSING')
print('CASE-01 governance principals:',len(case_rows('WorkflowPrincipal')))
print('CASE-01 approval records at delivery:',len(case_rows('ApprovalRecord')))
print('CASE-01 signature records at delivery:',len(case_rows('SignatureRecord')))
print('Role directory:',len(actual_roles),'roles')
print('STRICT-V1 hash:', 'OK' if rule and rule['data'].get('publishedHash')==sha({k:rule['data'].get(k) for k in ['scope','purpose','version','rules','decisionPolicy']}) else 'FAIL')
print('Business steps:',len(steps))
print('Independent approval policies:',gov.count('separationOfDuty: true'))
print('Signature-gated progression:','OK' if 'hasStepExecutionSignature' in state else 'FAIL')
print('Server self-approval guard:','OK' if 'approval.data.requestedBy === actor.id' in gov else 'FAIL')
print('Role-aware API:','OK' if all(x in route for x in ["'request-approval'","'approve'","'execute'",'actorId']) else 'FAIL')
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
