#!/usr/bin/env python3
from __future__ import annotations
import ctypes as C, json, argparse, time
from pathlib import Path

class SALAdapter:
    def __init__(self,lib_path:str):
        self.lib=C.CDLL(str(lib_path)); L=self.lib
        L.sal_create.restype=C.c_void_p; L.sal_destroy.argtypes=[C.c_void_p]
        for name in ['sal_initialize','sal_prepare_data','sal_validate','sal_start','sal_step','sal_reset','sal_get_status','sal_get_scenario_name','sal_publish_topic','sal_query_topic']:
            getattr(L,name).restype=C.c_int
        L.sal_initialize.argtypes=[C.c_void_p]; L.sal_prepare_data.argtypes=[C.c_void_p,C.c_char_p]; L.sal_validate.argtypes=[C.c_void_p,C.c_char_p,C.c_size_t]
        L.sal_is_prepared.argtypes=[C.c_void_p]; L.sal_is_prepared.restype=C.c_int; L.sal_start.argtypes=[C.c_void_p]; L.sal_step.argtypes=[C.c_void_p,C.c_double]
        L.sal_reset.argtypes=[C.c_void_p]; L.sal_get_status.argtypes=[C.c_void_p]; L.sal_get_sim_time.argtypes=[C.c_void_p]; L.sal_get_sim_time.restype=C.c_double
        L.sal_get_scenario_name.argtypes=[C.c_void_p,C.c_char_p,C.c_size_t]; L.sal_publish_topic.argtypes=[C.c_void_p,C.c_char_p,C.c_char_p]; L.sal_query_topic.argtypes=[C.c_void_p,C.c_char_p,C.c_char_p,C.c_size_t]
        self.h=L.sal_create();
        if not self.h: raise RuntimeError('SAL create failed')
    def ok(self,status,name):
        if status!=0: raise RuntimeError(f'{name} status={status}')
    def initialize(self): self.ok(self.lib.sal_initialize(self.h),'Initialize')
    def prepare_data(self,d): self.ok(self.lib.sal_prepare_data(self.h,json.dumps(d,separators=(',',':')).encode()),'PrepareData')
    def validate(self):
        b=C.create_string_buffer(512); st=self.lib.sal_validate(self.h,b,len(b));
        if st: raise RuntimeError(f'Validate status={st}: {b.value.decode()}')
    def is_prepared(self): return bool(self.lib.sal_is_prepared(self.h))
    def start(self): self.ok(self.lib.sal_start(self.h),'Start')
    def step(self,dt): self.ok(self.lib.sal_step(self.h,dt),'Step')
    def reset(self): self.ok(self.lib.sal_reset(self.h),'Reset')
    def status(self): return self.lib.sal_get_status(self.h)
    def sim_time(self): return self.lib.sal_get_sim_time(self.h)
    def scenario(self): b=C.create_string_buffer(256); self.ok(self.lib.sal_get_scenario_name(self.h,b,len(b)),'GetScenarioName'); return b.value.decode()
    def publish(self,topic,payload): self.ok(self.lib.sal_publish_topic(self.h,topic.encode(),json.dumps(payload,separators=(',',':')).encode()),'PublishTopic')
    def query(self,topic): b=C.create_string_buffer(2048); self.ok(self.lib.sal_query_topic(self.h,topic.encode(),b,len(b)),'QueryTopic'); return json.loads(b.value)
    def close(self):
        if self.h:self.lib.sal_destroy(self.h);self.h=None

def conformance(lib,cycles=100):
    a=SALAdapter(lib); start=time.perf_counter(); fingerprints=[]
    for i in range(cycles):
        a.initialize(); a.prepare_data({'scenario':'SC-COA-01','seed':20260904}); a.validate()
        if not a.is_prepared(): raise RuntimeError('IsPrepared=false')
        a.publish('EW.Status',{'jamLevel':75,'schema':'EW.Status.v2.1'}); a.start(); a.step(.1); a.step(.1)
        fp=(a.scenario(),a.query('EW.Status'),round(a.sim_time(),9),a.status()); fingerprints.append(json.dumps(fp,sort_keys=True,ensure_ascii=False))
        a.reset()
    elapsed=time.perf_counter()-start; stable=len(set(fingerprints))==1
    result={'adapter':'SAL-C-ABI-reference','cycles':cycles,'resetDeterministic':stable,'uniqueFingerprints':len(set(fingerprints)),'elapsedSec':elapsed,'cyclesPerSec':cycles/elapsed,'decision':'PASS' if stable else 'FAIL'}
    a.close(); return result

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('library'); ap.add_argument('--cycles',type=int,default=100); args=ap.parse_args(); print(json.dumps(conformance(args.library,args.cycles),indent=2,ensure_ascii=False))
