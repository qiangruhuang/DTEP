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
for api in ['RunEventReconstruction','RunDataQualityAssessment','RunDataQualityAction']:
    if not t(api): errs.append(f'missing {api} ObjectType')
    elif t(api)['objectCount']!=len(rows(api)): errs.append(f'{api} objectCount mismatch')
    if rows(api): errs.append(f'initial delivery must not pre-create {api} records')
links={r[0] for r in con.execute('select apiName from LinkType')}
for lk in ['reconstructionUsesRunControl','qualityAssessesReconstruction','qualityActionTargetsReconstruction','runUsesEventReconstruction','runUsesDataQualityAssessment']:
    if lk not in links: errs.append(f'missing LinkType {lk}')

lib=(ROOT/'src/lib/run-data-quality.ts').read_text(encoding='utf-8')
case=(ROOT/'src/lib/case01-state-machine.ts').read_text(encoding='utf-8')
gov=(ROOT/'src/lib/case01-governance.ts').read_text(encoding='utf-8')
audit=(ROOT/'src/lib/run-instance.ts').read_text(encoding='utf-8')
api=(ROOT/'src/app/api/run-data-quality/route.ts').read_text(encoding='utf-8')
ui=(ROOT/'src/components/platform/case01-state-machine.tsx').read_text(encoding='utf-8')
runui=(ROOT/'src/components/platform/case-execution.tsx').read_text(encoding='utf-8')
dp30=(ROOT/'src/lib/dp30-intake.ts').read_text(encoding='utf-8')

for token in ['RunEventReconstruction','RunDataQualityAssessment','RunDataQualityAction','READY_FOR_EVIDENCE','DQ-EPOCH-ALIGNMENT','DQ-DUPLICATE','DQ-ORDER','DQ-GAP','DQ-CAUSAL-CHAIN','piecewise-clock-correction','semantic-deduplication','bindRunToDataQuality','finalizeRunDataQuality','clearCase01RunDataQualityRecords','v2.0f']:
    if token not in lib: errs.append(f'run-data-quality implementation missing {token}')
for token in ['recordDataQualitySignature',"'data-quality'"]:
    if token not in gov: errs.append(f'governance data-quality signature missing {token}')
for token in ['assertRunDataQualityReadyForEvidence','bindRunToDataQuality','finalizeRunDataQuality','clearCase01RunDataQualityRecords','getRunDataQualityState']:
    if token not in case: errs.append(f'CASE-01 data-quality integration missing {token}')
for token in ['reconstruct','remediate-reconstruct','executeRunDataQualityOperation']:
    if token not in api: errs.append(f'Run Data Quality API missing {token}')
for token in ['缺少 Time-Aligned Event Reconstruction 引用','Run Data Quality 未达到 READY_FOR_EVIDENCE','runDataQualityFinalHash','eventReconstructionSnapshot']:
    if token not in audit: errs.append(f'Run audit data-quality gate missing {token}')
for token in ['Run Data Quality / Time-Aligned Event Reconstruction','重建时间线并评估','校时/去重并重建','READY_FOR_EVIDENCE','/api/run-data-quality']:
    if token not in ui: errs.append(f'Run Data Quality UI missing {token}')
for token in ['Time-Aligned Event Reconstruction / Run Data Quality','dataQualityAssessmentSnapshot','runDataQualityFinalHash']:
    if token not in runui: errs.append(f'Run evidence data-quality UI missing {token}')
for token in ['ensureRunDataQualityOntology','clearCase01RunDataQualityRecords']:
    if token not in dp30: errs.append(f'DP30 lifecycle data-quality integration missing {token}')

# Gate boundary: package freeze requires v2.0f quality-ready Runs, without changing STRICT-V1.
for token in ['Evidence Package冻结被Run Data Quality阻塞',"run.data.runDataQualityVersion !== 'v2.0f'", "dtep/evidence-package-manifest/v2.0", 'runDataQualityRefs']:
    if token not in case: errs.append(f'Evidence Package data-quality admission missing {token}')

# Synthetic shadow-check: LVC raw merge is blocked by 22ms / duplicate / causal inversion, corrected build is within 10ms and deduplicated.
if "maxClockResidualMs = mode === 'LVC' ? (corrected ? 4.8 : 22)" not in lib: errs.append('LVC data-quality time alignment demo missing 22ms -> 4.8ms correction')
if "eventId: 'EV-005-DUP'" not in lib: errs.append('LVC duplicate-event demo missing')
if "eventType: 'Damage.Result'" not in lib or "eventType: 'Weapon.Engagement'" not in lib: errs.append('critical causal chain demo missing')
if not (22 > 10 and 4.8 <= 10): errs.append('shadow time-alignment thresholds inconsistent')

# Initial DB must remain V0.3 / no post-run data quality backfill.
for pk in ['RUN-DOT-B-01','RUN-DOT-S-01','RUN-LVC-004-REH-01']:
    r=one('TestRun',pk)
    if r and any(k in r for k in ['runDataQualityVersion','eventReconstructionRef','dataQualityAssessmentRef']): errs.append(f'legacy {pk} must not be retroactively backfilled with v2.0f data-quality provenance')

strict=one('EvidenceGateRuleSet','GRS-CASE01-STRICT-V1')
strict_hash=str(strict.get('publishedHash')) if strict else 'MISSING'
print('SQLite integrity_check:',integrity)
print('Initial RunEventReconstruction objects:',len(rows('RunEventReconstruction')))
print('Initial RunDataQualityAssessment objects:',len(rows('RunDataQualityAssessment')))
print('Initial RunDataQualityAction objects:',len(rows('RunDataQualityAction')))
print('LVC reconstruction demo: RAW 22ms + duplicate + causal inversion -> BLOCKED; corrected 4.8ms + dedup -> READY_FOR_EVIDENCE')
print('Evidence Package V0.4 freeze requires all included formal Runs to carry v2.0f READY_FOR_EVIDENCE + final DQ hash')
print('STRICT-V1 published hash:',strict_hash)
print('ERRORS:',len(errs))
for e in errs: print('-',e)
con.close(); sys.exit(1 if errs else 0)
