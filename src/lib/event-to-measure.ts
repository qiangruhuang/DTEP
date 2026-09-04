import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getGovernanceActor, getStepPolicy, recordAdjudicationSignature } from '@/lib/case01-governance'
import { getRunDataQualityState, runDataQualityRequiredForStep, type RunDataQualityStepId } from '@/lib/run-data-quality'
import ruleBody from '@/lib/case01-adjudication-rules.json'

export type EventToMeasureStepId = RunDataQualityStepId
export type AutomatedAdjudicationOperation = 'adjudicate'
export type AutomatedAdjudicationStatus = 'NOT_REQUIRED' | 'WAITING_DATA_QUALITY' | 'NOT_ADJUDICATED' | 'BLOCKED' | 'READY_FOR_RUN_SIGNOFF'

const RULESET_ID = 'ARS-CASE01-E2M-v1'
const PROFILES: Record<EventToMeasureStepId, { runRef: string; executionMode: 'Live' | 'LVC' | 'Digital'; measureRefs: string[] }> = {
  'live-retest': { runRef: 'RUN-LIVE-002-02', executionMode: 'Live', measureRefs: ['M-03'] },
  'lvc-anchor': { runRef: 'RUN-LVC-004-FRM-01', executionMode: 'LVC', measureRefs: ['M-08'] },
  'digital-5000': { runRef: 'RUN-DOT-S-02', executionMode: 'Digital', measureRefs: ['M-13', 'M-14'] },
}

const MISSION_EVENT_MAP = [
  { missionStepRef: 'S1', label: '任务区域搜索', eventTypes: ['Sensor.Track'] },
  { missionStepRef: 'S3', label: '情报分发', eventTypes: ['Intel.Distributed'] },
  { missionStepRef: 'S4', label: '指挥决策与任务重规划', eventTypes: ['Decision.Replan'] },
  { missionStepRef: 'S5', label: '突防与交战', eventTypes: ['Weapon.Engagement'] },
  { missionStepRef: 'S6', label: '毁伤评估与任务结束', eventTypes: ['Damage.Result', 'Mission.Complete'] },
]

const RULES = ruleBody.rules as Array<any>

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
function round(value: number, digits = 3) { const p = 10 ** digits; return Math.round(value * p) / p }

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
  if (await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })) throw new Error(`${apiName}/${pk} 已存在；自动判读记录不可覆盖`)
  const row = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return row
}
async function patchEntry(apiName: string, pk: string, patch: Record<string, any> | ((data: Record<string, any>) => Record<string, any>)) {
  const current = await entry(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  const next = typeof patch === 'function' ? patch(current.data) : { ...current.data, ...patch }
  await db.objectEntry.update({ where: { id: current.id }, data: { dataJson: JSON.stringify(next) } })
  return next
}
async function upsertRuleSet() {
  const t = await objectType('AdjudicationRuleSet')
  const current = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk: RULESET_ID } })
  if (current) return { ...current, data: JSON.parse(current.dataJson || '{}') as Record<string, any> }
  const body = { ...ruleBody, rules: RULES } as Record<string, any>
  const publishedHash = sha256(body)
  const data = { ...body, publishedHash }
  await createEntry('AdjudicationRuleSet', RULESET_ID, 'CASE-01 Event-to-Measure 自动判读规则集 · v1', data)
  return { pk: RULESET_ID, title: 'CASE-01 Event-to-Measure 自动判读规则集 · v1', data }
}

export function automatedAdjudicationRequiredForStep(stepId: string): stepId is EventToMeasureStepId { return stepId in PROFILES }

