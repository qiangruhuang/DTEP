#!/usr/bin/env python3
import hashlib, json, sqlite3, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; errs=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(str(k),ensure_ascii=False,separators=(',',':'))+':'+stable(v[k]) for k in sorted(v))+'}'
    if v is True:return 'true'
    if v is False:return 'false'
    if v is None:return 'null'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()
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

def require_tokens(path,tokens,label):
    text=(ROOT/path).read_text(encoding='utf-8')
    for token in tokens:
        if token not in text: errs.append(f'{label} missing {token}')
    return text

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')

apis=['AdjudicationRuleSet','MissionStepObservation','MeasureObservation','RunMeasureResult','RunAdjudicationDecision','AdjudicationAction']
for api in apis:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
for api in apis[1:]:
    if rows(api): errs.append(f'initial delivery must not pre-create {api} records')

links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['adjudicationUsesReconstruction','adjudicationUsesRuleSet','missionObservationUsesReconstruction','measureObservationUsesRuleSet','measureObservationUsesReconstruction','measureObservationTargetsMeasure','runMeasureResultUsesObservation','runUsesMeasureResult','runUsesAdjudicationDecision']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

rules=one('AdjudicationRuleSet','ARS-CASE01-E2M-v1')
if not rules: errs.append('missing ARS-CASE01-E2M-v1')
else:
    if rules.get('status')!='已发布/冻结': errs.append('adjudication ruleset must be 已发布/冻结')
    if rules.get('schema')!='dtep/event-to-measure-rules/v2.0g': errs.append('adjudication ruleset schema mismatch')
    rr=rules.get('rules') if isinstance(rules.get('rules'),list) else []
    if len(rr)!=4: errs.append(f'adjudication ruleset expected 4 rules, got {len(rr)}')
    refs={str(x.get('measureRef')) for x in rr}
    if refs!={'M-03','M-08','M-13','M-14'}: errs.append(f'adjudication measure refs mismatch: {sorted(refs)}')
    body={k:v for k,v in rules.items() if k!='publishedHash'}
    if rules.get('publishedHash')!=sha(body): errs.append('AdjudicationRuleSet publishedHash mismatch')
    if not rules.get('immutable'): errs.append('AdjudicationRuleSet must be immutable')

lib=require_tokens('src/lib/event-to-measure.ts',[
    'RunAdjudicationDecision','MissionStepObservation','MeasureObservation','RunMeasureResult','AdjudicationAction',
    'READY_FOR_RUN_SIGNOFF','assertAutomatedAdjudicationReadyForRunSignoff','bindRunToAutomatedAdjudication','finalizeAutomatedAdjudication','clearCase01AutomatedAdjudicationRecords',
    'Batch.MissionOutcome','Twin.ErrorSummary','Link.RangeAchieved','Intel.Distributed','performanceDecision','adjudicationCompleteness','v2.0g'
], 'event-to-measure implementation')

rule_file=json.loads((ROOT/'src/lib/case01-adjudication-rules.json').read_text(encoding='utf-8'))
rule_ids={str(x.get('id')) for x in rule_file.get('rules',[])}
if rule_ids!={'AR-M03-LINK-RANGE','AR-M08-INTEL-LATENCY','AR-M13-MISSION-SUCCESS','AR-M14-TWIN-NRMSE'}: errs.append(f'case01-adjudication-rules.json rule IDs mismatch: {sorted(rule_ids)}')

