#!/usr/bin/env python3
from __future__ import annotations
import base64, hashlib, json, os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

ROOT=Path(__file__).resolve().parents[2]
KEYROOT=Path(os.environ.get('DTEP_LOCAL_SIGNING_KEY_DIR', ROOT/'.runtime'/'pki'/'actors'))
TOKEN=os.environ.get('DTEP_SIGNER_API_TOKEN','engineering-only-token')

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(k,separators=(',',':'))+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,separators=(',',':'),ensure_ascii=False)

def digest_spki(pub_pem:bytes):
    pub=serialization.load_pem_public_key(pub_pem)
    der=pub.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    # Match application sha256Digest({spkiDerBase64: ...}) canonical form.
    obj={'spkiDerBase64':base64.b64encode(der).decode()}
    return 'sha256:'+hashlib.sha256(stable(obj).encode()).hexdigest()

class SignReq(BaseModel):
    actorId:str
    payload:dict

app=FastAPI(title='DTEP Engineering Signing Service')

@app.get('/health')
def health():
    return {'status':'ok','scheme':'ED25519-DETACHED-v1','keyRoot':str(KEYROOT),'privateKeysExposed':False}

@app.post('/sign')
def sign(req:SignReq, authorization:str|None=Header(default=None)):
    if TOKEN and authorization != f'Bearer {TOKEN}': raise HTTPException(401,'signer service token invalid')
    safe=''.join(c if c.isalnum() or c in '_.-' else '_' for c in req.actorId)
    priv_path=KEYROOT/f'{safe}.ed25519.private.pem'; pub_path=KEYROOT/f'{safe}.ed25519.public.pem'
    if not priv_path.exists() or not pub_path.exists(): raise HTTPException(404,'actor signing key not found')
    key=serialization.load_pem_private_key(priv_path.read_bytes(),password=None)
    if not isinstance(key,ed25519.Ed25519PrivateKey): raise HTTPException(500,'actor key is not Ed25519')
    canonical=stable(req.payload).encode(); sig=key.sign(canonical); pub_pem=pub_path.read_bytes()
    return {'scheme':'ED25519-DETACHED-v1','keyId':f'engineering-signer:{req.actorId}','publicKeyPem':pub_pem.decode(),'publicKeyFingerprint':digest_spki(pub_pem),'signatureValue':base64.b64encode(sig).decode(),'signedPayload':req.payload}

if __name__=='__main__':
    import argparse, uvicorn
    ap=argparse.ArgumentParser(); ap.add_argument('--host',default='127.0.0.1'); ap.add_argument('--port',type=int,default=8092); args=ap.parse_args(); uvicorn.run(app,host=args.host,port=args.port,log_level='warning')
