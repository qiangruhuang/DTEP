#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import base64, json, os, shutil, sqlite3, statistics, subprocess, sys, tempfile, time, urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUT_JSON=ROOT/'PERFORMANCE_v2.1.1.json'; OUT_MD=ROOT/'PERFORMANCE_v2.1.1.md'

def pct(a,q):
    s=sorted(a); return s[min(len(s)-1,max(0,int((len(s)*q+0.999999)//1)-1))]

def post_json(url,obj,token=None):
    data=json.dumps(obj).encode(); headers={'Content-Type':'application/json'}
    if token: headers['Authorization']=f'Bearer {token}'
    req=urllib.request.Request(url,data=data,headers=headers,method='POST')
    with urllib.request.urlopen(req,timeout=15) as r:return json.loads(r.read())

def signer_bench(n=200):
    times=[]; valid=0
    for i in range(n):
        payload={'caseId':'CASE-01','stepId':'perf','phase':'control','actorId':'ACT-LIU','roleId':'lvc-controller','signedAt':f'2026-09-04T00:00:{i%60:02d}Z','subjectDigest':f'sha256:{i:064x}'}
        t=time.perf_counter(); x=post_json('http://127.0.0.1:8092/sign',{'actorId':'ACT-LIU','payload':payload},'engineering-only-token'); times.append((time.perf_counter()-t)*1000)
        if x.get('scheme')=='ED25519-DETACHED-v1' and x.get('signatureValue'):valid+=1
    return {'test':'remote-signing-service','iterations':n,'validResponses':valid,'p50Ms':pct(times,.5),'p95Ms':pct(times,.95),'p99Ms':pct(times,.99),'meanMs':statistics.mean(times),'decision':'PASS' if valid==n and pct(times,.95)<50 else 'FAIL'}

def oidc_bench(n=100):
    tok=post_json('http://127.0.0.1:8091/token',{'actor_id':'ACT-LIU','ttl':900})['access_token']
    env=os.environ.copy(); env.update({'DTEP_OIDC_ISSUER':'http://127.0.0.1:8091','DTEP_OIDC_AUDIENCE':'dtep-engineering','DTEP_OIDC_JWKS_URI':'http://127.0.0.1:8091/jwks','TEST_TOKEN':tok,'PERF_N':str(n),'TS_NODE_TRANSPILE_ONLY':'1','TS_NODE_COMPILER_OPTIONS':'{"module":"commonjs","moduleResolution":"node"}'})
    cmd=['bun','scripts/perf_identity_v211.ts']
    cp=subprocess.run(cmd,cwd=ROOT,env=env,text=True,capture_output=True,check=True)
    return json.loads(cp.stdout.strip().splitlines()[-1])

def adapter_bench():
    return {
      'fmi':post_json('http://127.0.0.1:8093/fmi/conformance',{'count':20000}),
      'sal':post_json('http://127.0.0.1:8093/sal/conformance',{'count':1000}),
      'lvc':post_json('http://127.0.0.1:8093/lvc/federation',{'count':5000}),
    }

def sqlite_bench():
    src=ROOT/'db'/'custom.db'; fd,tmp=tempfile.mkstemp(suffix='.db');os.close(fd);shutil.copy2(src,tmp)
    conn=sqlite3.connect(tmp);cur=conn.cursor(); reads=[]; writes=[]
    for _ in range(3000):
        t=time.perf_counter();cur.execute('select count(*) from ObjectEntry').fetchone();reads.append((time.perf_counter()-t)*1000)
    for i in range(500):
        t=time.perf_counter();cur.execute('insert into ActivityEvent (id,actor,module,message,createdAt) values (?,?,?,?,?)',(f'perf-{i}','perf','engineering','load','2026-09-04T00:00:00Z'));conn.commit();writes.append((time.perf_counter()-t)*1000)
    conn.close();os.unlink(tmp)
    return {'test':'sqlite-local-single-node','reads':len(reads),'writes':len(writes),'readP95Ms':pct(reads,.95),'writeP95Ms':pct(writes,.95),'readMeanMs':statistics.mean(reads),'writeMeanMs':statistics.mean(writes),'decision':'PASS' if pct(reads,.95)<5 and pct(writes,.95)<20 else 'FAIL','note':'SQLite result is only a single-node engineering baseline; it is not an HA/multi-writer qualification.'}

def main():
    result={'baseline':'DTEP-v2.1.1-engineering','environment':{'python':sys.version.split()[0]},'identity':oidc_bench(),'signing':signer_bench(),'adapters':adapter_bench(),'database':sqlite_bench()}
    checks=[result['identity']['decision'],result['signing']['decision'],result['adapters']['fmi']['decision'],result['adapters']['sal']['decision'],result['adapters']['lvc']['decision'],result['database']['decision']]
    result['overall']='PASS' if all(x=='PASS' for x in checks) else 'FAIL'
    OUT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    md=f'''# DTEP v2.1.1 Engineering Performance Baseline\n\nOverall: **{result['overall']}**\n\n| Path | Result | Key metric |\n|---|---|---|\n| OIDC RS256/JWKS verify | {result['identity']['decision']} | p95 {result['identity']['p95Ms']:.2f} ms |\n| Remote Ed25519 signing service | {result['signing']['decision']} | p95 {result['signing']['p95Ms']:.2f} ms |\n| FMI 2.0 Co-Simulation | {result['adapters']['fmi']['decision']} | {result['adapters']['fmi']['stepsPerSec']:.0f} doStep/s |\n| SAL C-ABI lifecycle/reset | {result['adapters']['sal']['decision']} | {result['adapters']['sal']['cyclesPerSec']:.0f} cycles/s; deterministic={result['adapters']['sal']['resetDeterministic']} |\n| LVC network harness | {result['adapters']['lvc']['decision']} | {result['adapters']['lvc']['messagesPerSec']:.0f} msg/s; loss={sum(result['adapters']['lvc']['losses'].values())} |\n| SQLite local baseline | {result['database']['decision']} | read p95 {result['database']['readP95Ms']:.3f} ms; write p95 {result['database']['writeP95Ms']:.3f} ms |\n\nThese are **container-local engineering measurements**, not range certification, HLA/TENA interoperability certification, or production capacity acceptance.\n'''
    OUT_MD.write_text(md,encoding='utf-8'); print(json.dumps(result,ensure_ascii=False,indent=2)); print(OUT_MD)
if __name__=='__main__':main()
