#!/usr/bin/env python3
import sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'
def uid(p): return f'{p}_{uuid.uuid4().hex[:18]}'
def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r:return r[0]
    oid=uid('v20fot'); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon)); return oid
def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone(); t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20flt'),api,display,s[0],t[0],'一对多'))
def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]; con.execute('update ObjectType set objectCount=? where id=?',(n,oid))
def main():
    con=sqlite3.connect(DB)
    ensure_type(con,'RunEventReconstruction','Run事件重建','将实装遥测、IDL Topic、模型/Gateway事件、Run Control动作和统一时钟归并为可回放的时间对齐事件账本。','list-tree')
    ensure_type(con,'RunDataQualityAssessment','Run数据质量评估','对事件重建执行完整性、时间一致性、重复/乱序、数据缺口和因果链连续性检查，形成正式证据准入判定。','scan-search')
    ensure_type(con,'RunDataQualityAction','Run数据质量动作','事件重建、校时、去重和重建等技术处置的追加式审计动作。','git-compare-arrows')
    for spec in [
        ('reconstructionUsesRunControl','事件重建—Run控制','RunEventReconstruction','RunControlSession'),
        ('qualityAssessesReconstruction','数据质量—事件重建','RunDataQualityAssessment','RunEventReconstruction'),
        ('qualityActionTargetsReconstruction','数据质量动作—事件重建','RunDataQualityAction','RunEventReconstruction'),
        ('runUsesEventReconstruction','试验Run—事件重建','TestRun','RunEventReconstruction'),
        ('runUsesDataQualityAssessment','试验Run—数据质量评估','TestRun','RunDataQualityAssessment'),
    ]: ensure_link(con,*spec)
    recount(con); con.commit(); con.close(); print('v2.0-F migration complete:',DB)
if __name__=='__main__': main()