require_tokens('src/lib/run-data-quality.ts',['Batch.MissionOutcome','successCount: 4160','totalCount: 5000','nrmsePct: 6.8','Link.RangeAchieved','rangeKm: 208','Intel.Distributed'], 'canonical event source')
require_tokens('src/lib/case01-governance.ts',['recordAdjudicationSignature',"'adjudication'"], 'governance adjudication signature')
case=require_tokens('src/lib/case01-state-machine.ts',[
    'assertAutomatedAdjudicationReadyForRunSignoff','bindRunToAutomatedAdjudication','finalizeAutomatedAdjudication','clearCase01AutomatedAdjudicationRecords','getAutomatedAdjudicationState',
    'Evidence Package冻结被Event-to-Measure自动判读阻塞',"run.data.automatedAdjudicationVersion !== 'v2.0g'",'dtep/evidence-package-manifest/v2.0g','automatedAdjudicationRefs'
], 'CASE-01 adjudication integration')
require_tokens('src/app/api/automated-adjudication/route.ts',['executeAutomatedAdjudicationOperation','adjudicate'], 'Automated Adjudication API')
require_tokens('src/lib/run-instance.ts',[
    '缺少 Event-to-Measure 判读规则集引用','Event-to-Measure 自动判读未达到 READY_FOR_RUN_SIGNOFF','automatedAdjudicationFinalHash','runMeasureResultSnapshots','adjudicationRuleSetHash'
], 'Run audit automated adjudication gate')
require_tokens('src/lib/dp30-intake.ts',['ensureAutomatedAdjudicationOntology','clearCase01AutomatedAdjudicationRecords'], 'DP30 adjudication lifecycle')
require_tokens('src/components/platform/case01-state-machine.tsx',[
    'Event-to-Measure / Automated Adjudication','READY_FOR_RUN_SIGNOFF','/api/automated-adjudication','未达标'
], 'Automated Adjudication UI')
require_tokens('src/components/platform/case-execution.tsx',['Event-to-Measure / Automated Adjudication','runMeasureResultSnapshots','automatedAdjudicationFinalHash'], 'Run evidence adjudication UI')
require_tokens('src/lib/decision-provenance.ts',['Event → Measure 判读','runAdjudicationDecisionSnapshot','runMeasureResultSnapshots','adjudicationRuleSetHash'], 'Decision Provenance adjudication chain')
require_tokens('src/components/platform/decision-provenance.tsx',['Automated Adjudication','Run Measure Result','Event→Measure'], 'Decision Provenance adjudication UI')

# Shadow calculation: these are DEMO/SYNTHETIC prototype observations encoded in canonical event generation.
m03=208.0; m08=(13520-2120)/1000; m13=4160/5000*100; m14=6.8
shadow={
    'M-03':(m03,200,'达标' if m03>=200 else '未达标'),
    'M-08':(m08,15,'达标' if m08<=15 else '未达标'),
    'M-13':(m13,85,'达标' if m13>=85 else '未达标'),
    'M-14':(m14,8,'达标' if m14<=8 else '未达标'),
}
if abs(m08-11.4)>1e-9 or abs(m13-83.2)>1e-9: errs.append('shadow Event-to-Measure arithmetic inconsistent')
if shadow['M-13'][2] != '未达标' or shadow['M-14'][2] != '达标': errs.append('shadow performance decisions inconsistent')

# The delivery DB remains pre-execution: do not retroactively mutate Measures or legacy Runs with v2.0g adjudication provenance.
expected_measures={'M-03':(208,'达标'),'M-08':(None,'统计中'),'M-13':(82.4,'统计中'),'M-14':(6.2,'达标')}
for pk,(measured,status) in expected_measures.items():
    d=one('Measure',pk)
    if not d: errs.append(f'Measure/{pk} missing'); continue
    if d.get('measured')!=measured or d.get('status')!=status: errs.append(f'Measure/{pk} was unexpectedly pre-adjudicated: measured={d.get("measured")} status={d.get("status")}')
    if d.get('automatedAdjudicationVersion')=='v2.0g': errs.append(f'Measure/{pk} must not carry v2.0g before state-machine execution')
for pk in ['RUN-DOT-B-01','RUN-DOT-S-01','RUN-LVC-004-REH-01']:
    d=one('TestRun',pk)
    if d and any(k in d for k in ['automatedAdjudicationVersion','runAdjudicationDecisionRef','runMeasureResultRefs']): errs.append(f'legacy {pk} must not be retroactively backfilled with v2.0g adjudication provenance')

strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
if strict_hash!='sha256:a077d5da6b1e8b2cb571cb2de134f470007eab05bc1c128083b53038a9e19121': errs.append('STRICT-V1 published hash changed')

print('SQLite integrity_check:',integrity)
print('AdjudicationRuleSet:',len(rows('AdjudicationRuleSet')),'published hash:',rules.get('publishedHash') if rules else 'MISSING')
for api in apis[1:]: print(f'Initial {api} objects:',len(rows(api)))
print('Shadow Event-to-Measure: M-03=208km PASS; M-08=11.4s PASS; M-13=83.2% FAIL; M-14=6.8% PASS')
print('Automated Adjudication decision semantics: complete chain -> READY_FOR_RUN_SIGNOFF even when M-13 performance is 未达标')
print('Evidence Package V0.4 freeze requires v2.0g adjudication-ready formal Runs + final adjudication hash')
print('Decision Provenance includes Run -> Automated Adjudication -> Run Measure Result')
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
