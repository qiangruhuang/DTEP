#!/usr/bin/env python3
import hashlib
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'db' / 'custom.db'

def uid(prefix='v14'):
    return f"{prefix}_{uuid.uuid4().hex[:24]}"

def dumps(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

def stable(v):
    if isinstance(v, list):
        return '[' + ','.join(stable(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + stable(v[k]) for k in sorted(v)) + '}'
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

def sha(v):
    return 'sha256:' + hashlib.sha256(stable(v).encode()).hexdigest()

def now():
    return datetime.now(timezone.utc).isoformat()

con = sqlite3.connect(DB)
con.execute('PRAGMA foreign_keys=ON')
cur = con.cursor()

def type_id(api):
    row = cur.execute('SELECT id FROM ObjectType WHERE apiName=?', (api,)).fetchone()
    return row[0] if row else None

def ensure_type(api, display, desc, icon, props):
    tid = type_id(api)
    if not tid:
        tid = uid('ot')
        cur.execute('INSERT INTO ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)', (tid,api,display,desc,icon,0))
    else:
        cur.execute('UPDATE ObjectType SET displayName=?,description=?,icon=? WHERE id=?', (display,desc,icon,tid))
    for api_name, display_name, data_type in props:
        found = cur.execute('SELECT id FROM PropertyDef WHERE objectTypeId=? AND apiName=?', (tid,api_name)).fetchone()
        if not found:
            cur.execute('INSERT INTO PropertyDef(id,objectTypeId,apiName,displayName,dataType,description,isDerived) VALUES(?,?,?,?,?,?,0)', (uid('pd'),tid,api_name,display_name,data_type,''))
    return tid

def ensure_link(api, display, source_api, target_api, cardinality):
    if cur.execute('SELECT 1 FROM LinkType WHERE apiName=?', (api,)).fetchone(): return
    cur.execute('INSERT INTO LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) VALUES(?,?,?,?,?,?)', (uid('ln'),api,display,type_id(source_api),type_id(target_api),cardinality))

def ensure_action(api, display, object_api, params, desc):
    tid=type_id(object_api)
    row=cur.execute('SELECT id FROM ActionType WHERE apiName=?',(api,)).fetchone()
    if row:
        cur.execute('UPDATE ActionType SET displayName=?,objectTypeId=?,parametersJson=?,description=? WHERE id=?',(display,tid,dumps(params),desc,row[0]))
    else:
        cur.execute('INSERT INTO ActionType(id,apiName,displayName,objectTypeId,parametersJson,description,status) VALUES(?,?,?,?,?,?,?)',(uid('at'),api,display,tid,dumps(params),desc,'active'))

def upsert_entry(api, pk, title, data):
    tid=type_id(api)
    row=cur.execute('SELECT id FROM ObjectEntry WHERE objectTypeId=? AND pk=?',(tid,pk)).fetchone()
    if row:
        cur.execute('UPDATE ObjectEntry SET title=?,dataJson=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',(title,dumps(data),row[0]))
    else:
        cur.execute('INSERT INTO ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('oe'),tid,pk,title,dumps(data)))

def refresh_count(api):
    tid=type_id(api)
    count=cur.execute('SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchone()[0]
    cur.execute('UPDATE ObjectType SET objectCount=? WHERE id=?',(count,tid))

run_props = [
('code','Run 编号','string'),('caseId','所属 Case','string'),('eventId','试验事件','string'),('scenarioId','试验场景','string'),('executionMode','执行模式','string'),('status','Run 状态','string'),('configurationBaseline','配置基线','string'),('replications','重复次数','integer'),('randomSeedPolicy','随机种子策略','string'),('resourceSnapshot','资源快照','json'),('modelSnapshot','模型快照','json'),('inputDatasetRefs','输入数据','json'),('outputDatasetRefs','输出数据','json'),('modelDomainChecks','模型-场景适用域检查','json'),('anomalyRefs','异常/缺陷','json'),('formalEvidenceClass','证据用途','string'),('resultSummary','结果摘要','string'),('operator','执行席位','string'),('startedAt','开始时间','string'),('endedAt','结束时间','string')]
package_props = [
('code','证据包编号','string'),('caseId','所属 Case','string'),('version','版本','string'),('scope','证据范围','string'),('status','状态','string'),('runRefs','Run 清单','json'),('requiredRunRefs','结论所需 Run','json'),('datasetRefs','数据清单','json'),('modelRefs','模型/VV&A 清单','json'),('scenarioRefs','场景清单','json'),('measureRefs','指标清单','json'),('liveAnchorRefs','实测/LVC 锚点','json'),('analysis','分析与不确定性','json'),('conclusionCandidate','结论候选','string'),('limitations','适用边界','json'),('ruleSetRef','门控规则集','string'),('supersedes','替代版本','string'),('packageHash','证据包哈希','string'),('frozenAt','冻结时间','string'),('frozenBy','冻结人','string'),('manifest','冻结清单快照','json'),('gateDecision','最近门控判定','string'),('gateEvaluatedAt','最近门控时间','string'),('lastGateEvaluation','最近门控快照','json')]
rule_props = [
('code','规则集编号','string'),('caseId','适用 Case','string'),('name','规则集名称','string'),('version','版本','string'),('scope','适用范围','string'),('status','状态','string'),('purpose','用途','string'),('rules','规则定义','json'),('decisionPolicy','决策策略','json'),('owner','规则负责人','string'),('updatedAt','更新时间','string'),('versionNote','版本说明','string'),('parentRuleSetRef','派生自规则集','string'),('publishedAt','发布时间','string'),('publishedBy','发布人','string'),('publishedHash','发布哈希','string')]

ensure_type('TestRun','Run 实例','一次可重放、可审计的具体试验执行实例：冻结场景、模型、资源、输入、随机种子、配置基线、输出、异常和证据用途','play-circle',run_props)
ensure_type('EvidencePackage','Evidence Package 证据包','围绕一个鉴定判断冻结的证据清单与快照：包含 Run、数据、模型/VV&A、场景、指标、分析、限制、审批、版本和完整性哈希','archive',package_props)
ensure_type('EvidenceGateRuleSet','Evidence Gate 规则集','可配置的证据准入规则集：把规则、硬/软级别、阈值和适用目的从前端代码中分离，并通过受控 Action 变更','sliders-horizontal',rule_props)

for x in [
('caseHasRun','Case 包含 Run','DigitalTestCase','TestRun','一对多'),('eventHasRun','试验事件实例化为 Run','TestEvent','TestRun','一对多'),('runUsesScenario','Run 使用场景快照','TestRun','TestScenario','多对一'),('runUsesModel','Run 使用模型快照','TestRun','ModelAsset','多对多'),('caseHasEvidencePackage','Case 形成证据包','DigitalTestCase','EvidencePackage','一对多'),('packageContainsRun','证据包包含 Run','EvidencePackage','TestRun','多对多'),('packageControlledByRuleSet','证据包使用门控规则集','EvidencePackage','EvidenceGateRuleSet','多对一'),('packageSupportsGate','证据包支撑证据门控','EvidencePackage','EvidenceGate','多对多')]:
    ensure_link(*x)

ensure_action('freezeEvidencePackage','冻结 Evidence Package','EvidencePackage',[{'name':'packageId','type':'string','required':True,'label':'证据包'},{'name':'frozenBy','type':'string','required':True,'label':'冻结人'}],'验证全部证据引用后冻结 Run/数据/模型/场景/指标/规则集快照并生成 SHA-256 哈希；冻结并不等于证据门控通过。')
ensure_action('configureGateRuleSet','配置 Evidence Gate 规则集','EvidenceGateRuleSet',[{'name':'ruleId','type':'string','required':False,'label':'规则'},{'name':'operation','type':'string','required':True,'label':'操作'}],'已发布规则禁止原地修改；通过派生草案、修改和发布形成受控规则版本，所有变更写入 Action Log。')
ensure_action('evaluateEvidencePackage','记录 Evidence Gate 正式判定','EvidencePackage',[{'name':'ruleSetId','type':'string','required':True,'label':'规则集版本'},{'name':'decision','type':'string','required':True,'label':'门控判定'}],'仅对已冻结证据包、且使用其绑定的已发布规则集记录正式门控判定；结果写回证据包并保留 Action Log。')

runs = {
'RUN-LIVE-002-01': ('TE-25-002 强干扰实测 Run · 暂停前片段', dict(code='RUN-LIVE-002-01',caseId='CASE-01',eventId='TE-25-002',scenarioId='SC-BASE',executionMode='Live',status='异常终止',configurationBaseline='CBL-TE002-2026.08.14-r3',replications=1,randomSeedPolicy='N/A',resourceSnapshot=['R-01@online','R-04@online','R-06@maintenance-after-run'],modelSnapshot=['MD-02@CH-3.4'],inputDatasetRefs=['raw/environment/range-A'],outputDatasetRefs=['raw/telemetry/F-2206'],modelDomainChecks=[{'model':'MD-02','inDomain':True,'reason':'链路 20–180 km、J/S≤18 dB，位于当前验证域内'}],anomalyRefs=['DF-25-01'],formalEvidenceClass='部分实测锚点',resultSummary='J/S 约 15 dB 后出现偶发失锁；Run 因 I 类缺陷触发停试，强干扰后段未完成。',operator='现场指挥 · 林晓东',startedAt='D+14 08:20',endedAt='D+14 10:46')),
'RUN-LVC-004-REH-01': ('TE-25-004 LVC 联合任务环境预演 Run', dict(code='RUN-LVC-004-REH-01',caseId='CASE-01',eventId='TE-25-004',scenarioId='SC-BASE',executionMode='LVC',status='预演完成',configurationBaseline='CBL-LVC-004-REH-r1',replications=12,randomSeedPolicy='固定种子集 LVC-REH-01..12',resourceSnapshot=['R-01@live-node','R-05@6-node-federation','R-06@threat-emulation'],modelSnapshot=['MD-01@FC-7.2','MD-02@CH-3.4','MD-05@RED-5.0'],inputDatasetRefs=['raw/environment/range-A'],outputDatasetRefs=['raw/simulation/lvc-01','stg/evaluation/lvc-score'],modelDomainChecks=[{'model':'MD-01','inDomain':True,'reason':'飞行包线在当前认可域'},{'model':'MD-02','inDomain':True,'reason':'干扰样式属于 3 类已测样式'},{'model':'MD-05','inDomain':True,'reason':'采用认可的预定义红方战术模板'}],anomalyRefs=[],formalEvidenceClass='预演/不可替代正式 Run',resultSummary='完成跨 6 节点时统、接口与任务线程联调；仅验证试验环境可执行性，不作为正式效能证据。',operator='LVC 总控席 · 刘晨',startedAt='D+39 13:10',endedAt='D+39 17:35')),
'RUN-DOT-B-01': ('TE-25-009 基线数字化批次 Run', dict(code='RUN-DOT-B-01',caseId='CASE-01',eventId='TE-25-009',scenarioId='SC-BASE',executionMode='Digital',status='已完成',configurationBaseline='CBL-DOT-009-BASE-v1',replications=1200,randomSeedPolicy='seed=100001..101200',resourceSnapshot=['R-09@cluster-snapshot-20260829'],modelSnapshot=['MD-01@FC-7.2','MD-07@DE-4.0','MD-08@MT-1.2'],inputDatasetRefs=['raw/simulation/twin-F-2207'],outputDatasetRefs=['raw/simulation/dot-01','stg/evaluation/metrics'],modelDomainChecks=[{'model':'MD-01','inDomain':True,'reason':'基线飞行包线在认可域内'},{'model':'MD-07','inDomain':True,'reason':'Threat=3 位于当前已验证 1–3 级范围'},{'model':'MD-08','inDomain':True,'reason':'Threat=3、EW=45%、兵力比1.0，位于当前验证域'}],anomalyRefs=[],formalEvidenceClass='条件使用',resultSummary='1,200 次基线批次任务成功率 91.6%，孪生一致性 NRMSE 6.2%；场景在验证域内，但 MD-07/08 尚未完成正式认可。',operator='数字试验运行席 · 吴静',startedAt='D+54 09:00',endedAt='D+54 13:26')),
'RUN-DOT-S-01': ('TE-25-009 高威胁压力数字化批次 Run', dict(code='RUN-DOT-S-01',caseId='CASE-01',eventId='TE-25-009',scenarioId='SC-COA-01',executionMode='Digital',status='已完成',configurationBaseline='CBL-DOT-009-STRESS-v1',replications=500,randomSeedPolicy='seed=200001..200500',resourceSnapshot=['R-09@cluster-snapshot-20260830'],modelSnapshot=['MD-01@FC-7.2','MD-02@CH-3.4','MD-07@DE-4.0','MD-08@MT-1.2'],inputDatasetRefs=['raw/simulation/twin-F-2207'],outputDatasetRefs=['raw/simulation/dot-01','stg/evaluation/metrics'],modelDomainChecks=[{'model':'MD-01','inDomain':True,'reason':'飞行包线仍位于认可域'},{'model':'MD-02','inDomain':False,'reason':'候选场景包含超出现有 3 类已测样式的高强度组合干扰'},{'model':'MD-07','inDomain':False,'reason':'Threat=4 超出已验证 1–3 级范围'},{'model':'MD-08','inDomain':False,'reason':'Threat=4 且 EW=75% > 当前验证域 EW≤60%'}],anomalyRefs=[],formalEvidenceClass='探索性/不可进入正式结论',resultSummary='500 次高压批次任务成功率 82.4%，高压段 NRMSE 一度 9.1%；结果用于定位补试区域，不可直接支撑正式高威胁鉴定结论。',operator='数字试验运行席 · 吴静',startedAt='D+55 08:40',endedAt='D+55 11:02')),
'RUN-DOT-S-02': ('高压验证域扩展后的 5,000 次正式重跑', dict(code='RUN-DOT-S-02',caseId='CASE-01',eventId='TE-25-009',scenarioId='SC-COA-01',executionMode='Digital',status='待执行',configurationBaseline='CBL-DOT-009-STRESS-v2-PENDING',replications=5000,randomSeedPolicy='预生成受控种子清单；待 VV&A 认可后锁定',resourceSnapshot=['R-09@pending'],modelSnapshot=['MD-01@FC-7.2','MD-02@CH-3.5-pending','MD-07@DE-4.1-pending','MD-08@MT-1.3-pending'],inputDatasetRefs=[],outputDatasetRefs=[],modelDomainChecks=[],anomalyRefs=[],formalEvidenceClass='计划正式补证 Run',resultSummary='仅创建 Run 计划；必须在 MD-02/07/08 高压验证域扩展和认可完成后才能冻结配置并执行。',operator='数字试验运行席 · 待排班',startedAt=None,endedAt=None)),
}
for pk,(title,data) in runs.items(): upsert_entry('TestRun',pk,title,data)

strict_rules = [
{'id':'runCoverage','label':'要求 Run 覆盖','type':'runCoverage','enabled':True,'severity':'hard','params':{'minRuns':1},'rationale':'证据包必须引用可解析的实际执行实例，而非仅引用 TestEvent 计划。'},
{'id':'formalEvidenceEligibility','label':'Run 正式证据资格','type':'formalEvidenceEligibility','enabled':True,'severity':'hard','params':{'acceptedClasses':['正式证据','条件使用']},'rationale':'正式鉴定不能把明确标记为探索、预演、部分锚点或计划状态的 Run 直接升级为正式证据。'},
{'id':'datasetQuality','label':'数据质量与血缘','type':'datasetQuality','enabled':True,'severity':'soft','params':{'minQuality':90},'rationale':'引用数据集必须存在，且质量分达到本规则集门槛。'},
{'id':'runMaturity','label':'Run 执行成熟度','type':'runMaturity','enabled':True,'severity':'hard','params':{'acceptedStatuses':['已完成','数据分析中']},'rationale':'正式结论所需 Run 不能仍处于计划、暂停或异常终止状态。'},
{'id':'packageIntegrity','label':'Evidence Package 完整性冻结','type':'packageIntegrity','enabled':True,'severity':'hard','params':{},'rationale':'正式门控针对不可变证据快照执行，避免评审过程中证据悄然漂移。'},
{'id':'modelIntendedUse','label':'模型 Intended Use','type':'modelIntendedUse','enabled':True,'severity':'hard','params':{},'rationale':'数字模型必须明确本次试验用途。'},
{'id':'modelValidationDomain','label':'模型 Validation Domain','type':'modelValidationDomain','enabled':True,'severity':'hard','params':{},'rationale':'模型-场景适用域检查必须逐 Run 留痕。'},
{'id':'modelAccreditation','label':'关键模型认可状态','type':'modelAccreditation','enabled':True,'severity':'hard','params':{'accepted':['已认可','有条件认可']},'rationale':'关键数字模型的认可状态必须满足正式证据用途。'},
{'id':'liveAnchor','label':'Live/LVC 现实锚点','type':'liveAnchor','enabled':True,'severity':'hard','params':{'minAnchors':1},'rationale':'依赖 LVC/纯数字证据的正式任务级结论至少需要一个完成的现实/LVC 锚点。'},
{'id':'statisticalReadiness','label':'统计可判定性','type':'statisticalReadiness','enabled':True,'severity':'soft','params':{},'rationale':'必须登记结果、不确定性及可判定状态。'}]
explore_rules = [
{'id':'runCoverage','label':'要求 Run 覆盖','type':'runCoverage','enabled':True,'severity':'hard','params':{'minRuns':1},'rationale':'探索结论仍必须来自明确 Run。'},
{'id':'formalEvidenceEligibility','label':'Run 正式证据资格','type':'formalEvidenceEligibility','enabled':True,'severity':'soft','params':{'acceptedClasses':['正式证据','条件使用']},'rationale':'探索分析允许使用非正式 Run，但必须显式降级，不得混同为正式证据。'},
{'id':'datasetQuality','label':'数据质量与血缘','type':'datasetQuality','enabled':True,'severity':'soft','params':{'minQuality':80},'rationale':'探索分析允许较低质量门槛，但必须显示限制。'},
{'id':'runMaturity','label':'Run 执行成熟度','type':'runMaturity','enabled':True,'severity':'soft','params':{'acceptedStatuses':['已完成','数据分析中','预演完成','异常终止']},'rationale':'允许使用部分/异常 Run 发现风险，不等同正式证据。'},
{'id':'packageIntegrity','label':'Evidence Package 完整性冻结','type':'packageIntegrity','enabled':True,'severity':'soft','params':{},'rationale':'探索时可对草稿包执行评估，但结果必须标记未冻结。'},
{'id':'modelIntendedUse','label':'模型 Intended Use','type':'modelIntendedUse','enabled':True,'severity':'hard','params':{},'rationale':'即使探索分析也必须知道模型用于什么。'},
{'id':'modelValidationDomain','label':'模型 Validation Domain','type':'modelValidationDomain','enabled':True,'severity':'soft','params':{},'rationale':'允许验证域外运行用于识别补试区，但必须显式降级。'},
{'id':'modelAccreditation','label':'关键模型认可状态','type':'modelAccreditation','enabled':True,'severity':'soft','params':{'accepted':['已认可','有条件认可']},'rationale':'探索分析可使用待认可模型，但不能升级为正式结论。'},
{'id':'liveAnchor','label':'Live/LVC 现实锚点','type':'liveAnchor','enabled':True,'severity':'soft','params':{'minAnchors':1},'rationale':'缺少现实锚点时只允许形成补试假设。'},
{'id':'statisticalReadiness','label':'统计可判定性','type':'statisticalReadiness','enabled':True,'severity':'soft','params':{},'rationale':'未冻结统计结果应显示为软缺口。'}]
policy={'hardFailure':'阻塞','softFailure':'有条件通过','allPass':'通过'}
for pk,title,name,version,scope,purpose,rules,owner in [
('GRS-CASE01-STRICT-V1','CASE-01 正式鉴定证据准入规则集','CASE-01 正式鉴定证据准入规则集','1.0','CASE-01 · 可进入正式鉴定结论的 Evidence Package','formal',strict_rules,'鉴定规则委员会 · 孙立'),
('GRS-CASE01-EXPLORE-V1','CASE-01 探索分析规则集','CASE-01 探索分析规则集','1.0','CASE-01 · 方案探索与补试设计，不得作为正式鉴定准入规则','exploratory',explore_rules,'数字试验方法组 · 何斌')]:
    published={'scope':scope,'purpose':purpose,'version':version,'rules':rules,'decisionPolicy':policy}
    data=dict(code=pk,caseId='CASE-01',name=name,version=version,scope=scope,status='已发布/原型',purpose=purpose,rules=rules,decisionPolicy=policy,owner=owner,updatedAt='D+57',versionNote='v1.4 受控规则版本；已发布版本不可原地修改。',parentRuleSetRef=None,publishedAt='D+57',publishedBy=owner,publishedHash=sha(published))
    upsert_entry('EvidenceGateRuleSet',pk,title,data)

baseline_manifest = dict(schema='dtep/evidence-package-manifest/v1-seed',packageId='EP-CASE01-M13-V0.2',version='V0.2',scope='MT-01 基线/中等威胁数字化任务效能阶段证据',runRefs=['RUN-DOT-B-01'],datasetRefs=['raw/simulation/dot-01','stg/evaluation/metrics'],modelRefs=['MD-01','MD-07','MD-08'],scenarioRefs=['SC-BASE'],measureRefs=['M-13','M-14'],ruleSetRef='GRS-CASE01-STRICT-V1',note='种子数据冻结快照；通过哈希验证不可变性。正式冻结动作会保存完整 Run/数据/模型/场景/规则集快照。')
packages = {
'EP-CASE01-M03-V0.2': ('M-03 强干扰数据链证据包', dict(code='EP-CASE01-M03-V0.2',caseId='CASE-01',version='V0.2',scope='M-03 数据链作用距离与强干扰任务线程锚点',status='草稿/待补证',runRefs=['RUN-LIVE-002-01'],requiredRunRefs=['RUN-LIVE-002-01'],datasetRefs=['raw/telemetry/F-2206','raw/environment/range-A'],modelRefs=['MD-02'],scenarioRefs=['SC-BASE'],measureRefs=['M-03'],liveAnchorRefs=['RUN-LIVE-002-01'],analysis={'statisticalReady':False,'summary':'强干扰后段未完成，当前只能形成部分数据链退化证据'},conclusionCandidate='现有 Run 足以确认强干扰下存在失锁风险，但不足以冻结 M-03 全域正式结论。',limitations=['TE-25-002 因 I 类缺陷异常终止','缺少归零后的受控强干扰复试'],ruleSetRef='GRS-CASE01-STRICT-V1',supersedes=None,packageHash=None,frozenAt=None,frozenBy=None,manifest=None,gateDecision=None,gateEvaluatedAt=None,lastGateEvaluation=None)),
'EP-CASE01-M13-V0.2': ('M-13 基线数字化任务效能阶段证据包', dict(code='EP-CASE01-M13-V0.2',caseId='CASE-01',version='V0.2',scope='MT-01 基线/中等威胁数字化任务效能阶段证据',status='已冻结（限定用途）',runRefs=['RUN-DOT-B-01'],requiredRunRefs=['RUN-DOT-B-01'],datasetRefs=['raw/simulation/dot-01','stg/evaluation/metrics'],modelRefs=['MD-01','MD-07','MD-08'],scenarioRefs=['SC-BASE'],measureRefs=['M-13','M-14'],liveAnchorRefs=[],analysis={'statisticalReady':True,'summary':'基线 1,200 次任务成功率 91.6%；NRMSE 6.2%'},conclusionCandidate='仅可作为基线条件下阶段性数字证据快照，不得外推 Threat=4 / EW=75% 条件。',limitations=['MD-07/08 尚未完成正式认可','缺少对应任务级 Live/LVC 锚点'],ruleSetRef='GRS-CASE01-STRICT-V1',supersedes=None,packageHash=sha(baseline_manifest),frozenAt='D+55 14:10',frozenBy='试验总师 · 周衡',manifest=baseline_manifest,gateDecision=None,gateEvaluatedAt=None,lastGateEvaluation=None)),
'EP-CASE01-M13-V0.3': ('M-13 高威胁任务效能候选证据包', dict(code='EP-CASE01-M13-V0.3',caseId='CASE-01',version='V0.3',scope='SC-COA-01 Threat=4 / EW=75% 高威胁任务效能候选结论',status='草稿/门控前',runRefs=['RUN-DOT-B-01','RUN-DOT-S-01'],requiredRunRefs=['RUN-DOT-S-01'],datasetRefs=['raw/simulation/dot-01','stg/evaluation/metrics'],modelRefs=['MD-01','MD-02','MD-07','MD-08'],scenarioRefs=['SC-BASE','SC-COA-01'],measureRefs=['M-13','M-14'],liveAnchorRefs=[],analysis={'statisticalReady':True,'summary':'高压 500 次任务成功率 82.4%，低于 85% 门槛；高压 NRMSE 一度 9.1%'},conclusionCandidate='高压候选结果提示任务成功率低于门槛，但由于验证域、认可与实测锚点缺口，当前只能形成“需要补证”的风险判断。',limitations=['MD-02/07/08 存在验证域外使用','MD-02/07/08 尚未满足正式认可要求','缺少已完成的任务级 Live/LVC 锚点'],ruleSetRef='GRS-CASE01-STRICT-V1',supersedes='EP-CASE01-M13-V0.2',packageHash=None,frozenAt=None,frozenBy=None,manifest=None,gateDecision=None,gateEvaluatedAt=None,lastGateEvaluation=None))}
for pk,(title,data) in packages.items(): upsert_entry('EvidencePackage',pk,title,data)

# Bind new execution objects to CASE-01.
case_tid=type_id('DigitalTestCase')
row=cur.execute("SELECT id,dataJson FROM ObjectEntry WHERE objectTypeId=? AND pk='CASE-01'",(case_tid,)).fetchone()
if row:
    d=json.loads(row[1] or '{}')
    d['runs']=list(runs)
    d['evidencePackages']=list(packages)
    d['gateRuleSet']='GRS-CASE01-STRICT-V1'
    cur.execute('UPDATE ObjectEntry SET dataJson=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',(dumps(d),row[0]))

for api in ['TestRun','EvidencePackage','EvidenceGateRuleSet']:
    refresh_count(api)

con.commit()
print('v1.4 migration applied:', DB)
for api in ['TestRun','EvidencePackage','EvidenceGateRuleSet']:
    tid=type_id(api); print(api,cur.execute('SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchone()[0])
con.close()
