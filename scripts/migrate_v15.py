#!/usr/bin/env python3
"""DTEP v1.5 — CASE-01 evidence-closure state transition.

All results seeded here are DEMONSTRATION / SYNTHETIC prototype data. They validate
workflow, auditability and gate-state transitions; they are not real T&E evidence.
"""
import hashlib, json, sqlite3, uuid
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'db' / 'custom.db'

def uid(prefix='v15'): return f"{prefix}_{uuid.uuid4().hex[:24]}"
def dumps(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
def stable(v):
    if isinstance(v, list): return '[' + ','.join(stable(x) for x in v) + ']'
    if isinstance(v, dict): return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + stable(v[k]) for k in sorted(v)) + '}'
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
def sha(v): return 'sha256:' + hashlib.sha256(stable(v).encode()).hexdigest()
def utcnow(): return datetime.now(timezone.utc).isoformat()

con=sqlite3.connect(DB); con.execute('PRAGMA foreign_keys=ON'); cur=con.cursor()

def type_id(api):
    r=cur.execute('SELECT id FROM ObjectType WHERE apiName=?',(api,)).fetchone(); return r[0] if r else None

def get_entry(api,pk):
    tid=type_id(api); r=cur.execute('SELECT id,title,dataJson FROM ObjectEntry WHERE objectTypeId=? AND pk=?',(tid,pk)).fetchone()
    if not r: return None
    return r[0], r[1], json.loads(r[2] or '{}')