export async function ensureAutomatedAdjudicationOntology() {
  await ensureType('AdjudicationRuleSet', '自动判读规则集', '冻结 Canonical Event 到 Mission Thread / Measure 的选择器、公式、阈值方向与适用范围。', 'braces')
  await ensureType('MissionStepObservation', '任务线程步骤观测', '由规范事件账本映射到 Mission Thread Step 的可追溯事实观测。', 'route')
  await ensureType('MeasureObservation', '指标观测值', '由事件或批量汇总事件按冻结规则计算得到的单次 Run 指标观测。', 'ruler')
  await ensureType('RunMeasureResult', 'Run指标判读', '将 MeasureObservation 与阈值快照比较形成达标/未达标结果；性能结论与技术准入分离。', 'badge-check')
  await ensureType('RunAdjudicationDecision', 'Run自动判读决定', '一次 Run 的 Event-to-Measure 自动判读完整性与可签署状态。', 'gavel')
  await ensureType('AdjudicationAction', '自动判读动作', '执行冻结规则集、生成指标观测和判读结果的追加式审计动作。', 'function-square')
  for (const spec of [
    ['adjudicationUsesReconstruction', '自动判读—事件重建', 'RunAdjudicationDecision', 'RunEventReconstruction'],
    ['adjudicationUsesRuleSet', '自动判读—规则集', 'RunAdjudicationDecision', 'AdjudicationRuleSet'],
    ['missionObservationUsesReconstruction', '任务步骤观测—事件重建', 'MissionStepObservation', 'RunEventReconstruction'],
    ['measureObservationUsesRuleSet', '指标观测—规则集', 'MeasureObservation', 'AdjudicationRuleSet'],
    ['measureObservationUsesReconstruction', '指标观测—事件重建', 'MeasureObservation', 'RunEventReconstruction'],
    ['measureObservationTargetsMeasure', '指标观测—指标', 'MeasureObservation', 'Measure'],
    ['runMeasureResultUsesObservation', 'Run指标判读—观测', 'RunMeasureResult', 'MeasureObservation'],
    ['runUsesMeasureResult', '试验Run—指标判读', 'TestRun', 'RunMeasureResult'],
    ['runUsesAdjudicationDecision', '试验Run—自动判读决定', 'TestRun', 'RunAdjudicationDecision'],
  ] as const) await ensureLink(...spec)
  return upsertRuleSet()
}

