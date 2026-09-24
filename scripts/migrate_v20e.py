#!/usr/bin/env python3
import sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'
def uid(p): return f'{p}_{uuid.uuid4().hex[:18]}'
def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r:return r[0]
    oid=uid('v20eot'); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon)); return oid
def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone(); t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20elt'),api,display,s[0],t[0],'一对多'))
def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]; con.execute('update ObjectType set objectCount=? where id=?',(n,oid))
def main():
    con=sqlite3.connect(DB)
    ensure_type(con,'RunControlSession','试验运行控制会话','正式Run的运行中控制状态：启动、监控、暂停、恢复、中止、完成，以及控制策略和健康摘要。','activity')
    ensure_type(con,'RunHealthSnapshot','Run健康快照','运行中节点、时统、Topic、网关、数据落盘、资源等健康状态的不可变时间片。','heart-pulse')
    ensure_type(con,'RunControlAction','Run控制动作','运行中的Start/Pause/Resume/Abort/Remediate/PrepareComplete等受控动作与签署见证。','square-terminal')
    for spec in [
        ('runControlUsesEnvironment','运行控制—试验环境','RunControlSession','TestEnvironmentAssembly'),
        ('runControlUsesFederation','运行控制—LVC联邦','RunControlSession','LVCFederationConfiguration'),
        ('runControlHasHealthSnapshot','运行控制—健康快照','RunControlSession','RunHealthSnapshot'),
        ('runControlHasAction','运行控制—控制动作','RunControlSession','RunControlAction'),
        ('runUsesControlSession','试验Run—运行控制会话','TestRun','RunControlSession'),
    ]: ensure_link(con,*spec)
    recount(con); con.commit(); con.close(); print('v2.0-E migration complete:',DB)
if __name__=='__main__': main()
