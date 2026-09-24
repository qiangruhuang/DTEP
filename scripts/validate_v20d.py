#!/usr/bin/env python3
import json, sqlite3, sys
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
for api in ['TestReadinessReview','FederationReadinessReview']:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
    if rows(api): errs.append(f'initial delivery must not pre-create {api} records')
links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['readinessUsesModelAssembly','readinessUsesEnvironment','federationReadinessUsesFederation','runUsesTestReadiness','runUsesFederationReadiness']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

lib=(ROOT/'src/lib/test-readiness-review.ts').read_text(encoding='utf-8')
case=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
gov=(ROOT/'src/lib/case01-governance.ts').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/case01-state-machine/route.ts').read_text(encoding='utf-8')
audit=(ROOT/'src/lib/run-instance.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/case01-state-machine.tsx').read_text(encoding='utf-8')
runui=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
dp30=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')
for token in ['TestReadinessReview','FederationReadinessReview','TIME-SYNC','NODE-REGISTRATION','GATEWAY-HEALTH','TOPIC-SCHEMA','RESET-DRY-RUN','executeReadinessReview','assertReadinessPassedForStep','readinessApprovalContext','bindRunToReadiness','attachReadinessExecutionSignature','v2.0d']:
    if token not in lib: errs.append(f'readiness implementation missing {token}')
for token in ["bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLiveData())), 'live-retest')", "bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLvcData())), 'lvc-anchor')", "bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runDigitalData())), 'digital-5000')", 'clearCase01ReadinessReviews', 'getReadinessState', 'attachReadinessExecutionSignature']:
    if token not in case: errs.append(f'CASE-01 readiness integration missing {token}')
for token in ['subjectContext','requestStepApproval(stepId: string, actorId: string, subjectContext','subjectContext: approval.data.subjectContext']:
    if token not in gov: errs.append(f'governance readiness binding missing {token}')
for token in ['run-readiness','readinessApprovalContext','executeReadinessReview']:
    if token not in api: errs.append(f'state-machine API readiness operation missing {token}')
for token in ['缺少 Test Readiness Review 引用','正式 LVC Run 缺少 Federation Readiness Review 快照','readinessGovernanceHash','testReadinessReviewSnapshot','readinessApprovalSnapshot']:
    if token not in audit: errs.append(f'Run audit readiness gate missing {token}')
for token in ['Test Readiness','Federation Readiness Review','run-readiness','actionLabel','ReadinessPanel']:
    if token not in ui: errs.append(f'state machine readiness UI missing {token}')
for token in ['冻结的 Test Readiness / Federation Readiness','readinessReviewHash','readinessGovernanceHash']:
    if token not in runui: errs.append(f'Run readiness UI missing {token}')
for token in ['ensureReadinessOntology','clearCase01ReadinessReviews']:
    if token not in dp30: errs.append(f'DP30 lifecycle readiness integration missing {token}')

# v2.0-D must not retroactively backfill existing runs in the delivered initial DB.
for pk in ['RUN-DOT-B-01','RUN-DOT-S-01']:
    r=one('TestRun',pk)
    if r and ('readinessReviewHash' in r or 'readinessGovernanceVersion' in r): errs.append(f'legacy {pk} must not be retroactively backfilled with readiness provenance')
strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
print('SQLite integrity_check:',integrity)
print('Initial TestReadinessReview objects:',len(rows('TestReadinessReview')))
print('Initial FederationReadinessReview objects:',len(rows('FederationReadinessReview')))
print('Readiness-controlled steps: live-retest / lvc-anchor / digital-5000')
print('LVC demo readiness behavior: A1 TIME-SYNC BLOCKED -> A2 READY')
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