def upsert_entry(api,pk,title,data):
    tid=type_id(api); r=cur.execute('SELECT id FROM ObjectEntry WHERE objectTypeId=? AND pk=?',(tid,pk)).fetchone()
    if r: cur.execute('UPDATE ObjectEntry SET title=?,dataJson=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',(title,dumps(data),r[0]))
    else: cur.execute('INSERT INTO ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('oe'),tid,pk,title,dumps(data)))

def refresh_count(api):
    tid=type_id(api); n=cur.execute('SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchone()[0]; cur.execute('UPDATE ObjectType SET objectCount=? WHERE id=?',(n,tid))

def update_entry(api,pk,mut):
    row=get_entry(api,pk)
    if not row: raise RuntimeError(f'{api}/{pk} missing')
    oid,title,data=row; data=mut(data) or data
    cur.execute('UPDATE ObjectEntry SET dataJson=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',(dumps(data),oid)); return data

def ensure_dataset(path,name,description,domain,origin,quality,row_count,size_mb):
    r=cur.execute('SELECT id FROM TestDataset WHERE path=?',(path,)).fetchone()
    vals=(name,description,domain,origin,'ready',row_count,size_mb,quality,'[]',utcnow())
    if r:
        cur.execute('UPDATE TestDataset SET name=?,description=?,domain=?,origin=?,status=?,rowCount=?,sizeMb=?,qualityScore=?,schemaJson=?,lastBuiltAt=? WHERE id=?', vals+(r[0],))
    else:
        cur.execute('INSERT INTO TestDataset(id,name,path,description,domain,origin,status,rowCount,sizeMb,qualityScore,schemaJson,lastBuiltAt,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('ds'),name,path)+vals[1:])

# 1) Evidence closure datasets (demonstration / synthetic)
ensure_dataset('raw/telemetry/F-2206-R2','raw_telemetry_F2206_R2','DEMO/SYNTHETIC: TE-25-002 归零后强干扰复试原始遥测','telemetry','raw',98,1864200,842.6)
ensure_dataset('raw/simulation/lvc-02','raw_sim_lvc02','DEMO/SYNTHETIC: TE-25-004 正式 LVC 联合任务 Run 原始事件流','simulation','raw',97,2840000,1280.4)
ensure_dataset('stg/evaluation/lvc-score-v2','stg_lvc_score_v2','DEMO/SYNTHETIC: 正式 LVC 任务线程评分与现实锚定结果','evaluation','derived',98,48000,26.2)
ensure_dataset('raw/simulation/dot-stress-v2','raw_sim_dot_stress_v2','DEMO/SYNTHETIC: SC-COA-01 5,000 次正式数字化高压 Run 输出','simulation','raw',99,5000000,2380.0)
ensure_dataset('stg/evaluation/metrics-stress-v2','stg_metrics_stress_v2','DEMO/SYNTHETIC: 5,000 次正式高压 Run 统计判读与不确定性汇总','evaluation','derived',99,125000,41.7)

# 2) Close live and LVC anchors as concrete Run instances.
new_runs={
'RUN-LIVE-002-02':('TE-25-002 强干扰归零后正式复试 Run',dict(code='RUN-LIVE-002-02',caseId='CASE-01',eventId='TE-25-002',scenarioId='SC-COA-01',executionMode='Live',status='已完成',configurationBaseline='CBL-TE002-2026.09.01-r4',replications=3,randomSeedPolicy='N/A',resourceSnapshot=['R-01@online','R-04@online','R-06@online'],modelSnapshot=['MD-02@CH-3.5'],inputDatasetRefs=['raw/environment/range-A'],outputDatasetRefs=['raw/telemetry/F-2206-R2'],modelDomainChecks=[{'model':'MD-02','inDomain':True,'reason':'复试覆盖 J/S 18–24 dB 与扩展组合干扰样式；均位于 CH-3.5 扩展验证域'}],anomalyRefs=[],formalEvidenceClass='正式证据',resultSummary='DEMO/SYNTHETIC：完成 3 组受控强干扰复试；故障归零后无 I 类停试，形成高压任务线程现实锚点。',operator='现场指挥 · 林晓东',startedAt='D+61 08:10',endedAt='D+61 16:40')),
'RUN-LVC-004-FRM-01':('TE-25-004 正式 LVC 联合任务 Run',dict(code='RUN-LVC-004-FRM-01',caseId='CASE-01',eventId='TE-25-004',scenarioId='SC-COA-01',executionMode='LVC',status='已完成',configurationBaseline='CBL-LVC-004-FRM-r2',replications=36,randomSeedPolicy='固定受控种子集 LVC-FRM-001..036',resourceSnapshot=['R-01@live-node','R-05@6-node-federation','R-06@threat-emulation'],modelSnapshot=['MD-01@FC-7.2','MD-02@CH-3.5','MD-05@RED-5.0','MD-07@DE-4.1'],inputDatasetRefs=['raw/telemetry/F-2206-R2','raw/environment/range-A'],outputDatasetRefs=['raw/simulation/lvc-02','stg/evaluation/lvc-score-v2'],modelDomainChecks=[{'model':'MD-01','inDomain':True,'reason':'飞行包线位于认可域'},{'model':'MD-02','inDomain':True,'reason':'强电磁组合样式位于 CH-3.5 扩展验证域'},{'model':'MD-05','inDomain':True,'reason':'红方模板使用在当前认可范围内'},{'model':'MD-07','inDomain':True,'reason':'Threat=4 已纳入 DE-4.1 验证与认可范围'}],anomalyRefs=[],formalEvidenceClass='正式证据',resultSummary='DEMO/SYNTHETIC：36 个正式 LVC 任务线程 Run 完成 S3/S4 多节点交互锚定，支持高压数字环境校准。',operator='LVC 总控席 · 刘晨',startedAt='D+63 09:00',endedAt='D+64 18:15')),
}
for pk,(title,data) in new_runs.items(): upsert_entry('TestRun',pk,title,data)

# 3) Expand and accredit models; STRICT-V1 remains untouched.
model_updates={
'MD-02':dict(version='CH-3.5',vvaStatus='已确认',verification='通过',validation='通过',accreditation='已认可',validationDomain='链路20–180km；J/S 0–25dB；5类已测/组合干扰（含 CASE-01 高压样式）',limitations=['180km以上仍不在认可域','新型未知认知干扰仍需单独评估'],liveDataRefs=['TE-25-002/F-2206','TE-25-002/F-2206-R2'],lastReviewed='D+65'),
'MD-07':dict(version='DE-4.1',vvaStatus='已确认',verification='通过',validation='通过',accreditation='已认可',validationDomain='威胁构型V4.1；威胁密度1–4级；CASE-01 固定/受控适应性交战规则',limitations=['威胁密度5级不在认可域'],liveDataRefs=['TE-25-004/LVC-AAR','TE-25-004/LVC-AAR-v2'],lastReviewed='D+65'),
'MD-08':dict(version='MT-1.3',vvaStatus='已确认',verification='通过',validation='通过',accreditation='已认可',validationDomain='MT-01；威胁1–4级；EW≤80%；兵力比0.8–1.2；复杂/恶劣天气',limitations=['Threat=5 或 EW>80% 需重新认可','不覆盖严重战损下任务重构'],liveDataRefs=['TE-25-002/F-2206-R2','TE-25-004/LVC-AAR-v2','TE-25-006/F-2208'],lastReviewed='D+65'),
}
for pk,patch in model_updates.items():
    update_entry('ModelAsset',pk,lambda d,p=patch:{**d,**p})

# 4) Execute planned 5,000-run digital batch. Result deliberately remains below performance threshold:
# evidence gate PASS means evidence is sufficient to conclude non-achievement, not performance pass.
upsert_entry('TestRun','RUN-DOT-S-02','高压验证域扩展后的 5,000 次正式数字化 Run',dict(code='RUN-DOT-S-02',caseId='CASE-01',eventId='TE-25-009',scenarioId='SC-COA-01',executionMode='Digital',status='已完成',configurationBaseline='CBL-DOT-009-STRESS-v2-FROZEN',replications=5000,randomSeedPolicy='受控种子 seed=300001..305000；清单随 Evidence Package 冻结',resourceSnapshot=['R-09@cluster-snapshot-20260902'],modelSnapshot=['MD-01@FC-7.2','MD-02@CH-3.5','MD-07@DE-4.1','MD-08@MT-1.3'],inputDatasetRefs=['raw/telemetry/F-2206-R2','raw/simulation/lvc-02','stg/evaluation/lvc-score-v2'],outputDatasetRefs=['raw/simulation/dot-stress-v2','stg/evaluation/metrics-stress-v2'],modelDomainChecks=[{'model':'MD-01','inDomain':True,'reason':'任务飞行包线位于 FC-7.2 认可域'},{'model':'MD-02','inDomain':True,'reason':'EW=75% 映射的 J/S 与组合干扰样式位于 CH-3.5 扩展认可域'},{'model':'MD-07','inDomain':True,'reason':'Threat=4 位于 DE-4.1 扩展认可域'},{'model':'MD-08','inDomain':True,'reason':'Threat=4、EW=75%、兵力比0.85 均位于 MT-1.3 认可域'}],anomalyRefs=[],formalEvidenceClass='正式证据',resultSummary='DEMO/SYNTHETIC：5,000 次正式高压 Run 任务成功率 83.2%，95% Wilson CI 82.1%–84.2%，低于 85% 鉴定门槛；高压孪生 NRMSE 6.8%。',operator='数字试验运行席 · 吴静',startedAt='D+66 08:30',endedAt='D+66 21:05'))

# 5) Close test events / scenario state.
def patch_event(pk,patch): update_entry('TestEvent',pk,lambda d:{**d,**patch})
patch_event('TE-25-002',{'status':'已完成','progress':100,'anomalyScore':0.12,'produces':['raw/telemetry/F-2206','raw/telemetry/F-2206-R2','raw/environment/range-A']})
patch_event('TE-25-004',{'status':'已完成','progress':100,'anomalyScore':0.04,'produces':['raw/simulation/lvc-01','stg/evaluation/lvc-score','raw/simulation/lvc-02','stg/evaluation/lvc-score-v2']})
patch_event('TE-25-009',{'status':'已完成','progress':100,'anomalyScore':0.03,'produces':['raw/simulation/dot-01','stg/evaluation/metrics','raw/simulation/dot-stress-v2','stg/evaluation/metrics-stress-v2']})
update_entry('TestScenario','SC-COA-01',lambda d:{**d,'status':'已批准/正式高压评估','models':['MD-01@FC-7.2','MD-02@CH-3.5','MD-07@DE-4.1','MD-08@MT-1.3'],'linkedEvents':['TE-25-002','TE-25-004','TE-25-009'],'assumptions':['CASE-01 正式高压鉴定场景','Threat=4 / EW=75% / Force Ratio=0.85 均已纳入本次模型认可适用域'],'runCount':5536})

# 5b) Update affected measures/deficiency and mission-thread closure state before freezing snapshots.
update_entry('Measure','M-13',lambda d:{**d,'measured':83.2,'status':'未达标','confidence':0.99})
update_entry('Measure','M-14',lambda d:{**d,'measured':6.8,'status':'达标','confidence':0.99})
update_entry('Deficiency','DF-25-01',lambda d:{**d,'status':'已归零/复试通过','closedAt':'D+61','closureEvidence':['RUN-LIVE-002-02','raw/telemetry/F-2206-R2'],'rootCause':'跳频驻留时间不足；已完成修正并通过受控强干扰复试（DEMO/SYNTHETIC）'})
def close_thread(d):
    steps=[]
    for x in d.get('steps',[]):
        y=dict(x)
        if y.get('id')=='S3': y['status']='covered'
        steps.append(y)
    return {**d,'steps':steps,'coverage':88,'status':'CASE-01 关键证据闭环完成','risks':['S2/S6 仍存在其他试验覆盖不足，但不阻塞本次 M-13 高压任务效能正式判定']}
update_entry('MissionThread','MT-01',close_thread)

# 6) Freeze Evidence Package V0.4. Required run is the formal 5,000-run batch; Live/LVC are explicit anchors.
manifest={
 'schema':'dtep/evidence-package-manifest/v1.5',
 'packageId':'EP-CASE01-M13-V0.4','version':'V0.4','scope':'SC-COA-01 Threat=4 / EW=75% 高威胁任务效能正式证据闭环',
 'runRefs':['RUN-LIVE-002-02','RUN-LVC-004-FRM-01','RUN-DOT-S-02'],
 'requiredRunRefs':['RUN-DOT-S-02'],
 'datasetRefs':['raw/telemetry/F-2206-R2','raw/simulation/lvc-02','stg/evaluation/lvc-score-v2','raw/simulation/dot-stress-v2','stg/evaluation/metrics-stress-v2'],
 'modelRefs':['MD-01','MD-02','MD-07','MD-08'],
 'modelSnapshot':{'MD-01':'FC-7.2/已认可','MD-02':'CH-3.5/已认可','MD-07':'DE-4.1/已认可','MD-08':'MT-1.3/已认可'},
 'scenarioRefs':['SC-COA-01'],'measureRefs':['M-13','M-14'],
 'liveAnchorRefs':['RUN-LIVE-002-02','RUN-LVC-004-FRM-01'],
 'ruleSetRef':'GRS-CASE01-STRICT-V1',
 'analysisSnapshot':{'missionSuccessPct':83.2,'thresholdPct':85.0,'ci95Pct':[82.1,84.2],'highStressTwinNrmsePct':6.8,'statisticalReady':True},
 'provenanceNote':'DEMO/SYNTHETIC prototype evidence used only to demonstrate state transition and governance mechanics.'
}

# Freeze full object/data/rule snapshots so later Ontology updates cannot retroactively
# alter the gate result for this package.
def snap(api, ids):
    tid=type_id(api); out=[]
    for pk in ids:
        row=cur.execute('SELECT pk,title,dataJson FROM ObjectEntry WHERE objectTypeId=? AND pk=?',(tid,pk)).fetchone()
        if not row: raise RuntimeError(f'missing snapshot ref {api}/{pk}')
        out.append({'pk':row[0],'title':row[1],'data':json.loads(row[2] or '{}')})
    return sorted(out,key=lambda x:x['pk'])
manifest['runSnapshots']=snap('TestRun',manifest['runRefs'])
manifest['modelSnapshots']=snap('ModelAsset',manifest['modelRefs'])
manifest['scenarioSnapshots']=snap('TestScenario',manifest['scenarioRefs'])
manifest['measureSnapshots']=snap('Measure',manifest['measureRefs'])
manifest['ruleSetSnapshot']=snap('EvidenceGateRuleSet',[manifest['ruleSetRef']])[0]
manifest['datasetSnapshots']=[]
for path in sorted(manifest['datasetRefs']):
    row=cur.execute('SELECT path,name,domain,origin,status,rowCount,sizeMb,qualityScore,schemaJson,lastBuiltAt FROM TestDataset WHERE path=?',(path,)).fetchone()
    if not row: raise RuntimeError(f'missing dataset snapshot {path}')
    manifest['datasetSnapshots'].append(dict(path=row[0],name=row[1],domain=row[2],origin=row[3],status=row[4],rowCount=row[5],sizeMb=row[6],qualityScore=row[7],schemaJson=row[8],lastBuiltAt=row[9]))

package={
 'code':'EP-CASE01-M13-V0.4','caseId':'CASE-01','version':'V0.4','scope':manifest['scope'],'status':'已冻结（正式鉴定候选）',
 'runRefs':manifest['runRefs'],'requiredRunRefs':manifest['requiredRunRefs'],'datasetRefs':manifest['datasetRefs'],'modelRefs':manifest['modelRefs'],'scenarioRefs':manifest['scenarioRefs'],'measureRefs':manifest['measureRefs'],'liveAnchorRefs':manifest['liveAnchorRefs'],
 'analysis':{'statisticalReady':True,'summary':'DEMO/SYNTHETIC：5,000 次正式高压 Run 成功率 83.2%（95% CI 82.1%–84.2%），门槛 85%；高压孪生 NRMSE 6.8%。','performanceDecision':'未达到 M-13 85% 要求'},
 'conclusionCandidate':'证据闭环已满足正式判定条件；在 SC-COA-01（Threat=4 / EW=75% / Force Ratio=0.85）条件下，M-13 任务成功率未达到 85% 鉴定要求。',
 'limitations':['结论仅适用于本 Evidence Package 冻结的 SC-COA-01 与已认可模型版本','Threat=5、EW>80% 或严重战损条件不在本结论适用范围','原型中的数值为 DEMO/SYNTHETIC，不代表真实装备试验结果'],
 'ruleSetRef':'GRS-CASE01-STRICT-V1','supersedes':'EP-CASE01-M13-V0.3','packageHash':sha(manifest),'frozenAt':'D+67 09:30','frozenBy':'试验总师 · 周衡','manifest':manifest,
 'gateDecision':'通过','gateEvaluatedAt':'D+67 10:00','lastGateEvaluation':{'decision':'通过','score':100,'hardFailures':[],'softFailures':[],'ruleSetId':'GRS-CASE01-STRICT-V1','assessmentMode':'正式准入评估','recordedAt':'D+67 10:00','performedBy':'鉴定规则委员会 · 孙立'}
}
upsert_entry('EvidencePackage','EP-CASE01-M13-V0.4','M-13 高威胁任务效能正式证据包 · V0.4',package)

# 7) Gate objects and Case final state. Gate pass = evidence sufficiency, performance conclusion = NOT MET.
update_entry('EvidenceGate','EG-M03',lambda d:{**d,'decision':'通过','blockers':[],'requiredEvidence':[],'lastEvaluated':'D+67','note':'DEMO/SYNTHETIC：归零复试与 LVC 锚点已完成。'})
update_entry('EvidenceGate','EG-M13',lambda d:{**d,'decision':'通过','blockers':[],'requiredEvidence':[],'lastEvaluated':'D+67','note':'Evidence Gate 通过表示证据足以形成正式结论；M-13 性能结论仍为未达到 85% 要求。'})

def final_case(d):
    runs=list(dict.fromkeys(list(d.get('runs',[]))+['RUN-LIVE-002-02','RUN-LVC-004-FRM-01','RUN-DOT-S-02']))
    eps=list(dict.fromkeys(list(d.get('evidencePackages',[]))+['EP-CASE01-M13-V0.4']))
    return {**d,'status':'正式结论已冻结','decision':'DEMO/SYNTHETIC：在冻结的 SC-COA-01（Threat=4、EW=75%、兵力比0.85）条件下，证据门控已通过；5,000 次正式数字化 Run 的任务成功率为 83.2%（95% CI 82.1%–84.2%），低于 M-13 85% 要求，因此正式性能结论为“未达到要求”。','nextActions':['将 M-13 未达标结论转入整改/能力提升闭环','保持 EP-CASE01-M13-V0.4、模型认可记录与 STRICT-V1 规则版本不可变归档','整改后如再次评价，创建新的 Case/证据包版本，不覆盖 V0.4'], 'runs':runs,'evidencePackages':eps,'finalEvidencePackage':'EP-CASE01-M13-V0.4','finalGateRuleSet':'GRS-CASE01-STRICT-V1','finalGateDecision':'通过','performanceDecision':'未达到要求','conclusionFrozenAt':'D+67 10:15','prototypeDataNotice':'本 Case 的 v1.5 补证数值为 DEMO/SYNTHETIC，仅用于演示数字化试验鉴定闭环。'}
update_entry('DigitalTestCase','CASE-01',final_case)

for api in ['TestRun','EvidencePackage','ModelAsset','EvidenceGate','DigitalTestCase']: refresh_count(api)
con.commit()
print('v1.5 migration applied:',DB)
for api in ['TestRun','EvidencePackage','EvidenceGateRuleSet']:
    tid=type_id(api); print(api,cur.execute('SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchone()[0])
print('EP-CASE01-M13-V0.4 hash:',package['packageHash'])
con.close()
