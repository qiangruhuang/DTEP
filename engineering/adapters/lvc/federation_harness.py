#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, socket, socketserver, threading, time
from dataclasses import dataclass, asdict
from typing import List, Dict

HOST='127.0.0.1'

@dataclass
class NodeCfg:
    node_id:str
    node_class:str
    logical_gateway:str
    clock_offset_ms:float=0.0

DEFAULT_NODES=[
    NodeCfg('LIVE-X9A','Live','HLA-GW',0.3),
    NodeCfg('VIRTUAL-C2','Virtual','DIS-GW',-0.4),
    NodeCfg('CONSTRUCTIVE-X9A','Constructive','DDS-GW',0.1),
]

class TCPCollector:
    def __init__(self,port=19091):
        self.events=[]; self.lock=threading.Lock()
        collector=self
        class Handler(socketserver.StreamRequestHandler):
            def handle(self):
                for line in self.rfile:
                    recv_ns=time.time_ns()
                    try: evt=json.loads(line)
                    except Exception: continue
                    evt['_recvNs']=recv_ns; evt['_src']=f'{self.client_address[0]}:{self.client_address[1]}'
                    with collector.lock: collector.events.append(evt)
        class Server(socketserver.ThreadingTCPServer): allow_reuse_address=True; daemon_threads=True
        self.server=Server((HOST,port),Handler); self.addr=self.server.server_address
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
    def start(self): self.thread.start()
    def stop(self): self.server.shutdown(); self.server.server_close(); self.thread.join(timeout=1)

class UDPCollector:
    def __init__(self,port=19091):
        self.addr=(HOST,port); self.events=[]; self.lock=threading.Lock(); self.stop_evt=threading.Event()
        self.sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); self.sock.setsockopt(socket.SOL_SOCKET,socket.SO_RCVBUF,8*1024*1024); self.sock.bind(self.addr); self.sock.settimeout(.1)
        self.thread=threading.Thread(target=self._run,daemon=True)
    def start(self): self.thread.start()
    def _run(self):
        while not self.stop_evt.is_set():
            try:data,src=self.sock.recvfrom(65535)
            except socket.timeout:continue
            recv_ns=time.time_ns()
            try:evt=json.loads(data)
            except Exception:continue
            evt['_recvNs']=recv_ns;evt['_src']=f'{src[0]}:{src[1]}'
            with self.lock:self.events.append(evt)
    def stop(self):self.stop_evt.set();self.thread.join(timeout=1);self.sock.close()

def make_event(node,seq,base,topic):
    return {'schema':'dtep/lvc-harness-event/v1','nodeId':node.node_id,'nodeClass':node.node_class,'logicalGateway':node.logical_gateway,'topic':topic,'seq':seq,'sourceTimeNs':base+seq*1_000_000,'payload':{'state':'RUNNING','seq':seq}}

def tcp_sender(node,dest,count,barrier,topic='Platform.State'):
    base=time.time_ns()+int(node.clock_offset_ms*1e6); barrier.wait()
    with socket.create_connection(dest,timeout=3) as sock:
        f=sock.makefile('wb',buffering=1024*1024)
        for seq in range(count):
            evt=make_event(node,seq,base,topic);evt['transport']='DTEP-TCP-HARNESS';f.write(json.dumps(evt,separators=(',',':')).encode()+b'\n')
        f.flush()

def udp_sender(node,dest,count,barrier,topic='Platform.State',pace_sec=.001):
    base=time.time_ns()+int(node.clock_offset_ms*1e6);sock=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);barrier.wait()
    for seq in range(count):
        evt=make_event(node,seq,base,topic);evt['transport']='DTEP-UDP-HARNESS';sock.sendto(json.dumps(evt,separators=(',',':')).encode(),dest)
        if pace_sec:time.sleep(pace_sec)
    sock.close()

def run_federation(messages_per_node=2000,port=19091,nodes=None,transport='tcp'):
    nodes=nodes or DEFAULT_NODES; collector=TCPCollector(port) if transport=='tcp' else UDPCollector(port);collector.start();barrier=threading.Barrier(len(nodes)+1)
    fn=tcp_sender if transport=='tcp' else udp_sender
    threads=[threading.Thread(target=fn,args=(n,collector.addr,messages_per_node,barrier),daemon=True) for n in nodes]
    for t in threads:t.start()
    t0=time.perf_counter();barrier.wait()
    for t in threads:t.join()
    expected=messages_per_node*len(nodes);deadline=time.time()+5
    while len(collector.events)<expected and time.time()<deadline:time.sleep(.005)
    elapsed=time.perf_counter()-t0;collector.stop();events=collector.events
    per_node:Dict[str,List[dict]]={n.node_id:[] for n in nodes}
    for e in events:
        if e.get('nodeId') in per_node:per_node[e['nodeId']].append(e)
    losses={k:messages_per_node-len(v) for k,v in per_node.items()};seq_ok=all(len({e['seq'] for e in arr})==len(arr) for arr in per_node.values())
    ordered=all([e['seq'] for e in arr]==sorted(e['seq'] for e in arr) for arr in per_node.values())
    return {
      'adapter':'LVC-loopback-network-federation-v1','transport':f'real {transport.upper()} sockets / localhost',
      'wireProtocolClaim':'NONE - gateway labels are logical adapter slots, not HLA/DIS/TENA/DDS wire encodings',
      'nodes':[asdict(n) for n in nodes],'messagesExpected':expected,'messagesReceived':len(events),'losses':losses,'uniqueSequence':seq_ok,'perNodeOrdered':ordered,
      'elapsedSec':elapsed,'messagesPerSec':len(events)/elapsed if elapsed else 0,'maxConfiguredClockOffsetMs':max(abs(n.clock_offset_ms) for n in nodes),
      'decision':'PASS' if len(events)==expected and seq_ok and ordered else 'FAIL'
    }

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--messages-per-node',type=int,default=2000);ap.add_argument('--port',type=int,default=19091);ap.add_argument('--transport',choices=['tcp','udp'],default='tcp');args=ap.parse_args()
    print(json.dumps(run_federation(args.messages_per_node,args.port,transport=args.transport),indent=2,ensure_ascii=False))
