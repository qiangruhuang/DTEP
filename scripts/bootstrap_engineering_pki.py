#!/usr/bin/env python3
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import json, os, stat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.runtime' / 'pki' / 'actors'
OUT.mkdir(parents=True, exist_ok=True)
actors = ['ACT-LIN','ACT-LIU','ACT-HE','ACT-ZHAO','ACT-WU','ACT-TANG','ACT-ZHOU','ACT-SUN','ACT-QIN','ACT-FANG','ACT-GAO','ACT-YU','DPA-ZHANG','DPA-CHEN','DPA-HAN','DPA-LUO','DPA-ZHAO']
created=[]
for actor in actors:
    priv_path=OUT/f'{actor}.ed25519.private.pem'
    pub_path=OUT/f'{actor}.ed25519.public.pem'
    if priv_path.exists() and pub_path.exists():
        continue
    key=ed25519.Ed25519PrivateKey.generate()
    priv=key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    pub=key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    priv_path.write_bytes(priv); pub_path.write_bytes(pub)
    os.chmod(priv_path, stat.S_IRUSR|stat.S_IWUSR)
    os.chmod(pub_path, stat.S_IRUSR|stat.S_IWUSR|stat.S_IRGRP|stat.S_IROTH)
    created.append(actor)
manifest={'scheme':'ED25519-DETACHED-v1','actors':actors,'privateKeysIncludedInDelivery':False,'generatedAtRuntime':True}
(ROOT/'.runtime'/'pki'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'engineering PKI ready: {len(actors)} actors; created {len(created)}')
print(OUT)
