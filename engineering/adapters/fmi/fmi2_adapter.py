#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import ctypes as C, tempfile, zipfile, xml.etree.ElementTree as ET, json, time, argparse

class FMI2Adapter:
    def __init__(self,fmu_path:str):
        self.fmu_path=Path(fmu_path); self.tmp=tempfile.TemporaryDirectory(prefix='dtep-fmu-')
        with zipfile.ZipFile(self.fmu_path) as z:z.extractall(self.tmp.name)
        root=ET.parse(Path(self.tmp.name)/'modelDescription.xml').getroot()
        if root.attrib.get('fmiVersion')!='2.0': raise RuntimeError('requires FMI 2.0')
        cs=root.find('CoSimulation'); self.model_identifier=cs.attrib['modelIdentifier']; self.guid=root.attrib['guid']
        self.lib=C.CDLL(str(Path(self.tmp.name)/'binaries'/'linux64'/f'{self.model_identifier}.so'))
        self._bind(); self.component=None
    def _bind(self):
        L=self.lib
        L.fmi2Instantiate.argtypes=[C.c_char_p,C.c_int,C.c_char_p,C.c_char_p,C.c_void_p,C.c_int,C.c_int]; L.fmi2Instantiate.restype=C.c_void_p
        for fn in ['fmi2SetupExperiment','fmi2EnterInitializationMode','fmi2ExitInitializationMode','fmi2DoStep','fmi2Reset','fmi2Terminate']:
            getattr(L,fn).restype=C.c_int
        L.fmi2SetupExperiment.argtypes=[C.c_void_p,C.c_int,C.c_double,C.c_double,C.c_int,C.c_double]
        L.fmi2EnterInitializationMode.argtypes=[C.c_void_p]; L.fmi2ExitInitializationMode.argtypes=[C.c_void_p]
        L.fmi2DoStep.argtypes=[C.c_void_p,C.c_double,C.c_double,C.c_int]; L.fmi2Reset.argtypes=[C.c_void_p]; L.fmi2Terminate.argtypes=[C.c_void_p]
        L.fmi2FreeInstance.argtypes=[C.c_void_p]
        L.fmi2SetReal.argtypes=[C.c_void_p,C.POINTER(C.c_uint),C.c_size_t,C.POINTER(C.c_double)]; L.fmi2SetReal.restype=C.c_int
        L.fmi2GetReal.argtypes=[C.c_void_p,C.POINTER(C.c_uint),C.c_size_t,C.POINTER(C.c_double)]; L.fmi2GetReal.restype=C.c_int
    def instantiate(self):
        self.component=self.lib.fmi2Instantiate(b'dtep',1,self.guid.encode(),None,None,0,0)
        if not self.component: raise RuntimeError('fmi2Instantiate failed')
        self._ok(self.lib.fmi2SetupExperiment(self.component,0,0.0,0.0,0,0.0),'SetupExperiment')
        self._ok(self.lib.fmi2EnterInitializationMode(self.component),'EnterInitializationMode'); self._ok(self.lib.fmi2ExitInitializationMode(self.component),'ExitInitializationMode')
    def _ok(self,status,name):
        if status>1: raise RuntimeError(f'{name} status={status}')
    def set_real(self,vr:int,value:float):
        refs=(C.c_uint*1)(vr); vals=(C.c_double*1)(value); self._ok(self.lib.fmi2SetReal(self.component,refs,1,vals),'SetReal')
    def get_real(self,vr:int)->float:
        refs=(C.c_uint*1)(vr); vals=(C.c_double*1)(); self._ok(self.lib.fmi2GetReal(self.component,refs,1,vals),'GetReal'); return vals[0]
    def step(self,t:float,dt:float): self._ok(self.lib.fmi2DoStep(self.component,t,dt,1),'DoStep')
    def reset(self): self._ok(self.lib.fmi2Reset(self.component),'Reset')
    def close(self):
        if self.component:
            self.lib.fmi2Terminate(self.component); self.lib.fmi2FreeInstance(self.component); self.component=None
        self.tmp.cleanup()

def conformance(fmu,steps=1000,dt=.001,u=2.0):
    a=FMI2Adapter(fmu); t0=time.perf_counter(); a.instantiate(); a.set_real(0,u)
    for i in range(steps): a.step(i*dt,dt)
    y=a.get_real(1); elapsed=time.perf_counter()-t0
    a.close()
    expected=steps*dt*u
    return {'adapter':'FMI2-CoSimulation-ctypes','steps':steps,'dt':dt,'input':u,'output':y,'expected':expected,'absError':abs(y-expected),'elapsedSec':elapsed,'stepsPerSec':steps/elapsed,'decision':'PASS' if abs(y-expected)<1e-9 else 'FAIL'}

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('fmu'); ap.add_argument('--steps',type=int,default=1000); args=ap.parse_args(); print(json.dumps(conformance(args.fmu,args.steps),indent=2))