async function decisionsForStep(stepId: EventToMeasureStepId) {
  return (await entries('RunAdjudicationDecision')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
}
async function actionRows(stepId: EventToMeasureStepId) {
  return (await entries('AdjudicationAction')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
}
async function missionObservationRows(stepId: EventToMeasureStepId) {
  return (await entries('MissionStepObservation')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
}
async function measureObservationRows(stepId: EventToMeasureStepId) {
  return (await entries('MeasureObservation')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
}
async function resultRows(stepId: EventToMeasureStepId) {
  return (await entries('RunMeasureResult')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
}

function eventByType(timeline: Array<Record<string, any>>, eventType: string) { return timeline.find((x) => x.eventType === eventType) ?? null }
function ruleFor(stepId: EventToMeasureStepId, measureRef: string) { return RULES.find((r) => r.stepId === stepId && r.measureRef === measureRef) ?? null }
function performanceStatus(value: number, threshold: number, direction: string) {
  const met = direction === '<=' ? value <= threshold : direction === '>=' ? value >= threshold : false
  return { met, status: met ? '达标' : '未达标' }
}

function calculateMeasureObservation(stepId: EventToMeasureStepId, measureRef: string, timeline: Array<Record<string, any>>, measure: Record<string, any>) {
  const rule = ruleFor(stepId, measureRef)
  if (!rule) return { blocker: `缺少 ${measureRef} 冻结判读规则` }
  const threshold = Number(measure.threshold)
  if (!Number.isFinite(threshold)) return { blocker: `${measureRef} 缺少可计算 threshold` }
  if (measureRef === 'M-03') {
    const event = eventByType(timeline, 'Link.RangeAchieved')
    const value = Number(event?.attributes?.rangeKm)
    if (!event || !Number.isFinite(value)) return { blocker: '缺少 Link.RangeAchieved.rangeKm 事件观测' }
    return { rule, value, threshold, sourceEvents: [event], calculation: `${value} km`, uncertainty: null }
  }
  if (measureRef === 'M-08') {
    const from = eventByType(timeline, 'Sensor.Track'); const to = eventByType(timeline, 'Intel.Distributed')
    if (!from || !to) return { blocker: '缺少 Sensor.Track / Intel.Distributed 配对事件' }
    const value = round((Number(to.alignedTimeMs) - Number(from.alignedTimeMs)) / 1000, 3)
    if (!Number.isFinite(value) || value < 0) return { blocker: '情报分发事件时间差不可计算' }
    return { rule, value, threshold, sourceEvents: [from, to], calculation: `(${to.alignedTimeMs} - ${from.alignedTimeMs}) / 1000 = ${value} s`, uncertainty: { clockResidualMs: 4.8 } }
  }
  if (measureRef === 'M-13') {
    const event = eventByType(timeline, 'Batch.MissionOutcome')
    const successCount = Number(event?.attributes?.successCount); const totalCount = Number(event?.attributes?.totalCount)
    if (!event || !Number.isFinite(successCount) || !Number.isFinite(totalCount) || totalCount <= 0) return { blocker: '缺少 Batch.MissionOutcome 批量结局统计' }
    const value = round(successCount / totalCount * 100, 3)
    return { rule, value, threshold, sourceEvents: [event], calculation: `${successCount} / ${totalCount} × 100 = ${value}%`, uncertainty: { method: 'Wilson 95% CI', lowerPct: Number(event.attributes?.ci95LowerPct), upperPct: Number(event.attributes?.ci95UpperPct) } }
  }
  if (measureRef === 'M-14') {
    const event = eventByType(timeline, 'Twin.ErrorSummary')
    const value = Number(event?.attributes?.nrmsePct)
    if (!event || !Number.isFinite(value)) return { blocker: '缺少 Twin.ErrorSummary.nrmsePct 汇总事件' }
    return { rule, value, threshold, sourceEvents: [event], calculation: `NRMSE = ${value}%`, uncertainty: { anchorRefs: event.attributes?.anchorRefs ?? [] } }
  }
  return { blocker: `${measureRef} 尚未实现自动判读算子` }
}

async function createAction(stepId: EventToMeasureStepId, actorId: string, detail: Record<string, any>) {
  const actor = getGovernanceActor(actorId); const policy = getStepPolicy(stepId)
  if (actor.roleId !== policy.executorRole) throw new Error(`自动判读必须由“${actor.roleName}”岗位触发并确认`)
  const performedAt = nowIso()
  const signature = await recordAdjudicationSignature(stepId, actorId, { caseId: 'CASE-01', stepId, performedAt, detail })
  const existing = await actionRows(stepId)
  const code = `AJA-CASE01-${stepId.toUpperCase()}-${String(existing.length + 1).padStart(2, '0')}`
  const base = { schema: 'dtep/adjudication-action/v2.0g', code, caseId: 'CASE-01', stepId, action: 'EXECUTE_FROZEN_EVENT_TO_MEASURE_RULES', performedAt, performedBy: actor.id, performedByName: `${actor.title} · ${actor.name}`, performedByRole: actor.roleId, signatureRef: signature.code, signatureHash: signature.signatureHash, detail, immutable: true }
  const actionHash = sha256(base)
  await createEntry('AdjudicationAction', code, `${PROFILES[stepId].runRef} · Event-to-Measure 自动判读`, { ...base, actionHash })
  return { ...base, actionHash }
}

async function adjudicate(stepId: EventToMeasureStepId, actorId: string) {
  await ensureAutomatedAdjudicationOntology()
  const quality = await getRunDataQualityState(stepId, actorId)
  if (!quality.required || !quality.readyForEvidence || !quality.latestReconstruction || !quality.latestAssessment) throw new Error('Run Data Quality 尚未达到 READY_FOR_EVIDENCE，不能执行 Event-to-Measure 自动判读')
  const policy = getStepPolicy(stepId); const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`当前自动判读必须由“${actor.roleName}”岗位触发`)
  const approval = await entry('ApprovalRecord', `APR-CASE01-${stepId}`)
  if (!approval || approval.data.status !== 'approved') throw new Error('正式Run尚未获得步骤审批，不能执行正式自动判读')
  const prior = await decisionsForStep(stepId); const attempt = prior.length + 1
  const ruleSet = await entry('AdjudicationRuleSet', RULESET_ID)
  if (!ruleSet || !String(ruleSet.data.status).startsWith('已发布')) throw new Error('自动判读规则集未发布')
  const timeline = (quality.latestReconstruction.canonicalTimeline ?? []) as Array<Record<string, any>>
  const reconstructionRef = quality.latestReconstruction.code; const reconstructionHash = quality.latestReconstruction.reconstructionHash

  const missionObservations: Array<Record<string, any>> = []
  for (const mapping of MISSION_EVENT_MAP) {
    const events = timeline.filter((event) => mapping.eventTypes.includes(String(event.eventType)))
    if (!events.length) continue
    const base = {
      schema: 'dtep/mission-step-observation/v2.0g', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef, attempt,
      missionThreadRef: 'MT-01', missionStepRef: mapping.missionStepRef, missionStepLabel: mapping.label, reconstructionRef, reconstructionHash,
      eventRefs: events.map((e) => e.eventId), eventSnapshots: events, observed: true, observationWindowMs: { from: Math.min(...events.map((e) => Number(e.alignedTimeMs))), to: Math.max(...events.map((e) => Number(e.alignedTimeMs))) }, immutable: true,
    }
    const observationHash = sha256(base); const code = `MSO-CASE01-${stepId.toUpperCase()}-${mapping.missionStepRef}-A${attempt}`
    await createEntry('MissionStepObservation', code, `${PROFILES[stepId].runRef} · ${mapping.missionStepRef} ${mapping.label}`, { code, ...base, observationHash })
    missionObservations.push({ code, ...base, observationHash })
  }

  const blockers: string[] = []
  const measureObservations: Array<Record<string, any>> = []
  const runResults: Array<Record<string, any>> = []
  for (const measureRef of PROFILES[stepId].measureRefs) {
    const measureEntry = await entry('Measure', measureRef)
    if (!measureEntry) { blockers.push(`Measure/${measureRef} 不存在`); continue }
    const calculated = calculateMeasureObservation(stepId, measureRef, timeline, measureEntry.data)
    if ('blocker' in calculated) { blockers.push(String(calculated.blocker)); continue }
    const result = performanceStatus(calculated.value, calculated.threshold, calculated.rule.direction)
    const observationBase = {
      schema: 'dtep/measure-observation/v2.0g', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef, attempt,
      measureRef, measureName: measureEntry.data.name, unit: measureEntry.data.unit, value: calculated.value, thresholdSnapshot: calculated.threshold,
      ruleSetRef: RULESET_ID, ruleSetHash: ruleSet.data.publishedHash, ruleRef: calculated.rule.id, ruleSnapshot: calculated.rule,
      reconstructionRef, reconstructionHash, sourceEventRefs: calculated.sourceEvents.map((e: any) => e.eventId), sourceEventSnapshots: calculated.sourceEvents,
      calculation: calculated.calculation, uncertainty: calculated.uncertainty, confidence: calculated.rule.confidence, immutable: true,
    }
    const observationHash = sha256(observationBase); const observationCode = `MO-CASE01-${stepId.toUpperCase()}-${measureRef}-A${attempt}`
    await createEntry('MeasureObservation', observationCode, `${PROFILES[stepId].runRef} · ${measureRef} ${measureEntry.data.name}`, { code: observationCode, ...observationBase, observationHash })
    const adjudicationBase = {
      schema: 'dtep/run-measure-result/v2.0g', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef, attempt,
      measureRef, measureName: measureEntry.data.name, observationRef: observationCode, observationHash, value: calculated.value, unit: measureEntry.data.unit,
      thresholdSnapshot: calculated.threshold, objectiveSnapshot: measureEntry.data.objective ?? null, direction: calculated.rule.direction,
      performanceMet: result.met, performanceDecision: result.status, confidence: calculated.rule.confidence, uncertainty: calculated.uncertainty,
      ruleSetRef: RULESET_ID, ruleSetHash: ruleSet.data.publishedHash, ruleRef: calculated.rule.id,
      adjudicationCompleteness: 'COMPLETE', note: result.met ? '自动判读完整；指标达到冻结门槛。' : '自动判读完整；指标未达到冻结门槛。该性能失败不阻塞Run事实进入证据。', immutable: true,
    }
    const resultHash = sha256(adjudicationBase); const resultCode = `RMR-CASE01-${stepId.toUpperCase()}-${measureRef}-A${attempt}`
    await createEntry('RunMeasureResult', resultCode, `${PROFILES[stepId].runRef} · ${measureRef} · ${result.status}`, { code: resultCode, ...adjudicationBase, resultHash })
    measureObservations.push({ code: observationCode, ...observationBase, observationHash })
    runResults.push({ code: resultCode, ...adjudicationBase, resultHash })
  }

  const decision = blockers.length ? 'BLOCKED' : 'READY_FOR_RUN_SIGNOFF'
  const decisionBase = {
    schema: 'dtep/run-adjudication-decision/v2.0g', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef, executionMode: PROFILES[stepId].executionMode, attempt,
    reconstructionRef, reconstructionHash, dataQualityAssessmentRef: quality.latestAssessment.code, dataQualityAssessmentHash: quality.latestAssessment.assessmentHash,
    ruleSetRef: RULESET_ID, ruleSetHash: ruleSet.data.publishedHash,
    missionStepObservationRefs: missionObservations.map((x) => x.code), measureObservationRefs: measureObservations.map((x) => x.code), runMeasureResultRefs: runResults.map((x) => x.code),
    performanceSummary: runResults.map((x) => ({ measureRef: x.measureRef, value: x.value, unit: x.unit, threshold: x.thresholdSnapshot, performanceDecision: x.performanceDecision, resultRef: x.code })),
    blockers, decision, readyForRunSignoff: blockers.length === 0, automated: true, reviewMode: 'AUTO_WITH_AUDIT', manualOverrideAvailable: true,
    ruleExecutionNote: '只执行已发布冻结规则；性能“未达标”不等于自动判读失败。只有规则/事件/计算链不完整才阻塞Run最终签署。', createdAt: nowIso(), immutable: true,
  }
  const decisionHash = sha256(decisionBase); const decisionCode = `RAD-CASE01-${stepId.toUpperCase()}-A${attempt}`
  await createEntry('RunAdjudicationDecision', decisionCode, `${PROFILES[stepId].runRef} · Automated Adjudication · A${attempt}`, { code: decisionCode, ...decisionBase, decisionHash })
  const action = await createAction(stepId, actorId, { decisionRef: decisionCode, decisionHash, ruleSetRef: RULESET_ID, ruleSetHash: ruleSet.data.publishedHash, reconstructionRef, reconstructionHash, performanceSummary: decisionBase.performanceSummary, blockers })
  await patchEntry('RunAdjudicationDecision', decisionCode, { actionRef: action.code, actionHash: action.actionHash, adjudicationSignatureRef: action.signatureRef, adjudicationSignatureHash: action.signatureHash })
  return { decisionCode, decision, blockers }
}

export async function getAutomatedAdjudicationState(stepId: string, actorId?: string | null) {
  if (!automatedAdjudicationRequiredForStep(stepId)) return { required: false, status: 'NOT_REQUIRED' as AutomatedAdjudicationStatus, readyForRunSignoff: true }
  await ensureAutomatedAdjudicationOntology()
  const quality = await getRunDataQualityState(stepId, actorId)
  const policy = getStepPolicy(stepId); const actor = actorId ? getGovernanceActor(actorId) : null
  const allowed = Boolean(actor && actor.roleId === policy.executorRole)
  if (!quality.required || !quality.readyForEvidence) return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, status: 'WAITING_DATA_QUALITY' as AutomatedAdjudicationStatus, readyForRunSignoff: false, allowed,
    requiredRole: policy.executorRole, actionLabel: '等待 Run Data Quality', latestDecision: null, missionStepObservations: [], measureObservations: [], runMeasureResults: [], actions: [], blockers: ['Run Data Quality 尚未达到 READY_FOR_EVIDENCE'],
    note: '自动判读只能消费通过数据质量准入的规范事件账本，不能直接读取未对齐原始数据。',
  }
  const [decisions, missionRows, measureRows, results, actions] = await Promise.all([decisionsForStep(stepId), missionObservationRows(stepId), measureObservationRows(stepId), resultRows(stepId), actionRows(stepId)])
  const latestDecision = decisions.at(-1)?.data ?? null
  const status: AutomatedAdjudicationStatus = !latestDecision ? 'NOT_ADJUDICATED' : latestDecision.decision === 'READY_FOR_RUN_SIGNOFF' ? 'READY_FOR_RUN_SIGNOFF' : 'BLOCKED'
  const ruleSet = await entry('AdjudicationRuleSet', RULESET_ID)
  return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, executionMode: PROFILES[stepId].executionMode, status, readyForRunSignoff: status === 'READY_FOR_RUN_SIGNOFF', allowed, requiredRole: policy.executorRole,
    actionLabel: status === 'NOT_ADJUDICATED' ? '执行 Event-to-Measure 自动判读' : status === 'BLOCKED' ? '重新执行冻结规则' : '自动判读已冻结',
    ruleSet: ruleSet?.data ?? null, latestDecision, missionStepObservations: missionRows.map((x) => x.data), measureObservations: measureRows.map((x) => x.data), runMeasureResults: results.map((x) => x.data), actions: actions.map((x) => x.data),
    blockers: latestDecision?.blockers ?? [],
    note: 'READY_FOR_RUN_SIGNOFF 表示“事件→指标”的判读链完整，不表示所有性能指标达标。每个指标的达标/未达标结果独立保留。',
  }
}

export async function executeAutomatedAdjudicationOperation(stepId: EventToMeasureStepId, operation: AutomatedAdjudicationOperation, actorId: string) {
  if (operation !== 'adjudicate') throw new Error(`未知 Automated Adjudication operation: ${operation}`)
  const state = await getAutomatedAdjudicationState(stepId, actorId)
  if (state.status === 'WAITING_DATA_QUALITY') throw new Error('Run Data Quality尚未就绪，不能自动判读')
  if (state.status === 'READY_FOR_RUN_SIGNOFF') throw new Error('自动判读已经冻结；如需修改规则必须发布新 AdjudicationRuleSet 版本')
  await adjudicate(stepId, actorId)
  return getAutomatedAdjudicationState(stepId, actorId)
}

export async function assertAutomatedAdjudicationReadyForRunSignoff(stepId: string) {
  if (!automatedAdjudicationRequiredForStep(stepId)) return null
  const state = await getAutomatedAdjudicationState(stepId)
  if (!state.readyForRunSignoff || !state.latestDecision) throw new Error('Event-to-Measure / Automated Adjudication 尚未进入 READY_FOR_RUN_SIGNOFF；不能完成正式Run签署')
  return state
}

export async function bindRunToAutomatedAdjudication(runData: Record<string, any>, stepId: EventToMeasureStepId) {
  const state = await assertAutomatedAdjudicationReadyForRunSignoff(stepId)
  if (!state) return runData
  const decision = state.latestDecision
  const manifest = { schema: 'dtep/event-to-measure-provenance/v2.0g', caseId: 'CASE-01', stepId, decision, missionStepObservations: state.missionStepObservations, measureObservations: state.measureObservations, runMeasureResults: state.runMeasureResults, ruleSet: state.ruleSet, actions: state.actions }
  return {
    ...runData,
    automatedAdjudicationVersion: 'v2.0g',
    adjudicationRuleSetRef: state.ruleSet?.code ?? RULESET_ID,
    adjudicationRuleSetHash: state.ruleSet?.publishedHash ?? null,
    runAdjudicationDecisionRef: decision.code,
    runAdjudicationDecisionSnapshot: decision,
    runAdjudicationDecisionHash: decision.decisionHash,
    missionStepObservationRefs: state.missionStepObservations.map((x: any) => x.code),
    missionStepObservationSnapshots: state.missionStepObservations,
    measureObservationRefs: state.measureObservations.map((x: any) => x.code),
    measureObservationSnapshots: state.measureObservations,
    runMeasureResultRefs: state.runMeasureResults.map((x: any) => x.code),
    runMeasureResultSnapshots: state.runMeasureResults,
    adjudicationActionRefs: state.actions.map((x: any) => x.code),
    adjudicationActions: state.actions,
    automatedAdjudicationHash: sha256(manifest),
    automatedAdjudicationDecision: decision.decision,
    automatedAdjudicationBindingMode: 'frozen-before-final-execution-signature',
  }
}

export async function finalizeAutomatedAdjudication(stepId: string, executionSignature: Record<string, any>) {
  if (!automatedAdjudicationRequiredForStep(stepId)) return
  const state = await assertAutomatedAdjudicationReadyForRunSignoff(stepId)
  if (!state) return
  const decision = state.latestDecision
  const finalPayload = {
    schema: 'dtep/automated-adjudication-final/v2.0g', caseId: 'CASE-01', stepId, runRef: PROFILES[stepId].runRef,
    decisionRef: decision.code, decisionHash: decision.decisionHash, ruleSetRef: state.ruleSet?.code, ruleSetHash: state.ruleSet?.publishedHash,
    measureResults: state.runMeasureResults.map((x: any) => ({ code: x.code, measureRef: x.measureRef, resultHash: x.resultHash, value: x.value, performanceDecision: x.performanceDecision })),
    executionSignatureRef: executionSignature.code, executionSignatureHash: executionSignature.signatureHash,
  }
  const finalHash = sha256(finalPayload)
  await patchEntry('RunAdjudicationDecision', decision.code, { finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalAdjudicationHash: finalHash })
  for (const result of state.runMeasureResults) {
    await patchEntry('RunMeasureResult', result.code, { finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalAdjudicationHash: finalHash })
    await patchEntry('Measure', result.measureRef, (measure) => ({ ...measure, measured: result.value, status: result.performanceDecision, confidence: result.confidence, lastAdjudicatedRunRef: PROFILES[stepId].runRef, lastMeasureObservationRef: result.observationRef, lastRunMeasureResultRef: result.code, adjudicationRuleSetRef: state.ruleSet?.code, adjudicationRuleSetHash: state.ruleSet?.publishedHash, automatedAdjudicationVersion: 'v2.0g' }))
  }
  const missionRefs = state.missionStepObservations.map((x: any) => x.code)
  const mt = await entry('MissionThread', 'MT-01')
  if (mt) await patchEntry('MissionThread', 'MT-01', (data) => ({ ...data, eventToMeasureObservationRefs: Array.from(new Set([...(data.eventToMeasureObservationRefs ?? []), ...missionRefs])) }))
  const run = await entry('TestRun', PROFILES[stepId].runRef)
  if (run) await patchEntry('TestRun', run.pk, { automatedAdjudicationFinalHash: finalHash, automatedAdjudicationFinalExecutionSignatureRef: executionSignature.code, automatedAdjudicationFinalExecutionSignatureHash: executionSignature.signatureHash, runAdjudicationDecisionSnapshot: { ...decision, finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalAdjudicationHash: finalHash }, runMeasureResultSnapshots: state.runMeasureResults.map((x: any) => ({ ...x, finalExecutionSignatureRef: executionSignature.code, finalExecutionSignatureHash: executionSignature.signatureHash, finalAdjudicationHash: finalHash })) })
}

export async function clearCase01AutomatedAdjudicationRecords() {
  for (const apiName of ['AdjudicationAction', 'RunAdjudicationDecision', 'RunMeasureResult', 'MeasureObservation', 'MissionStepObservation']) {
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
