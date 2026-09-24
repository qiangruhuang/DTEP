#!/usr/bin/env python3
import sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'
def uid(p): return f'{p}_{uuid.uuid4().hex[:18]}'
def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r:return r[0]
    oid=uid('v20dot'); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon)); return oid
def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone(); t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20dlt'),api,display,s[0],t[0],'一对多'))
def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]; con.execute('update ObjectType set objectCount=? where id=?',(n,oid))
def main():
    con=sqlite3.connect(DB)
    ensure_type(con,'TestReadinessReview','试验就绪审查','正式Run前对模型装配、环境装配、资源、输入、数据落盘、网络安全和可重复性进行冻结审查。','clipboard-check')
    ensure_type(con,'FederationReadinessReview','联邦就绪审查','LVC正式Run前对联邦节点、协议网关、时统、IDL Topic、Reset和数据捕获进行冻结审查。','radio-tower')
    for spec in [
        ('readinessUsesModelAssembly','就绪审查—模型装配','TestReadinessReview','TestModelAssembly'),
        ('readinessUsesEnvironment','就绪审查—环境装配','TestReadinessReview','TestEnvironmentAssembly'),
        ('federationReadinessUsesFederation','联邦就绪审查—联邦配置','FederationReadinessReview','LVCFederationConfiguration'),
        ('runUsesTestReadiness','试验Run—试验就绪审查','TestRun','TestReadinessReview'),
        ('runUsesFederationReadiness','试验Run—联邦就绪审查','TestRun','FederationReadinessReview'),
    ]: ensure_link(con,*spec)
    recount(con); con.commit(); con.close(); print('v2.0-D migration complete:',DB)
if __name__=='__main__': main()
