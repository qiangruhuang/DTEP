#!/usr/bin/env python3
import sqlite3, uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'

def uid(prefix): return f'{prefix}_{uuid.uuid4().hex[:18]}'

def ensure_type(con,api,display,desc,icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r: return r[0]
    oid=uid('v20bot')
    con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(oid,api,display,desc,icon))
    return oid

def ensure_link(con,api,display,source_api,target_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(source_api,)).fetchone()
    t=con.execute('select id from ObjectType where apiName=?',(target_api,)).fetchone()
    if not s or not t: raise RuntimeError(f'missing link endpoint {source_api}->{target_api}')
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20blt'),api,display,s[0],t[0],'一对多'))

def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]
        con.execute('update ObjectType set objectCount=? where id=?',(n,oid))

def main():
    con=sqlite3.connect(DB)
    ensure_type(con,'TestModelAssembly','试验模型装配','面向某一试验场景冻结模型、数字样机3.0来源、接口契约与VV&A状态的模型装配对象。','boxes')
    for spec in [
        ('baselineInstantiatesAssembly','基地基线—试验模型装配','ModelBaseline','TestModelAssembly'),
        ('assemblyUsesArtifact','试验模型装配—3.0交付物','TestModelAssembly','ModelArtifact'),
        ('assemblyUsesModel','试验模型装配—试验模型','TestModelAssembly','ModelAsset'),
        ('assemblyUsesContract','试验模型装配—接口契约','TestModelAssembly','InterfaceContract'),
        ('scenarioUsesAssembly','试验场景—模型装配','TestScenario','TestModelAssembly'),
        ('runUsesAssembly','试验Run—模型装配','TestRun','TestModelAssembly'),
        ('runUsesPrototypeBaseline','试验Run—数字样机基地基线','TestRun','ModelBaseline'),
    ]: ensure_link(con,*spec)
    recount(con); con.commit(); con.close()
    print('v2.0-B migration complete:',DB)

if __name__=='__main__': main()
