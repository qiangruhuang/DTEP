#!/usr/bin/env python3
import hashlib, json, sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; RULES=ROOT/'src'/'lib'/'case01-adjudication-rules.json'
def uid(p): return f'{p}_{uuid.uuid4().hex[:18]}'
def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(str(k),ensure_ascii=False,separators=(',',':'))+':'+stable(v[k]) for k in sorted(v))+'}'
    if v is True:return 'true'
    if v is False:return 'false'
    if v is None:return 'null'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()
def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r:return r[0]
    oid=uid('v20got'); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon)); return oid
def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone(); t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20glt'),api,display,s[0],t[0],'一对多'))
def ensure_entry(con,api,pk,title,data):
    oid=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()[0]
    if con.execute('select 1 from ObjectEntry where objectTypeId=? and pk=?',(oid,pk)).fetchone(): return
    con.execute('insert into ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) values(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('v20goe'),oid,pk,title,json.dumps(data,ensure_ascii=False,separators=(',',':'))))
def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]; con.execute('update ObjectType set objectCount=? where id=?',(n,oid))
def main():
    con=sqlite3.connect(DB)
    for api,display,desc,icon in [
      ('AdjudicationRuleSet','自动判读规则集','冻结 Canonical Event 到 Mission Thread / Measure 的选择器、公式、阈值方向与适用范围。','braces'),
      ('MissionStepObservation','任务线程步骤观测','由规范事件账本映射到 Mission Thread Step 的可追溯事实观测。','route'),
      ('MeasureObservation','指标观测值','由事件或批量汇总事件按冻结规则计算得到的单次 Run 指标观测。','ruler'),
      ('RunMeasureResult','Run指标判读','将 MeasureObservation 与阈值快照比较形成达标/未达标结果；性能结论与技术准入分离。','badge-check'),
      ('RunAdjudicationDecision','Run自动判读决定','一次 Run 的 Event-to-Measure 自动判读完整性与可签署状态。','gavel'),
      ('AdjudicationAction','自动判读动作','执行冻结规则集、生成指标观测和判读结果的追加式审计动作。','function-square'),
    ]: ensure_type(con,api,display,desc,icon)
    for spec in [
      ('adjudicationUsesReconstruction','自动判读—事件重建','RunAdjudicationDecision','RunEventReconstruction'),
      ('adjudicationUsesRuleSet','自动判读—规则集','RunAdjudicationDecision','AdjudicationRuleSet'),
      ('missionObservationUsesReconstruction','任务步骤观测—事件重建','MissionStepObservation','RunEventReconstruction'),
      ('measureObservationUsesRuleSet','指标观测—规则集','MeasureObservation','AdjudicationRuleSet'),
      ('measureObservationUsesReconstruction','指标观测—事件重建','MeasureObservation','RunEventReconstruction'),
      ('measureObservationTargetsMeasure','指标观测—指标','MeasureObservation','Measure'),
      ('runMeasureResultUsesObservation','Run指标判读—观测','RunMeasureResult','MeasureObservation'),
      ('runUsesMeasureResult','试验Run—指标判读','TestRun','RunMeasureResult'),
      ('runUsesAdjudicationDecision','试验Run—自动判读决定','TestRun','RunAdjudicationDecision'),
    ]: ensure_link(con,*spec)
    body=json.loads(RULES.read_text(encoding='utf-8')); data={**body,'publishedHash':sha(body)}
    ensure_entry(con,'AdjudicationRuleSet',body['code'],'CASE-01 Event-to-Measure 自动判读规则集 · v1',data)
    recount(con); con.commit(); con.close(); print('v2.0-G migration complete:',DB); print('AdjudicationRuleSet hash:',data['publishedHash'])
if __name__=='__main__': main()
