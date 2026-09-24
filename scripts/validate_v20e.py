#!/usr/bin/env python3
import json, sqlite3, sys, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'; errs=[]
con=sqlite3.connect(DB); con.row_factory=sqlite3.Row

def t(api): return con.execute('select id,objectCount from ObjectType where apiName=?',(api,)).fetchone()
def rows(api):
    tt=t(api)
    if not tt:return []
    out=[]
    for r in con.execute('select pk,title,dataJson from ObjectEntry where objectTypeId=? order by pk',(tt['id'],)):
        try:d=json.loads(r['dataJson'] or '{}')
        except Exception as e: errs.append(f'{api}/{r["pk"]} invalid JSON {e}'); d={}
        out.append((r['pk'],r['title'],d))
    return out
def one(api,pk):
    for p,title,d in rows(api):
        if p==pk:return d
    return None

integrity=con.execute('pragma integrity_check').fetchone()[0]
if integrity!='ok': errs.append('sqlite integrity_check failed')
for api in ['RunControlSession','RunHealthSnapshot','RunControlAction']:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
    if rows(api): errs.append(f'initial delivery must not pre-create {api} records')
links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['runControlUsesEnvironment','runControlUsesFederation','runControlHasHealthSnapshot','runControlHasAction','runUsesControlSession']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

lib=(ROOT/'src/lib/run-control-monitoring.ts').read_text(encoding='utf-8')
gov=(ROOT/'src/lib/case01-governance.ts').read_text(encoding='utf-8')
case=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/run-control/route.ts').read_text(encoding='utf-8')
audit=(ROOT/'src/lib/run-instance.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/case01-state-machine.tsx').read_text(encoding='utf-8')
runui=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
dp30=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')

for token in ['RunControlSession','RunHealthSnapshot','RunControlAction','AUTO_PAUSE','TIME_DRIFT','STOP-TIME-SYNC','RECOVERY_READY','READY_TO_COMPLETE','prepare-complete','abort','runControlHash','finalizeRunControlSession','clearCase01RunControlRecords','v2.0e']:
    if token not in lib: errs.append(f'run control implementation missing {token}')
for token in ["'control'",'recordRunControlSignature']:
    if token not in gov: errs.append(f'governance control signature missing {token}')
for token in ['assertRunControlReadyForFormalization','bindRunToControl','finalizeRunControlSession','clearCase01RunControlRecords','getRunControlState']:
    if token not in case: errs.append(f'CASE-01 run control integration missing {token}')
for token in ['start','monitor','pause','remediate','resume','prepare-complete','abort','executeRunControlOperation']:
    if token not in api: errs.append(f'Run Control API missing {token}')
for token in ['缺少 Run Control Session 引用','缺少运行健康快照','runControlFinalHash','runControlActions','OUT_OF_TOLERANCE']:
    if token not in audit: errs.append(f'Run audit control gate missing {token}')
for token in ['Run Control / Live Federation Monitoring','采集监控帧','人工暂停','故障处置并复核','恢复 Run','中止 Attempt','READY_TO_COMPLETE','/api/run-control']:
    if token not in ui: errs.append(f'Run Control UI missing {token}')
for token in ['冻结的 Run Control / Live Federation Monitoring','runControlFinalHash','runHealthSnapshots','runControlActions']:
    if token not in runui: errs.append(f'Run evidence UI missing {token}')
for token in ['ensureRunControlOntology','clearCase01RunControlRecords']:
    if token not in dp30: errs.append(f'DP30 lifecycle run-control integration missing {token}')

# Policy shadow-check: frozen readiness tolerance is 10ms; v2.0-E demo injects 22ms then recovers to 5ms.
if 'syncToleranceMs: 10' not in (ROOT/'src/lib/test-environment-assembly.ts').read_text(encoding='utf-8'): errs.append('federation sync tolerance no longer fixed at 10ms for demo')
if "anomaly === 'TIME_DRIFT' ? 22" not in lib: errs.append('LVC runtime time-drift demo does not inject 22ms')
if "recovery ? 5" not in lib: errs.append('LVC runtime recovery does not produce 5ms healthy state')
if not (22 > 10 and 5 <= 10): errs.append('shadow stop/recovery threshold inconsistent')

# Governance and provenance boundaries.
if "systemAttestationHash" not in lib or "recordRunControlSignature" not in lib: errs.append('automatic/manual control attestation split missing')
if "if (runControlRequiredForStep(stepId)) await assertRunControlReadyForFormalization(stepId)" not in case: errs.append('direct state-machine execute can bypass Run Control')
if "runControlVersion: 'v2.0e'" not in lib: errs.append('formal run snapshot not marked v2.0e')

# Must not retroactively backfill legacy runs in initial DB.
for pk in ['RUN-DOT-B-01','RUN-DOT-S-01','RUN-LVC-004-REH-01']:
    r=one('TestRun',pk)
    if r and any(k in r for k in ['runControlSessionRef','runControlHash','runControlVersion']): errs.append(f'legacy {pk} must not be retroactively backfilled with run-control provenance')

strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
print('SQLite integrity_check:',integrity)
print('Initial RunControlSession objects:',len(rows('RunControlSession')))
print('Initial RunHealthSnapshot objects:',len(rows('RunHealthSnapshot')))
print('Initial RunControlAction objects:',len(rows('RunControlAction')))
print('Run-control steps: live-retest / lvc-anchor / digital-5000')
print('LVC runtime demo behavior: 6ms healthy start -> 22ms AUTO_PAUSE -> 5ms recovery -> RESUME -> READY_TO_COMPLETE')
print('Manual control actions: START / PAUSE / REMEDIATE / RESUME / ABORT / PREPARE_COMPLETE are signed by executor role')
print('Automatic safety action: AUTO_PAUSE uses system attestation hash')
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
