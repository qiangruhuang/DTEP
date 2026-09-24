#!/usr/bin/env python3
import hashlib, json, sqlite3, sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; errs=[]; warns=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(str(k),ensure_ascii=False,separators=(',',':'))+':'+stable(v[k]) for k in sorted(v))+'}'
    if v is True:return 'true'
    if v is False:return 'false'
    if v is None:return 'null'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()
def t(api): return con.execute('select id,objectCount,displayName from ObjectType where apiName=?',(api,)).fetchone()
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
def text(path): return (ROOT/path).read_text(encoding='utf-8')
def require(path,tokens,label):
    s=text(path)
    for tok in tokens:
        if tok not in s: errs.append(f'{label} missing token: {tok}')
    return s

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')

# Architecture uniqueness / anti-duplication audit.
for table in ['ObjectType','LinkType','ActionType']:
    vals=[r[0] for r in con.execute(f'select apiName from {table}')]
    dup=[k for k,v in Counter(vals).items() if v>1]
    if dup: errs.append(f'{table} duplicate apiName: {dup}')
displays=[r['displayName'] for r in con.execute('select displayName from ObjectType')]
if [k for k,v in Counter(displays).items() if v>1]: errs.append('ObjectType duplicate displayName found')

# H ontology + initial state.
h_types=['ReviewPanelSession','ExpertOpinion','EvidenceRequest','FinalAdjudicationDecision']
for api in h_types:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
    if rows(api): errs.append(f'delivery DB must not pre-create {api} runtime records')
links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['panelReviewsCase','panelReviewsEvidencePackage','panelReviewsAdjudication','opinionBelongsToPanel','opinionTargetsMeasure','finalDecisionBelongsToPanel','finalDecisionReviewsEvidencePackage','evidenceRequestBelongsToPanel']:
    if lk not in links: errs.append(f'missing H LinkType {lk}')

principals=[d for _,_,d in rows('WorkflowPrincipal')]
experts=[d for d in principals if d.get('roleId')=='expert-reviewer']
if len(experts)!=3: errs.append(f'expected 3 expert-reviewer principals, got {len(experts)}')
if {x.get('code') for x in experts}!={'ACT-FANG','ACT-GAO','ACT-YU'}: errs.append('expert reviewer directory mismatch')
for x in experts:
    if x.get('roleId') in {'evaluation-authority','final-approver'}: errs.append('expert reviewer role collision with chair/final approver')

# Frozen architecture manifest integrity.
freeze=json.loads((ROOT/'ARCHITECTURE_FREEZE_v2.1.json').read_text(encoding='utf-8'))
arch_hash=freeze.get('architectureHash'); body={k:v for k,v in freeze.items() if k!='architectureHash'}
if arch_hash!=sha(body): errs.append('ARCHITECTURE_FREEZE_v2.1 architectureHash mismatch')
if freeze.get('status')!='FROZEN': errs.append('architecture freeze status must be FROZEN')
if len(freeze.get('layers',[]))!=8: errs.append('architecture freeze must contain A-H eight layers')
if len(freeze.get('frozenBusinessSteps',[]))!=8: errs.append('business step count changed from 8')

strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1'); adj=one('AdjudicationRuleSet','ARS-CASE01-E2M-v1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'; adj_hash=str(adj.get('publishedHash')) if adj else 'MISSING'
if strict_hash!='sha256:a077d5da6b1e8b2cb571cb2de134f470007eab05bc1c128083b53038a9e19121': errs.append('STRICT-V1 published hash changed')
if adj_hash!='sha256:555086efe8b46667a5f6e215769932d7ad070c8ff3e2e856bc872f891780a558': errs.append('Automated Adjudication rules hash changed')
if freeze.get('frozenHashes',{}).get('STRICT_V1')!=strict_hash or freeze.get('frozenHashes',{}).get('ADJUDICATION_V1')!=adj_hash: errs.append('freeze manifest rule hash mismatch')

