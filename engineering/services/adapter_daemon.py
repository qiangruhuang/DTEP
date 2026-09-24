#!/usr/bin/env python3
from __future__ import annotations
import importlib.util, json, subprocess, sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

ROOT=Path(__file__).resolve().parents[2]
FMI_DIR=ROOT/'engineering'/'adapters'/'fmi'; SAL_DIR=ROOT/'engineering'/'adapters'/'sal'; LVC_DIR=ROOT/'engineering'/'adapters'/'lvc'
FMU=FMI_DIR/'dist'/'dtep_reference_fmi2.fmu'; SAL_SO=SAL_DIR/'dist'/'libdtep_reference_sal.so'

def load_module(name,path):
    spec=importlib.util.spec_from_file_location(name,path); mod=importlib.util.module_from_spec(spec); assert spec.loader; sys.modules[name]=mod; spec.loader.exec_module(mod); return mod

def ensure_builds():
    if not FMU.exists(): subprocess.run([sys.executable,str(FMI_DIR/'build_reference_fmu.py')],check=True,cwd=ROOT)
    if not SAL_SO.exists(): subprocess.run([sys.executable,str(SAL_DIR/'build_reference_sal.py')],check=True,cwd=ROOT)

app=FastAPI(title='DTEP Engineering Adapter Daemon')
class RunReq(BaseModel): count:int=1000

@app.on_event('startup')
def startup(): ensure_builds()

@app.get('/health')
def health():
    ensure_builds(); return {'status':'ok','fmi':FMU.exists(),'sal':SAL_SO.exists(),'lvcHarness':(LVC_DIR/'federation_harness.py').exists()}

@app.post('/fmi/conformance')
def fmi(req:RunReq):
    ensure_builds(); mod=load_module('dtep_fmi_adapter',FMI_DIR/'fmi2_adapter.py'); return mod.conformance(str(FMU),steps=max(1,min(req.count,100000)))

@app.post('/sal/conformance')
def sal(req:RunReq):
    ensure_builds(); mod=load_module('dtep_sal_adapter',SAL_DIR/'sal_adapter.py'); return mod.conformance(str(SAL_SO),cycles=max(1,min(req.count,10000)))

@app.post('/lvc/federation')
def lvc(req:RunReq):
    mod=load_module('dtep_lvc_harness',LVC_DIR/'federation_harness.py'); return mod.run_federation(messages_per_node=max(1,min(req.count,100000)))

if __name__=='__main__':
    import argparse, uvicorn
    ap=argparse.ArgumentParser(); ap.add_argument('--host',default='127.0.0.1'); ap.add_argument('--port',type=int,default=8093); args=ap.parse_args(); uvicorn.run(app,host=args.host,port=args.port,log_level='warning')
