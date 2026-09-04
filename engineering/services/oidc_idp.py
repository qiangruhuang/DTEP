#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, json, os, time, uuid
from pathlib import Path
from typing import Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.runtime' / 'oidc'
RUNTIME.mkdir(parents=True, exist_ok=True)
PRIV = RUNTIME / 'issuer.private.pem'
PUB = RUNTIME / 'issuer.public.pem'
ISSUER = os.environ.get('DTEP_TEST_OIDC_ISSUER', 'http://127.0.0.1:8091')
AUDIENCE = os.environ.get('DTEP_TEST_OIDC_AUDIENCE', 'dtep-engineering')
KID = 'dtep-engineering-rs256-1'

ACTORS: Dict[str, dict] = {
    'ACT-LIN': {'name':'林晓东','roles':['test-executor']},
    'ACT-LIU': {'name':'刘晨','roles':['lvc-controller']},
    'ACT-HE': {'name':'何斌','roles':['model-owner']},
    'ACT-ZHAO': {'name':'赵岚','roles':['accreditation-authority']},
    'ACT-WU': {'name':'吴静','roles':['digital-operator']},
    'ACT-TANG': {'name':'唐宁','roles':['evidence-manager']},
    'ACT-ZHOU': {'name':'周衡','roles':['test-director']},
    'ACT-SUN': {'name':'孙立','roles':['evaluation-authority']},
    'ACT-QIN': {'name':'秦岳','roles':['final-approver']},
    'ACT-FANG': {'name':'方宁','roles':['expert-reviewer']},
    'ACT-GAO': {'name':'高远','roles':['expert-reviewer']},
    'ACT-YU': {'name':'余珂','roles':['expert-reviewer']},
    'DPA-ZHANG': {'name':'张嵘','roles':['delivery-provider']},
    'DPA-CHEN': {'name':'陈楷','roles':['intake-officer']},
    'DPA-HAN': {'name':'韩宁','roles':['conformance-engineer']},
    'DPA-LUO': {'name':'罗毅','roles':['configuration-manager']},
    'DPA-ZHAO': {'name':'赵岚','roles':['qualification-authority']},
}

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def ensure_key():
    if PRIV.exists() and PUB.exists():
        return serialization.load_pem_private_key(PRIV.read_bytes(), password=None)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    PRIV.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    PUB.write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
    os.chmod(PRIV, 0o600)
    return key

def jwk_from_key(key):
    nums = key.public_key().public_numbers()
    n = nums.n.to_bytes((nums.n.bit_length()+7)//8, 'big')
    e = nums.e.to_bytes((nums.e.bit_length()+7)//8, 'big')
    return {'kty':'RSA','use':'sig','alg':'RS256','kid':KID,'n':b64u(n),'e':b64u(e)}

def issue(actor_id: str, ttl: int = 900):
    if actor_id not in ACTORS:
        raise ValueError('unknown actor')
    key=ensure_key(); now=int(time.time()); actor=ACTORS[actor_id]
    header={'alg':'RS256','typ':'JWT','kid':KID}
    payload={
        'iss':ISSUER,'aud':AUDIENCE,'sub':f'dtep:{actor_id}','iat':now,'nbf':now-1,'exp':now+ttl,
        'auth_time':now,'jti':str(uuid.uuid4()),'name':actor['name'],'preferred_username':actor_id,
        'dtep_actor_id':actor_id,'roles':actor['roles'],'groups':['DTEP-ENGINEERING'],'amr':['pwd','engineering-idp'],'acr':'urn:dtep:aal2-test'
    }
    h=b64u(json.dumps(header,separators=(',',':')).encode()); p=b64u(json.dumps(payload,separators=(',',':'),ensure_ascii=False).encode())
    signing=f'{h}.{p}'.encode()
    sig=key.sign(signing,padding.PKCS1v15(),hashes.SHA256())
    return f'{h}.{p}.{b64u(sig)}'

app=FastAPI(title='DTEP Engineering OIDC IdP')
class TokenReq(BaseModel):
    actor_id: str
    ttl: int = 900

@app.get('/.well-known/openid-configuration')
def discovery():
    return {'issuer':ISSUER,'jwks_uri':f'{ISSUER}/jwks','token_endpoint':f'{ISSUER}/token','id_token_signing_alg_values_supported':['RS256']}

@app.get('/jwks')
def jwks():
    return {'keys':[jwk_from_key(ensure_key())]}

@app.post('/token')
def token(req: TokenReq):
    try: t=issue(req.actor_id, req.ttl)
    except ValueError: raise HTTPException(404,'unknown actor')
    return {'access_token':t,'token_type':'Bearer','expires_in':req.ttl,'audience':AUDIENCE,'actor_id':req.actor_id}

@app.get('/health')
def health(): return {'status':'ok','issuer':ISSUER,'audience':AUDIENCE,'actors':len(ACTORS)}

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--issue'); ap.add_argument('--ttl',type=int,default=900); ap.add_argument('--serve',action='store_true'); ap.add_argument('--host',default='127.0.0.1'); ap.add_argument('--port',type=int,default=8091)
    args=ap.parse_args()
    if args.issue: print(issue(args.issue,args.ttl))
    elif args.serve:
        import uvicorn; uvicorn.run(app,host=args.host,port=args.port,log_level='warning')
    else: ap.print_help()
