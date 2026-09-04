#!/usr/bin/env python3
from __future__ import annotations
import base64, json, sqlite3, urllib.request
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

ROOT=Path(__file__).resolve().parents[2]
app=FastAPI(title='DTEP Browser Engineering Harness')

def post(url,obj,headers=None):
    h={'Content-Type':'application/json'}; h.update(headers or {})
    req=urllib.request.Request(url,data=json.dumps(obj).encode(),headers=h,method='POST')
    with urllib.request.urlopen(req,timeout=20) as r:return json.loads(r.read())

def get(url):
    with urllib.request.urlopen(url,timeout=10) as r:return json.loads(r.read())

def b64u(s):
    return base64.urlsafe_b64decode(s+'='*((4-len(s)%4)%4))

def verify_test_token(token):
    h,p,s=token.split('.'); header=json.loads(b64u(h)); payload=json.loads(b64u(p)); jwks=get('http://127.0.0.1:8091/jwks'); jwk=next(k for k in jwks['keys'] if k['kid']==header['kid'])
    n=int.from_bytes(b64u(jwk['n']),'big');e=int.from_bytes(b64u(jwk['e']),'big');key=rsa.RSAPublicNumbers(e,n).public_key();key.verify(b64u(s),f'{h}.{p}'.encode(),padding.PKCS1v15(),hashes.SHA256())
    return payload

@app.get('/',response_class=HTMLResponse)
def index():
    return '''<!doctype html><html><head><meta charset="utf-8"><title>DTEP v2.1.1 Browser E2E</title><style>body{font-family:system-ui;margin:32px;max-width:920px}button{padding:10px 18px}pre{background:#f5f5f5;padding:16px;white-space:pre-wrap}.pass{color:#087f23}.fail{color:#b42318}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h1>DTEP v2.1.1 Engineering Browser E2E</h1><p>This harness validates browser → HTTP services → cryptographic identity/signature → executable FMI/SAL/LVC adapters → frozen DB baseline. It is not a substitute for the Next.js product-UI E2E.</p><button id="run">Run Engineering E2E</button><h2 id="overall">NOT RUN</h2><table id="checks"><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody></tbody></table><script>
const btn=document.getElementById('run');btn.onclick=async()=>{btn.disabled=true;document.getElementById('overall').textContent='RUNNING';const r=await fetch('/api/run-e2e',{method:'POST'});const j=await r.json();const tb=document.querySelector('#checks tbody');tb.innerHTML='';for(const c of j.checks){const tr=document.createElement('tr');tr.innerHTML=`<td>${c.name}</td><td class="${c.pass?'pass':'fail'}">${c.pass?'PASS':'FAIL'}</td><td>${c.detail}</td>`;tb.appendChild(tr)}const o=document.getElementById('overall');o.textContent=j.overall;o.className=j.overall==='PASS'?'pass':'fail';btn.disabled=false};
</script></body></html>'''

@app.post('/api/run-e2e')
def run_e2e():
    checks=[]
    tok=post('http://127.0.0.1:8091/token',{'actor_id':'ACT-LIU','ttl':300})['access_token']; payload=verify_test_token(tok)
    checks.append({'name':'OIDC signed identity','pass':payload.get('dtep_actor_id')=='ACT-LIU' and 'lvc-controller' in payload.get('roles',[]),'detail':f"sub={payload.get('sub')} actor={payload.get('dtep_actor_id')}"})
    signed=post('http://127.0.0.1:8092/sign',{'actorId':'ACT-LIU','payload':{'caseId':'CASE-01','stepId':'browser-e2e','phase':'control','actorId':'ACT-LIU','roleId':'lvc-controller','signedAt':'2026-09-04T00:00:00Z','subjectDigest':'sha256:browser'}},{'Authorization':'Bearer engineering-only-token'})
    checks.append({'name':'Ed25519 remote signing','pass':signed.get('scheme')=='ED25519-DETACHED-v1' and bool(signed.get('signatureValue')),'detail':signed.get('publicKeyFingerprint','')})
    fmi=post('http://127.0.0.1:8093/fmi/conformance',{'count':5000});checks.append({'name':'FMI 2.0 executable adapter','pass':fmi.get('decision')=='PASS','detail':f"{fmi.get('stepsPerSec',0):.0f} doStep/s; error={fmi.get('absError')}"})
    sal=post('http://127.0.0.1:8093/sal/conformance',{'count':250});checks.append({'name':'SAL C-ABI lifecycle/reset','pass':sal.get('decision')=='PASS','detail':f"deterministic={sal.get('resetDeterministic')} cycles={sal.get('cycles')}"})
    lvc=post('http://127.0.0.1:8093/lvc/federation',{'count':2000});checks.append({'name':'Networked L/V/C federation harness','pass':lvc.get('decision')=='PASS','detail':f"received={lvc.get('messagesReceived')}/{lvc.get('messagesExpected')} rate={lvc.get('messagesPerSec',0):.0f}/s"})
    conn=sqlite3.connect(ROOT/'db'/'custom.db'); types=conn.execute('select count(*) from ObjectType').fetchone()[0]; links=conn.execute('select count(*) from LinkType').fetchone()[0]; conn.close()
    checks.append({'name':'Frozen ontology baseline','pass':types==47 and links==86,'detail':f'ObjectTypes={types}, LinkTypes={links}'})
    overall='PASS' if all(c['pass'] for c in checks) else 'FAIL'
    return {'overall':overall,'checks':checks}

if __name__=='__main__':
    import argparse,uvicorn
    ap=argparse.ArgumentParser();ap.add_argument('--host',default='127.0.0.1');ap.add_argument('--port',type=int,default=8094);args=ap.parse_args();uvicorn.run(app,host=args.host,port=args.port,log_level='warning')
