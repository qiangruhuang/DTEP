import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getGovernanceActor, getStepPolicy, recordDataQualitySignature } from '@/lib/case01-governance'
import { getRunControlState, runControlRequiredForStep, type RunControlStepId } from '@/lib/run-control-monitoring'

export type RunDataQualityStepId = RunControlStepId
export type RunDataQualityOperation = 'reconstruct' | 'remediate-reconstruct'
export type RunDataQualityStatus = 'NOT_REQUIRED' | 'WAITING_RUN_CONTROL' | 'NOT_RECONSTRUCTED' | 'BLOCKED' | 'READY_FOR_EVIDENCE'

const PROFILES: Record<RunDataQualityStepId, { runRef: string; mode: 'Live' | 'LVC' | 'Digital' }> = {
  'live-retest': { runRef: 'RUN-LIVE-002-02', mode: 'Live' },
  'lvc-anchor': { runRef: 'RUN-LVC-004-FRM-01', mode: 'LVC' },
  'digital-5000': { runRef: 'RUN-DOT-S-02', mode: 'Digital' },
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
function sha256(value: unknown) { return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}` }
function nowIso() { return new Date().toISOString() }

async function ensureType(apiName: string, displayName: string, description: string, icon: string) {
  const current = await db.objectType.findUnique({ where: { apiName } })
  return current ?? db.objectType.create({ data: { apiName, displayName, description, icon } })
}
async function objectType(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 本体未初始化`)
  return t
}
async function ensureLink(apiName: string, displayName: string, sourceApi: string, targetApi: string) {
  if (await db.linkType.findFirst({ where: { apiName } })) return
  const [source, target] = await Promise.all([objectType(sourceApi), objectType(targetApi)])
  await db.linkType.create({ data: { apiName, displayName, sourceTypeId: source.id, targetTypeId: target.id, cardinality: '一对多' } })
}
async function entry(apiName: string, pk: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return null
  const row = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!row) return null
  return { ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }
}
async function entries(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return []
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id }, orderBy: { updatedAt: 'asc' } })
  return rows.map((row) => ({ ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }))
}
async function createEntry(apiName: string, pk: string, title: string, data: Record<string, any>) {
  const t = await objectType(apiName)
  if (await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })) throw new Error(`${apiName}/${pk} 已存在；数据重建/质量记录不可覆盖`)
  const row = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return row
}
async function patchEntry(apiName: string, pk: string, patch: Record<string, any>) {
  const current = await entry(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  const next = { ...current.data, ...patch }
  await db.objectEntry.update({ where: { id: current.id }, data: { dataJson: JSON.stringify(next) } })
  return next
}

export function runDataQualityRequiredForStep(stepId: string): stepId is RunDataQualityStepId {
  return stepId in PROFILES
}

export async function ensureRunDataQualityOntology() {
  await ensureType('RunEventReconstruction', 'Run事件重建', '将实装遥测、IDL Topic、模型/Gateway事件、Run Control动作和统一时钟归并为可回放的时间对齐事件账本。', 'list-tree')
  await ensureType('RunDataQualityAssessment', 'Run数据质量评估', '对事件重建执行完整性、时间一致性、重复/乱序、数据缺口和因果链连续性检查，形成正式证据准入判定。', 'scan-search')
  await ensureType('RunDataQualityAction', 'Run数据质量动作', '事件重建、校时、去重和重建等技术处置的追加式审计动作。', 'git-compare-arrows')
  for (const spec of [
    ['reconstructionUsesRunControl', '事件重建—Run控制', 'RunEventReconstruction', 'RunControlSession'],
    ['qualityAssessesReconstruction', '数据质量—事件重建', 'RunDataQualityAssessment', 'RunEventReconstruction'],
    ['qualityActionTargetsReconstruction', '数据质量动作—事件重建', 'RunDataQualityAction', 'RunEventReconstruction'],
    ['runUsesEventReconstruction', '试验Run—事件重建', 'TestRun', 'RunEventReconstruction'],
    ['runUsesDataQualityAssessment', '试验Run—数据质量评估', 'TestRun', 'RunDataQualityAssessment'],
  ] as const) await ensureLink(spec[0], spec[1], spec[2], spec[3])
}

async function latestRunControlSession(stepId: RunDataQualityStepId) {
  const values = (await entries('RunControlSession')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
  return values.at(-1) ?? null
}
async function reconstructions(sessionRef: string) {
  return (await entries('RunEventReconstruction')).filter((x) => x.data.sessionRef === sessionRef)
}
async function assessments(sessionRef: string) {
  return (await entries('RunDataQualityAssessment')).filter((x) => x.data.sessionRef === sessionRef)
}
async function actions(sessionRef: string) {
  return (await entries('RunDataQualityAction')).filter((x) => x.data.sessionRef === sessionRef)
}

function sourceCatalog(mode: 'Live' | 'LVC' | 'Digital') {
  const common = [
    { id: 'SRC-RUN-CONTROL', type: 'RUN_CONTROL', clockDomain: 'DTEP_RUN_EPOCH', required: true },
    { id: 'SRC-CLOCK', type: 'CLOCK', clockDomain: 'TIME-MASTER-01', required: true },
  ]
  if (mode === 'Live') return [
    ...common,
    { id: 'SRC-TELEMETRY', type: 'TELEMETRY', clockDomain: 'RANGE_PTP', required: true },
    { id: 'SRC-RANGE-EVENT', type: 'RANGE_EVENT', clockDomain: 'RANGE_PTP', required: true },
  ]
  if (mode === 'LVC') return [
    ...common,
    { id: 'SRC-TELEMETRY', type: 'TELEMETRY', clockDomain: 'RANGE_PTP', required: true },
    { id: 'SRC-IDL', type: 'IDL_TOPIC', clockDomain: 'FEDERATION_LOGICAL_TIME', required: true },
    { id: 'SRC-MODEL', type: 'MODEL_EVENT', clockDomain: 'FEDERATION_LOGICAL_TIME', required: true },
    { id: 'SRC-GATEWAY', type: 'GATEWAY_EVENT', clockDomain: 'GW_LOCAL_MONOTONIC', required: true },
  ]
  return [
    ...common,
    { id: 'SRC-IDL', type: 'IDL_TOPIC', clockDomain: 'SIM_LOGICAL_TIME', required: true },
    { id: 'SRC-MODEL', type: 'MODEL_EVENT', clockDomain: 'SIM_LOGICAL_TIME', required: true },
    { id: 'SRC-BATCH', type: 'BATCH_EVENT', clockDomain: 'DTEP_RUN_EPOCH', required: true },
  ]
}

type EventRow = {
  eventId: string
  sourceId: string
  sourceType: string
  eventType: string
  semanticKey: string
  captureOrder: number
  sourceTimeMs: number
  alignedTimeMs: number
  payloadDigest: string
  correlationId?: string
  attributes?: Record<string, any>
  note?: string
}

function eventRow(args: Omit<EventRow, 'payloadDigest'>): EventRow {
  return { ...args, payloadDigest: sha256({ eventType: args.eventType, semanticKey: args.semanticKey, sourceTimeMs: args.sourceTimeMs, correlationId: args.correlationId ?? null, attributes: args.attributes ?? null }) }
}

function rawEvents(mode: 'Live' | 'LVC' | 'Digital', corrected: boolean): EventRow[] {
  const base: EventRow[] = [
    eventRow({ eventId: 'EV-001', sourceId: 'SRC-CLOCK', sourceType: 'CLOCK', eventType: 'RunEpoch.Established', semanticKey: 'RUN-EPOCH', captureOrder: 1, sourceTimeMs: 0, alignedTimeMs: 0 }),
    eventRow({ eventId: 'EV-002', sourceId: 'SRC-RUN-CONTROL', sourceType: 'RUN_CONTROL', eventType: 'Run.Start', semanticKey: 'RUN-START', captureOrder: 2, sourceTimeMs: 120, alignedTimeMs: 120 }),
    eventRow({ eventId: 'EV-003', sourceId: mode === 'Live' ? 'SRC-RANGE-EVENT' : 'SRC-IDL', sourceType: mode === 'Live' ? 'RANGE_EVENT' : 'IDL_TOPIC', eventType: 'Mission.Command', semanticKey: 'CMD-MT01-S0', captureOrder: 3, sourceTimeMs: 1000, alignedTimeMs: 1000, correlationId: 'CHAIN-01', attributes: { commandType: 'initial-tasking', missionThread: 'MT-01' } }),
    eventRow({ eventId: 'EV-004', sourceId: mode === 'Digital' ? 'SRC-MODEL' : 'SRC-TELEMETRY', sourceType: mode === 'Digital' ? 'MODEL_EVENT' : 'TELEMETRY', eventType: 'Platform.State', semanticKey: 'X9A-STATE-01', captureOrder: 4, sourceTimeMs: 1260, alignedTimeMs: 1260, correlationId: 'CHAIN-01', attributes: { platform: 'X9A', state: 'MISSION_ACTIVE' } }),
    eventRow({ eventId: 'EV-005', sourceId: mode === 'Live' ? 'SRC-RANGE-EVENT' : 'SRC-MODEL', sourceType: mode === 'Live' ? 'RANGE_EVENT' : 'MODEL_EVENT', eventType: 'Sensor.Track', semanticKey: 'TRACK-TGT-17', captureOrder: 5, sourceTimeMs: 2120, alignedTimeMs: 2120, correlationId: 'CHAIN-01', attributes: { targetId: 'TGT-17', trackQuality: 0.94 } }),
    eventRow({ eventId: 'EV-006', sourceId: mode === 'Live' ? 'SRC-TELEMETRY' : 'SRC-IDL', sourceType: mode === 'Live' ? 'TELEMETRY' : 'IDL_TOPIC', eventType: 'EW.Status', semanticKey: 'EW-STATUS-75', captureOrder: 6, sourceTimeMs: 2680, alignedTimeMs: 2680, correlationId: 'CHAIN-01', attributes: { ewIntensityPct: 75, jsDb: 22 } }),
    ...(mode === 'Live' ? [eventRow({ eventId: 'EV-006-LINK', sourceId: 'SRC-TELEMETRY', sourceType: 'TELEMETRY', eventType: 'Link.RangeAchieved', semanticKey: 'LINK-RANGE-208KM', captureOrder: 7, sourceTimeMs: 4200, alignedTimeMs: 4200, correlationId: 'CHAIN-01', attributes: { rangeKm: 208, linkStable: true } })] : []),
    ...(mode === 'LVC' ? [eventRow({ eventId: 'EV-007-GW', sourceId: 'SRC-GATEWAY', sourceType: 'GATEWAY_EVENT', eventType: 'Gateway.Forward', semanticKey: 'GW-HLA-TRACK', captureOrder: 7, sourceTimeMs: 3540, alignedTimeMs: 3540, correlationId: 'CHAIN-01', attributes: { gateway: 'GW-HLA-01', topic: 'Sensor.Track' } })] : []),
    ...(mode === 'Digital' ? [eventRow({ eventId: 'EV-007-BATCH', sourceId: 'SRC-BATCH', sourceType: 'BATCH_EVENT', eventType: 'Checkpoint.Commit', semanticKey: 'CHECKPOINT-01', captureOrder: 7, sourceTimeMs: 3540, alignedTimeMs: 3540, correlationId: 'CHAIN-01', attributes: { completedReplications: 1200 } })] : []),
    eventRow({ eventId: 'EV-010-INTEL', sourceId: mode === 'Live' ? 'SRC-RANGE-EVENT' : 'SRC-IDL', sourceType: mode === 'Live' ? 'RANGE_EVENT' : 'IDL_TOPIC', eventType: 'Intel.Distributed', semanticKey: 'INTEL-TGT-17', captureOrder: 10, sourceTimeMs: 13520, alignedTimeMs: 13520, correlationId: 'CHAIN-01', attributes: { targetId: 'TGT-17', recipients: 4, deliveryComplete: true } }),
    eventRow({ eventId: 'EV-011-REPLAN', sourceId: mode === 'Digital' ? 'SRC-MODEL' : mode === 'LVC' ? 'SRC-IDL' : 'SRC-RANGE-EVENT', sourceType: mode === 'Digital' ? 'MODEL_EVENT' : mode === 'LVC' ? 'IDL_TOPIC' : 'RANGE_EVENT', eventType: 'Decision.Replan', semanticKey: 'REPLAN-TGT-17', captureOrder: 11, sourceTimeMs: 14200, alignedTimeMs: 14200, correlationId: 'CHAIN-01', attributes: { planId: 'PLAN-B', accepted: true } }),
    eventRow({ eventId: 'EV-012-WEAPON', sourceId: mode === 'Live' ? 'SRC-RANGE-EVENT' : 'SRC-MODEL', sourceType: mode === 'Live' ? 'RANGE_EVENT' : 'MODEL_EVENT', eventType: 'Weapon.Engagement', semanticKey: 'ENGAGE-TGT-17', captureOrder: 12, sourceTimeMs: mode === 'LVC' ? 16022 : 16000, alignedTimeMs: mode === 'LVC' && corrected ? 16000 : mode === 'LVC' ? 16022 : 16000, correlationId: 'CHAIN-01', attributes: { targetId: 'TGT-17', weaponReleased: true } }),
    eventRow({ eventId: 'EV-013-DAMAGE', sourceId: mode === 'Live' ? 'SRC-TELEMETRY' : 'SRC-IDL', sourceType: mode === 'Live' ? 'TELEMETRY' : 'IDL_TOPIC', eventType: 'Damage.Result', semanticKey: 'DAMAGE-TGT-17', captureOrder: 13, sourceTimeMs: mode === 'LVC' ? 15992 : 16400, alignedTimeMs: mode === 'LVC' && corrected ? 16400 : mode === 'LVC' ? 15992 : 16400, correlationId: 'CHAIN-01', attributes: { targetId: 'TGT-17', effect: 'MISSION_KILL' } }),
    eventRow({ eventId: 'EV-014-COMPLETE', sourceId: mode === 'Digital' ? 'SRC-MODEL' : mode === 'LVC' ? 'SRC-IDL' : 'SRC-RANGE-EVENT', sourceType: mode === 'Digital' ? 'MODEL_EVENT' : mode === 'LVC' ? 'IDL_TOPIC' : 'RANGE_EVENT', eventType: 'Mission.Complete', semanticKey: 'MT01-COMPLETE', captureOrder: 14, sourceTimeMs: 18000, alignedTimeMs: 18000, correlationId: 'CHAIN-01', attributes: { missionSuccess: true } }),
    ...(mode === 'Digital' ? [
      eventRow({ eventId: 'EV-015-OUTCOME', sourceId: 'SRC-BATCH', sourceType: 'BATCH_EVENT', eventType: 'Batch.MissionOutcome', semanticKey: 'M13-5000', captureOrder: 15, sourceTimeMs: 19000, alignedTimeMs: 19000, correlationId: 'BATCH-5000', attributes: { successCount: 4160, totalCount: 5000, successRatePct: 83.2, ci95LowerPct: 82.1, ci95UpperPct: 84.2 } }),
      eventRow({ eventId: 'EV-016-NRMSE', sourceId: 'SRC-BATCH', sourceType: 'BATCH_EVENT', eventType: 'Twin.ErrorSummary', semanticKey: 'M14-NRMSE', captureOrder: 16, sourceTimeMs: 19200, alignedTimeMs: 19200, correlationId: 'BATCH-5000', attributes: { nrmsePct: 6.8, anchorRefs: ['RUN-LIVE-002-02', 'RUN-LVC-004-FRM-01'] } }),
    ] : []),
    eventRow({ eventId: 'EV-020', sourceId: 'SRC-RUN-CONTROL', sourceType: 'RUN_CONTROL', eventType: 'Run.PrepareComplete', semanticKey: 'RUN-PREPARE-COMPLETE', captureOrder: 20, sourceTimeMs: 20000, alignedTimeMs: 20000 }),
  ]
  if (mode === 'LVC') {
    base.splice(6, 0, eventRow({ eventId: 'EV-005-DUP', sourceId: 'SRC-GATEWAY', sourceType: 'GATEWAY_EVENT', eventType: 'Sensor.Track', semanticKey: 'TRACK-TGT-17', captureOrder: 7, sourceTimeMs: 2122, alignedTimeMs: corrected ? 2120 : 2122, correlationId: 'CHAIN-01', attributes: { targetId: 'TGT-17', trackQuality: 0.94 }, note: 'HLA↔DDS gateway replay duplicate' }))
    base.forEach((event, index) => { event.captureOrder = index + 1 })
  } else {
    base.forEach((event, index) => { event.captureOrder = index + 1 })
  }
  return base
}

function canonicalize(events: EventRow[], corrected: boolean) {
  const sorted = [...events].sort((a, b) => a.alignedTimeMs - b.alignedTimeMs || a.captureOrder - b.captureOrder)
  if (!corrected) return sorted
  const seen = new Set<string>()
  return sorted.filter((event) => {
    const key = `${event.eventType}|${event.semanticKey}|${event.correlationId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function evaluateLedger(mode: 'Live' | 'LVC' | 'Digital', raw: EventRow[], canonical: EventRow[], corrected: boolean, toleranceMs: number) {
  const requiredSources = sourceCatalog(mode).filter((x) => x.required).map((x) => x.id)
  const presentSources = new Set(raw.map((x) => x.sourceId))
  const missingSources = requiredSources.filter((id) => !presentSources.has(id))
  const duplicateGroups = new Map<string, number>()
  raw.forEach((x) => {
    const key = `${x.eventType}|${x.semanticKey}|${x.correlationId ?? ''}`
    duplicateGroups.set(key, (duplicateGroups.get(key) ?? 0) + 1)
  })
  const duplicateCount = [...duplicateGroups.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0)
  const canonicalDuplicateCount = Math.max(0, canonical.length - new Set(canonical.map((x) => `${x.eventType}|${x.semanticKey}|${x.correlationId ?? ''}`)).size)
  const captureSequence = [...raw].sort((a, b) => a.captureOrder - b.captureOrder)
  const outOfOrderCount = captureSequence.reduce((count, event, index) => index > 0 && event.alignedTimeMs < captureSequence[index - 1].alignedTimeMs ? count + 1 : count, 0)
  const eventByType = new Map(canonical.map((x) => [x.eventType, x]))
  const chain = ['Mission.Command', 'Sensor.Track', 'Weapon.Engagement', 'Damage.Result']
  const missingChain = chain.filter((x) => !eventByType.has(x))
  let causalViolations = 0
  for (let i = 1; i < chain.length; i += 1) {
    const prev = eventByType.get(chain[i - 1]); const next = eventByType.get(chain[i])
    if (prev && next && next.alignedTimeMs < prev.alignedTimeMs) causalViolations += 1
  }
  const maxClockResidualMs = mode === 'LVC' ? (corrected ? 4.8 : 22) : mode === 'Live' ? 3.2 : 0.8
  const gapCount = 0
  const checks = [
    { id: 'DQ-SOURCE-COVERAGE', label: '多源数据覆盖', pass: missingSources.length === 0, severity: 'hard', evidence: missingSources.length ? `缺少 ${missingSources.join(', ')}` : `${requiredSources.length}/${requiredSources.length} 必需数据源均可解析` },
    { id: 'DQ-EPOCH-ALIGNMENT', label: 'Run Epoch / 时钟对齐', pass: maxClockResidualMs <= toleranceMs, severity: 'hard', evidence: `最大残余时差 ${maxClockResidualMs} ms；容差 ${toleranceMs} ms` },
    { id: 'DQ-DUPLICATE', label: '重复事件消解', pass: canonicalDuplicateCount === 0, severity: 'hard', evidence: `原始重复 ${duplicateCount}；规范账本剩余重复 ${canonicalDuplicateCount}` },
    { id: 'DQ-ORDER', label: '事件顺序一致性', pass: outOfOrderCount === 0, severity: 'hard', evidence: `规范账本乱序事件 ${outOfOrderCount}` },
    { id: 'DQ-GAP', label: '关键数据缺口', pass: gapCount === 0, severity: 'hard', evidence: `关键事件窗口 gap ${gapCount}` },
    { id: 'DQ-CAUSAL-CHAIN', label: '任务关键因果链连续性', pass: missingChain.length === 0 && causalViolations === 0, severity: 'hard', evidence: missingChain.length ? `缺失 ${missingChain.join(' → ')}` : `Mission.Command → Sensor.Track → Weapon.Engagement → Damage.Result；倒序 ${causalViolations}` },
    { id: 'DQ-PROVENANCE', label: '来源与载荷摘要完整', pass: canonical.every((x) => Boolean(x.sourceId && x.payloadDigest)), severity: 'hard', evidence: `${canonical.filter((x) => x.sourceId && x.payloadDigest).length}/${canonical.length} 事件具备 Source + Payload Digest` },
  ]
  const hardFailures = checks.filter((x) => !x.pass && x.severity === 'hard')
  const score = Math.max(0, Math.round(100 - hardFailures.length * 18 - Math.min(8, duplicateCount * 4)))
  return { checks, hardFailures, score, duplicateCount, canonicalDuplicateCount, outOfOrderCount, causalViolations, gapCount, maxClockResidualMs, missingSources }
}

async function createQualityAction(stepId: RunDataQualityStepId, sessionRef: string, actorId: string, action: string, detail: Record<string, any>) {
  const actor = getGovernanceActor(actorId)
  const policy = getStepPolicy(stepId)
  if (actor.roleId !== policy.executorRole) throw new Error(`数据质量处置必须由“${actor.roleName}”岗位执行`)
  const performedAt = nowIso()
  const signature = await recordDataQualitySignature(stepId, actorId, { caseId: 'CASE-01', sessionRef, action, performedAt, detail })
  const base = { schema: 'dtep/run-data-quality-action/v2.0f', caseId: 'CASE-01', stepId, sessionRef, action, performedAt, performedBy: actor.id, performedByName: `${actor.title} · ${actor.name}`, performedByRole: actor.roleId, detail, signatureRef: signature.code, signatureHash: signature.signatureHash, immutable: true }
  const actionHash = sha256(base)
  const existing = await actions(sessionRef)
  const code = `RDQA-CASE01-${stepId.toUpperCase()}-${String(existing.length + 1).padStart(2, '0')}`
  await createEntry('RunDataQualityAction', code, `${PROFILES[stepId].runRef} · ${action}`, { code, ...base, actionHash })
  return { code, ...base, actionHash }
}

async function reconstruct(stepId: RunDataQualityStepId, actorId: string, corrected: boolean) {
  await ensureRunDataQualityOntology()
  const runControl = await getRunControlState(stepId, actorId)
  if (!runControl.required || runControl.status !== 'READY_TO_COMPLETE' || !runControl.session) throw new Error('Run Control 尚未进入 READY_TO_COMPLETE，不能冻结事件重建')
  const sessionRef = String(runControl.session.code)
  const prior = await reconstructions(sessionRef)
  const attempt = prior.length + 1
  if (!corrected && attempt > 1) throw new Error('首轮重建已存在；阻塞后请执行校时/去重并重建')
  if (corrected && !prior.length) throw new Error('尚无首轮重建，不能直接执行整改重建')
  const profile = PROFILES[stepId]
  const toleranceMs = Number(runControl.session?.controlPolicy?.timeSync?.pauseMs ?? 10)
  const raw = rawEvents(profile.mode, corrected)
  const canonical = canonicalize(raw, corrected)
  const evalResult = evaluateLedger(profile.mode, raw, canonical, corrected, toleranceMs)
  const sourceStats = sourceCatalog(profile.mode).map((source) => ({ ...source, rawCount: raw.filter((x) => x.sourceId === source.id).length, canonicalCount: canonical.filter((x) => x.sourceId === source.id).length }))
  const correctionModel = corrected ? {
    toleranceMs,
    method: 'piecewise-clock-correction + semantic-deduplication',
    authority: runControl.session?.environmentRef ? 'TIME-MASTER-01 / frozen RunHealthSnapshots' : 'DTEP_RUN_EPOCH',
    segments: (runControl.snapshots ?? []).map((snapshot: any) => ({ healthRef: snapshot.code, cycle: snapshot.cycle, observedOffsetMs: snapshot.timeSync?.maxOffsetMs ?? 0, severity: snapshot.severity })),
    lvcCorrection: profile.mode === 'LVC' ? { modelClockCorrectionMs: -22, idlClockCorrectionMs: 268, note: 'DEMO/SYNTHETIC：以冻结健康快照与相关事件对进行分段校时，恢复关键因果顺序。' } : null,
    deduplicationKey: 'eventType + semanticKey + correlationId',
  } : { toleranceMs, method: 'raw-source-time merge', authority: 'source timestamps only', segments: [] }
  const reconstructionManifest = {
    schema: 'dtep/time-aligned-event-reconstruction/v2.0f', caseId: 'CASE-01', stepId, runRef: profile.runRef, sessionRef,
    attempt, mode: profile.mode, corrected, runEpoch: { id: `${sessionRef}-EPOCH`, zero: runControl.session?.startedAt ?? null, unit: 'ms' },
    sourceCatalog: sourceStats, correctionModel,
    rawEventStats: { streamRows: profile.mode === 'Digital' ? 5000000 : profile.mode === 'LVC' ? 2840000 : 1864200, sampleRows: raw.length, duplicateCount: evalResult.duplicateCount },
    canonicalEventStats: { indexedRows: profile.mode === 'Digital' ? 5000000 : profile.mode === 'LVC' ? (corrected ? 2839999 : 2840000) : 1864200, sampleRows: canonical.length, maxClockResidualMs: evalResult.maxClockResidualMs, gapCount: evalResult.gapCount },
    rawEventSample: raw,
    canonicalTimeline: canonical,
    sourceDatasetRefs: profile.mode === 'Live' ? ['raw/telemetry/F-2206-R2'] : profile.mode === 'LVC' ? ['raw/telemetry/F-2206-R2', 'raw/simulation/lvc-02'] : ['raw/simulation/dot-stress-v2'],
    runControlHealthRefs: (runControl.snapshots ?? []).map((x: any) => x.code),
    runControlActionRefs: (runControl.actions ?? []).map((x: any) => x.code),
    immutable: true,
  }
  const reconstructionHash = sha256(reconstructionManifest)
  const reconstructionCode = `RER-CASE01-${stepId.toUpperCase()}-A${attempt}`
  await createEntry('RunEventReconstruction', reconstructionCode, `${profile.runRef} · Time-Aligned Event Reconstruction · A${attempt}`, { code: reconstructionCode, ...reconstructionManifest, reconstructionHash, createdAt: nowIso() })
  const assessmentBase = {
    schema: 'dtep/run-data-quality-assessment/v2.0f', caseId: 'CASE-01', stepId, runRef: profile.runRef, sessionRef, attempt,
    reconstructionRef: reconstructionCode, reconstructionHash, checks: evalResult.checks,
    hardFailures: evalResult.hardFailures.map((x) => x.id), softWarnings: [], qualityScore: evalResult.score,
    decision: evalResult.hardFailures.length ? 'BLOCKED' : 'READY_FOR_EVIDENCE', evidenceEligible: evalResult.hardFailures.length === 0,
    assessedAt: nowIso(), assessor: 'DTEP Data Quality Service', immutable: true,
  }
  const assessmentHash = sha256(assessmentBase)
  const assessmentCode = `RDQ-CASE01-${stepId.toUpperCase()}-A${attempt}`
  await createEntry('RunDataQualityAssessment', assessmentCode, `${profile.runRef} · Run Data Quality · A${attempt}`, { code: assessmentCode, ...assessmentBase, assessmentHash })
  await createQualityAction(stepId, sessionRef, actorId, corrected ? 'TIME_ALIGN_DEDUP_RECONSTRUCT' : 'RECONSTRUCT_AND_ASSESS', { reconstructionRef: reconstructionCode, assessmentRef: assessmentCode, decision: assessmentBase.decision, qualityScore: assessmentBase.qualityScore, hardFailures: assessmentBase.hardFailures })
  return { reconstructionCode, assessmentCode, decision: assessmentBase.decision }
}

export async function getRunDataQualityState(stepId: string, actorId?: string | null) {
  if (!runDataQualityRequiredForStep(stepId)) return { required: false, status: 'NOT_REQUIRED' as RunDataQualityStatus, readyForEvidence: true }
  await ensureRunDataQualityOntology()
  const control = await getRunControlState(stepId, actorId)
  const policy = getStepPolicy(stepId)
  const actor = actorId ? getGovernanceActor(actorId) : null
  const allowed = Boolean(actor && actor.roleId === policy.executorRole)
  if (!control.required || control.status !== 'READY_TO_COMPLETE' || !control.session) return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, status: 'WAITING_RUN_CONTROL' as RunDataQualityStatus, readyForEvidence: false, allowed,
    requiredRole: policy.executorRole, actionLabel: '等待 Run Control 完成', latestReconstruction: null, latestAssessment: null, reconstructions: [], assessments: [], actions: [], blockers: ['Run Control 尚未进入 READY_TO_COMPLETE'],
    note: '事件重建必须使用已冻结的运行健康快照、控制动作和 Run Epoch，因此不能早于 Run Control 完成前确认。',
  }
  const sessionRef = String(control.session.code)
  const [recs, assmts, actionRows] = await Promise.all([reconstructions(sessionRef), assessments(sessionRef), actions(sessionRef)])
  const latestReconstruction = recs.at(-1)?.data ?? null
  const latestAssessment = assmts.at(-1)?.data ?? null
  const status: RunDataQualityStatus = !latestAssessment ? 'NOT_RECONSTRUCTED' : latestAssessment.decision === 'READY_FOR_EVIDENCE' ? 'READY_FOR_EVIDENCE' : 'BLOCKED'
  return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, executionMode: PROFILES[stepId].mode, sessionRef, status,
    readyForEvidence: status === 'READY_FOR_EVIDENCE', allowed, requiredRole: policy.executorRole,
    actionLabel: status === 'NOT_RECONSTRUCTED' ? '重建事件时间线并评估' : status === 'BLOCKED' ? '校时/去重并重建' : '数据质量已冻结',
    latestReconstruction, latestAssessment, reconstructions: recs.map((x) => x.data), assessments: assmts.map((x) => x.data), actions: actionRows.map((x) => x.data),
    blockers: latestAssessment?.hardFailures ?? [],
    note: '原始多源事件保持不变；校时、去重和因果重建生成新版本，不覆盖首轮失败记录。正式Run只有 READY_FOR_EVIDENCE 才允许执行最终签署。',
  }
}

async function assertExecutor(stepId: RunDataQualityStepId, actorId: string) {
  const actor = getGovernanceActor(actorId)
  const policy = getStepPolicy(stepId)
  if (actor.roleId !== policy.executorRole) throw new Error(`当前事件重建必须由“${actor.roleName}”岗位执行`)
  const approval = await entry('ApprovalRecord', `APR-CASE01-${stepId}`)
  if (!approval || approval.data.status !== 'approved') throw new Error('正式Run尚未获得步骤审批，不能执行数据重建/质量冻结')
}

export async function executeRunDataQualityOperation(stepId: RunDataQualityStepId, operation: RunDataQualityOperation, actorId: string) {
  await assertExecutor(stepId, actorId)
  const state = await getRunDataQualityState(stepId, actorId)
  if (state.status === 'WAITING_RUN_CONTROL') throw new Error('Run Control尚未完成，不能开始事件重建')
  if (operation === 'reconstruct') {
    if (state.status !== 'NOT_RECONSTRUCTED') throw new Error(`当前状态${state.status}不能执行首轮重建`)
    await reconstruct(stepId, actorId, false)
  } else if (operation === 'remediate-reconstruct') {
    if (state.status !== 'BLOCKED') throw new Error(`当前状态${state.status}不需要整改重建`)
    await reconstruct(stepId, actorId, true)
  } else throw new Error(`未知 Run Data Quality operation: ${operation}`)
  return getRunDataQualityState(stepId, actorId)
}

export async function assertRunDataQualityReadyForEvidence(stepId: string) {
  if (!runDataQualityRequiredForStep(stepId)) return null
  const state = await getRunDataQualityState(stepId)
  if (!state.readyForEvidence || !state.latestAssessment || !state.latestReconstruction) throw new Error('Run Data Quality 尚未进入 READY_FOR_EVIDENCE；请先完成时间对齐事件重建和数据质量评估')
  return state
}

export async function bindRunToDataQuality(runData: Record<string, any>, stepId: RunDataQualityStepId) {
  const state = await assertRunDataQualityReadyForEvidence(stepId)
  if (!state) return runData
  const sessionRef = String(state.sessionRef)
  const actionRows = await actions(sessionRef)
  const reconstruction = state.latestReconstruction
  const assessment = state.latestAssessment
  if (!reconstruction || !assessment) throw new Error('Run Data Quality状态缺少冻结重建/评估')
  const manifest = { schema: 'dtep/run-data-quality-provenance/v2.0f', caseId: 'CASE-01', stepId, sessionRef, reconstruction, assessment, actions: actionRows.map((x) => x.data) }
  return {
    ...runData,
    runDataQualityVersion: 'v2.0f',
    eventReconstructionRef: reconstruction.code,
    eventReconstructionSnapshot: reconstruction,
    eventReconstructionHash: reconstruction.reconstructionHash,
    dataQualityAssessmentRef: assessment.code,
    dataQualityAssessmentSnapshot: assessment,
    dataQualityAssessmentHash: assessment.assessmentHash,
    dataQualityActionRefs: actionRows.map((x) => x.data.code),
    dataQualityActions: actionRows.map((x) => x.data),
    runDataQualityHash: sha256(manifest),
    formalEvidenceDataQuality: assessment.decision,
    runDataQualityBindingMode: 'frozen-before-final-execution-signature',
  }
}

export async function finalizeRunDataQuality(stepId: string, executionSignature: Record<string, any>) {
  if (!runDataQualityRequiredForStep(stepId)) return
  const state = await assertRunDataQualityReadyForEvidence(stepId)
  if (!state) return
  const reconstruction = state.latestReconstruction
  const assessment = state.latestAssessment
  if (!reconstruction || !assessment) throw new Error('Run Data Quality状态缺少冻结重建/评估')
  const finalPayload = {
    schema: 'dtep/run-data-quality-final/v2.0f', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef,
    reconstructionRef: reconstruction.code, reconstructionHash: reconstruction.reconstructionHash,
    assessmentRef: assessment.code, assessmentHash: assessment.assessmentHash,
    executionSignatureRef: executionSignature.code, executionSignatureHash: executionSignature.signatureHash,
  }
  const finalHash = sha256(finalPayload)
  await patchEntry('RunDataQualityAssessment', assessment.code, { finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalDataQualityHash: finalHash })
  const run = await entry('TestRun', PROFILES[stepId].runRef)
  if (run) await patchEntry('TestRun', run.pk, { runDataQualityFinalHash: finalHash, runDataQualityFinalExecutionSignatureRef: executionSignature.code, runDataQualityFinalExecutionSignatureHash: executionSignature.signatureHash, dataQualityAssessmentSnapshot: { ...assessment, finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalDataQualityHash: finalHash } })
}

export async function clearCase01RunDataQualityRecords() {
  for (const apiName of ['RunDataQualityAction', 'RunDataQualityAssessment', 'RunEventReconstruction']) {
    const t = await db.objectType.findUnique({ where: { apiName } })
    if (!t) continue
    const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
    const selected = rows.filter((row) => {
      try { return JSON.parse(row.dataJson || '{}').caseId === 'CASE-01' } catch { return false }
    })
    if (selected.length) await db.objectEntry.deleteMany({ where: { id: { in: selected.map((x) => x.id) } } })
    await db.objectType.update({ where: { id: t.id }, data: { objectCount: await db.objectEntry.count({ where: { objectTypeId: t.id } }) } })
  }
}