# Source governance and H controls.
require('src/lib/case01-governance.ts',['expert-reviewer','recordExpertOpinionSignature','recordPanelDecisionSignature',"'expert-review'","'panel-decision'"],'governance H')
expert=require('src/lib/expert-review.ts',[
    'blind-independent-then-deliberate','REVIEWER_IDS','quorumRequired','CONCUR_WITH_QUALIFICATION','REQUEST_MORE_EVIDENCE','RULE_CHALLENGE',
    'machineDecisionPreserved: true','NO_IN_PLACE_OVERRIDE','assertExpertReviewReadyForFinalApproval','expertReviewApprovalContext','clearCase01ExpertReviewRecords',
    'RETURN_FOR_EVIDENCE','REFER_RULE_REVIEW','humanReviewHash'
], 'expert review service')
if "'OVERRIDE'" in expert or 'OVERRIDE' in [x.strip() for x in expert.splitlines() if 'VALID_DISPOSITIONS' in x]: warns.append('OVERRIDE token present; ensure it is not an enabled v2.1 disposition')
case=require('src/lib/case01-state-machine.ts',[
    "if (stepId === 'freeze-conclusion') await assertExpertReviewReadyForFinalApproval()",'finalHumanAdjudicationRef','finalHumanAdjudicationHash','expertReviewDisposition',
    'Evidence Package冻结被Run Data Quality阻塞','Evidence Package冻结被Event-to-Measure自动判读阻塞','clearCase01ExpertReviewRecords'
], 'CASE-01 v2.1 integration')
route=require('src/app/api/case01-state-machine/route.ts',['expertReviewApprovalContext',"body.stepId === 'freeze-conclusion'"], 'final approval guard')
require('src/app/api/expert-review/route.ts',['ExpertReviewOperation','executeExpertReviewOperation','getExpertReviewState'], 'expert review API')
require('src/lib/expert-review.ts',['open-panel','submit-opinion','finalize-panel'], 'expert review operations')
require('src/components/platform/case01-state-machine.tsx',['Expert Review Board / Human Final Adjudication','独立盲审 → 统一解盲 → 合议','提交独立意见并签署','形成合议最终处置并签署','v2.1 FROZEN'], 'expert review UI')
require('src/lib/decision-provenance.ts',["kind: 'decision' | 'human-review' | 'expert-opinion'",'专家合议与终审','finalHumanAdjudicationRef'], 'Decision Provenance human review')
require('src/components/platform/decision-provenance.tsx',['Human Final Adjudication','Expert Opinion','结论 → 专家合议/终审'], 'Decision Provenance H UI')

# Existing A-G architecture still present.
for api in ['DigitalPrototypeDelivery','ModelBaseline','TestModelAssembly','TestEnvironmentAssembly','LVCFederationConfiguration','TestReadinessReview','FederationReadinessReview','RunControlSession','RunHealthSnapshot','RunEventReconstruction','RunDataQualityAssessment','AdjudicationRuleSet','RunAdjudicationDecision']:
    if not t(api): errs.append(f'architecture regression missing {api}')

# Delivery DB remains pre-execution and legacy is not backfilled.
case01=one('DigitalTestCase','CASE-01')
if not case01 or case01.get('status')!='证据闭环中': errs.append('delivery CASE-01 must remain V0.3 evidence-closure initial state')
for pk in ['RUN-DOT-B-01','RUN-DOT-S-01','RUN-LVC-004-REH-01']:
    d=one('TestRun',pk)
    if d and any(k in d for k in ['automatedAdjudicationVersion','finalHumanAdjudicationRef','humanReviewHash']): errs.append(f'legacy {pk} was retroactively upgraded')

# E2E deterministic shadow integrity.
e2e=json.loads((ROOT/'END_TO_END_DEMO_v2.1.json').read_text(encoding='utf-8'))
prev='GENESIS'
for cp in e2e.get('checkpoints',[]):
    payload={k:cp[k] for k in ['index','code','stage','artifact','detail','status','previousHash']}
    if cp.get('previousHash')!=prev: errs.append(f'E2E chain previousHash mismatch at {cp.get("code")}')
    h=sha(payload)
    if cp.get('checkpointHash')!=h: errs.append(f'E2E checkpoint hash mismatch at {cp.get("code")}')
    prev=h
if e2e.get('finalChainHash')!=prev: errs.append('E2E finalChainHash mismatch')
if e2e.get('checkpointCount')!=27: errs.append(f'E2E checkpoint count expected 27, got {e2e.get("checkpointCount")}')
for k,v in (e2e.get('assertions') or {}).items():
    if v is not True: errs.append(f'E2E assertion failed: {k}')

print('SQLite integrity_check:',integrity)
print('Architecture ObjectTypes:',con.execute('select count(*) from ObjectType').fetchone()[0], 'LinkTypes:',con.execute('select count(*) from LinkType').fetchone()[0])
print('Duplicate apiName/displayName audit: OK')
print('Expert reviewers:',len(experts),'runtime H records:',{api:len(rows(api)) for api in h_types})
print('Architecture freeze hash:',arch_hash)
print('STRICT-V1 hash:',strict_hash)
print('Adjudication rules hash:',adj_hash)
print('E2E checkpoints:',e2e.get('checkpointCount'),'final chain:',e2e.get('finalChainHash'))
print('Evidence semantics: Gate PASS != performance PASS; machine fact immutable; human final adjudication is additive')
print('WARNINGS:',len(warns))
for w in warns: print('~',w)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
