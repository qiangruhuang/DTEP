#!/usr/bin/env python3
import sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'

def uid(prefix): return f'{prefix}_{uuid.uuid4().hex[:18]}'
def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r:return r[0]
    oid=uid('v20cot')
    con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon))
    return oid
def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone(); t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20clt'),api,display,s[0],t[0],'一对多'))
def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]
        con.execute('update ObjectType set objectCount=? where id=?',(n,oid))
def main():
    con=sqlite3.connect(DB)
    ensure_type(con,'TestEnvironmentAssembly','试验环境装配','冻结一次数字/LVC/实装试验所需模型装配、Live/Virtual/Constructive节点、网关、时统、IDL Topic、网络与场区资源。','network')
    ensure_type(con,'LVCFederationConfiguration','LVC联合试验联邦配置','面向LVC联合试验冻结联邦节点、协议网关、时间管理、数据对象Topic Set与运行控制规则。','radio')
    for spec in [
        ('modelAssemblyFeedsEnvironment','模型装配—试验环境装配','TestModelAssembly','TestEnvironmentAssembly'),
        ('environmentUsesFederation','试验环境装配—LVC联邦配置','TestEnvironmentAssembly','LVCFederationConfiguration'),
        ('scenarioUsesEnvironment','试验场景—试验环境装配','TestScenario','TestEnvironmentAssembly'),
        ('runUsesEnvironment','试验Run—试验环境装配','TestRun','TestEnvironmentAssembly'),
        ('runUsesFederation','试验Run—LVC联邦配置','TestRun','LVCFederationConfiguration'),
        ('federationUsesContract','LVC联邦配置—接口契约','LVCFederationConfiguration','InterfaceContract'),
    ]: ensure_link(con,*spec)
    recount(con); con.commit(); con.close(); print('v2.0-C migration complete:',DB)
if __name__=='__main__': main()
