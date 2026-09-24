#!/usr/bin/env python3
import json, sqlite3, sys, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; errs=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def type_id(api):
    r=con.execute('select id,objectCount from ObjectType where apiName=?',(api,)).fetchone(); return r
def rows(api):
    t=type_id(api)
    if not t: return []
    out=[]
    for r in con.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=? order by pk',(t['id'],)):
        try:d=json.loads(r['dataJson'] or '{}')
        except Exception as e: errs.append(f'{api}/{r["pk"]} invalid JSON: {e}'); d={}
        out.append((r['pk'],r['title'],d))
    return out
def one(api,pk):
    for p,t,d in rows(api):
        if p==pk:return d
    return None

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
required_types=['DigitalPrototypeDelivery','DeliveryManifest','DigitalPrototype3','ModelArtifact','InterfaceContract','ConformanceTest','ConformanceResult','ModelBaseline','IntakeGate']
for api in required_types:
    t=type_id(api)
    if not t: errs.append(f'missing ObjectType {api}')
    elif t['objectCount']!=len(rows(api)): errs.append(f'objectCount mismatch {api}')

arts=rows('ModelArtifact'); contracts=rows('InterfaceContract'); gates=rows('IntakeGate')
if len(arts)!=10: errs.append(f'ModelArtifact must be 10, got {len(arts)}')
if len(contracts)!=3: errs.append(f'InterfaceContract must be 3, got {len(contracts)}')
from collections import Counter
cats=Counter(d.get('category') for _,_,d in arts)
if cats!={'产品构成':3,'产品特性':3,'产品行为':4}: errs.append(f'3.0 element category mismatch {dict(cats)}')
runtime=Counter(d.get('runtimeClass') for _,_,d in arts)
if runtime!={'非仿真运行类':5,'混合类':2,'仿真运行类':3}: errs.append(f'runtime classification mismatch {dict(runtime)}')
if {d.get('kind') for _,_,d in contracts}!={'FMI','SAL','IDL'}: errs.append('FMI/SAL/IDL contract set incomplete')

dlv=one('DigitalPrototypeDelivery','DLV-X9A-DP30-001')
if not dlv or dlv.get('status')!='研制方已提交 · 待基地签收': errs.append('delivery DB must start at submitted / awaiting intake')
if dlv and dlv.get('deliveryVersion')!='3.0.0': errs.append('initial deliveryVersion must be 3.0.0')
for pk in ['G0-DP30','G1-DP30','G2-DP30']:
    g=one('IntakeGate',pk)
    if not g or g.get('decision') is not None or g.get('status')!='未执行': errs.append(f'{pk} must start unexecuted')
if rows('ConformanceTest'): errs.append('ConformanceTest must start empty')
if rows('ConformanceResult'): errs.append('ConformanceResult must start empty')
if rows('ModelBaseline'): errs.append('ModelBaseline must start empty')

principals=[d for _,_,d in rows('WorkflowPrincipal') if d.get('caseId')=='DP30-INTAKE-01']
if len(principals)!=5: errs.append(f'DP30 principals must be 5, got {len(principals)}')
if [d for _,_,d in rows('ApprovalRecord') if d.get('caseId')=='DP30-INTAKE-01']: errs.append('DP30 approvals must start empty')
if [d for _,_,d in rows('SignatureRecord') if d.get('caseId')=='DP30-INTAKE-01']: errs.append('DP30 signatures must start empty')

# CASE-01 must remain on v1.8 initial chain and must not have v2.0A provenance before handoff.
case=one('DigitalTestCase','CASE-01')
if not case or case.get('status')!='证据闭环中': errs.append('CASE-01 regression: initial business state changed')
for k in ['prototypeDeliveryRef','prototypeBaselineRef','modelProvenanceRefs']:
    if case and k in case: errs.append(f'CASE-01 should not precontain {k}')
for mpk in ['MD-01','MD-08']:
    m=one('ModelAsset',mpk)
    if not m: errs.append(f'missing {mpk}')
    elif 'sourceDeliveryRef' in m: errs.append(f'{mpk} should not precontain DP30 provenance')

# Source-level contracts.
lib=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/dp30-intake/route.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/dp30-intake.tsx').read_text(encoding='utf-8')
platform=(ROOT/'src/lib/platform.ts').read_text(encoding='utf-8')
steps=['receive-isolate','g0-manifest','classify-route','g1-first-test','remediate-retest','freeze-baseline','qualify-handoff']
for s in steps:
    if s not in lib: errs.append(f'missing state-machine step {s}')
for token in ['动作越序','requestDp30Approval','approveDp30Step','assertExecution','recordExecution','signatureIntegrityValid','G1阻塞','SAL-RESET-001','IDL-SCHEMA-002','3.0.1-test-base','sourceArtifactRef','prototypeBaselineRef']:
    if token not in lib: errs.append(f'missing implementation token: {token}')
for token in ["'request-approval'","'approve'","'execute'","'reset'"]:
    if token not in api: errs.append(f'missing API operation {token}')
for token in ['3.0 十要素','FMI / SAL / IDL','符合性试验','审批与审计','进入 CASE-01','G0 通过','G1 通过','G2-ENTRY 通过']:
    if token not in ui: errs.append(f'missing UI concept: {token}')
if "'prototypeIntake'" not in platform: errs.append('prototypeIntake navigation missing')

# Ontology links are part of Palantir-style realization.
links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['deliveryHasManifest','deliveryContainsPrototype','prototypeHasArtifact','artifactImplementsContract','artifactTestedBy','testProducesResult','baselineContainsArtifact','artifactPromotedToModel','deliveryFeedsCase']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

print('SQLite integrity_check:',integrity)
print('DP30 initial delivery:',dlv.get('status') if dlv else 'MISSING')
print('3.0 artifacts:',len(arts),dict(cats))
print('Runtime classes:',dict(runtime))
print('Contracts:',[d.get('kind') for _,_,d in contracts])
print('Gates:',[(p,d.get('status'),d.get('decision')) for p,_,d in gates if d.get('caseId')=='DP30-INTAKE-01'])
print('DP30 principals:',len(principals))
print('CASE-01 regression state:',case.get('status') if case else 'MISSING')
print('State-machine steps:',len(steps))
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
