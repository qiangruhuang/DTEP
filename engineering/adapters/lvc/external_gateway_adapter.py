#!/usr/bin/env python3
"""Production-facing gateway health adapter.

This module does not implement HLA/DIS/TENA/DDS wire protocols. It connects DTEP to an
already deployed protocol gateway/RTI adapter through an explicit health/control endpoint.
That boundary prevents the DTEP application from embedding vendor RTI code or protocol stacks.
"""
from __future__ import annotations
import json, socket, time, urllib.request
from dataclasses import dataclass, asdict

@dataclass
class GatewayEndpoint:
    name:str
    protocol:str
    mode:str       # tcp | http
    host:str
    port:int
    health_path:str='/health'

class ExternalGatewayAdapter:
    def check(self,ep:GatewayEndpoint,timeout=.5):
        t0=time.perf_counter()
        try:
            if ep.mode=='tcp':
                with socket.create_connection((ep.host,ep.port),timeout=timeout): pass
                detail='tcp-connect-ok'
            elif ep.mode=='http':
                with urllib.request.urlopen(f'http://{ep.host}:{ep.port}{ep.health_path}',timeout=timeout) as r:
                    if r.status>=400: raise RuntimeError(f'HTTP {r.status}')
                    detail=r.read(2048).decode(errors='replace')
            else: raise ValueError('unsupported mode')
            return {**asdict(ep),'healthy':True,'latencyMs':(time.perf_counter()-t0)*1000,'detail':detail}
        except Exception as e:
            return {**asdict(ep),'healthy':False,'latencyMs':(time.perf_counter()-t0)*1000,'detail':str(e)}
