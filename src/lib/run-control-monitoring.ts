import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getGovernanceActor, getStepPolicy, recordRunControlSignature } from '@/lib/case01-governance'

export type RunControlStepId = 'live-retest' | 'lvc-anchor' | 'digital-5000'
export type RunControlStatus = 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'RECOVERY_READY' | 'READY_TO_COMPLETE' | 'ABORTED' | 'COMPLETED'
export type RunControlOperation = 'start' | 'monitor' | 'pause' | 'remediate' | 'resume' | 'prepare-complete' | 'abort'

const PROFILES: Record<RunControlStepId, { runRef: string; executionMode: 'Live' | 'LVC' | 'Digital'; scenarioRef: string }> = {
  'live-retest': { runRef: 'RUN-LIVE-002-02', executionMode: 'Live', scenarioRef: 'SC-COA-01' },
  'lvc-anchor': { runRef: 'RUN-LVC-004-FRM-01', executionMode: 'LVC', scenarioRef: 'SC-COA-01' },
  'digital-5000': { runRef: 'RUN-DOT-S-02', executionMode: 'Digital', scenarioRef: 'SC-COA-01' },
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
  if (await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })) throw new Error(`${apiName}/${pk} 已存在；运行控制记录不可覆盖`)
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

export function runControlRequiredForStep(stepId: string): stepId is RunControlStepId {
  return stepId in PROFILES
}

export async function ensureRunControlOntology() {
  await ensureType('RunControlSession', '试验运行控制会话', '正式Run的运行中控制状态：启动、监控、暂停、恢复、中止、完成，以及控制策略和健康摘要。', 'activity')
  await ensureType('RunHealthSnapshot', 'Run健康快照', '运行中节点、时统、Topic、网关、数据落盘、资源等健康状态的不可变时间片。', 'heart-pulse')
  await ensureType('RunControlAction', 'Run控制动作', '运行中的Start/Pause/Resume/Abort/Remediate/PrepareComplete等受控动作与签署见证。', 'square-terminal')
  for (const spec of [
    ['runControlUsesEnvironment', '运行控制—试验环境', 'RunControlSession', 'TestEnvironmentAssembly'],
    ['runControlUsesFederation', '运行控制—LVC联邦', 'RunControlSession', 'LVCFederationConfiguration'],
    ['runControlHasHealthSnapshot', '运行控制—健康快照', 'RunControlSession', 'RunHealthSnapshot'],
    ['runControlHasAction', '运行控制—控制动作', 'RunControlSession', 'RunControlAction'],
    ['runUsesControlSession', '试验Run—运行控制会话', 'TestRun', 'RunControlSession'],
  ] as const) await ensureLink(spec[0], spec[1], spec[2], spec[3])
}

async function currentSession(stepId: RunControlStepId) {
  const values = (await entries('RunControlSession')).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
  return values.at(-1) ?? null
}
async function sessionSnapshots(sessionRef: string) {
  return (await entries('RunHealthSnapshot')).filter((x) => x.data.sessionRef === sessionRef)
}
async function sessionActions(sessionRef: string) {
  return (await entries('RunControlAction')).filter((x) => x.data.sessionRef === sessionRef)
}

async function contextForStep(stepId: RunControlStepId) {
  const profile = PROFILES[stepId]
  const scenario = await entry('TestScenario', profile.scenarioRef)
  if (!scenario) throw new Error(`Scenario/${profile.scenarioRef}不存在`)
  const environmentRef = String(scenario.data.testEnvironmentAssemblyRef ?? '')
  if (!environmentRef) throw new Error('当前场景尚未绑定 Test Environment Assembly')
  const environment = await entry('TestEnvironmentAssembly', environmentRef)
  if (!environment) throw new Error(`TestEnvironmentAssembly/${environmentRef}不存在`)
  const federationRef = String(environment.data.federationRef ?? '')
  const federation = federationRef ? await entry('LVCFederationConfiguration', federationRef) : null
  const executionProfile = environment.data.executionProfiles?.[profile.executionMode]
  if (!executionProfile) throw new Error(`${environmentRef}缺少${profile.executionMode}执行Profile`)
  return { profile, scenario, environment, federation, executionProfile }
}

function controlPolicy(mode: 'Live' | 'LVC' | 'Digital', toleranceMs: number) {
  return {
    schema: 'dtep/run-control-policy/v2.0e',
    mode,
    samplePolicy: mode === 'Digital' ? '按批次/检查点采样' : '按联邦心跳/关键事件采样',
    timeSync: { warnMs: Math.max(5, Math.floor(toleranceMs * 0.7)), pauseMs: toleranceMs, abortMs: Math.max(25, toleranceMs * 3) },
    topicLoss: { warnPct: 0.5, pausePct: 2, abortPct: 10 },
    gateway: { criticalDownAction: 'PAUSE', repeatedFailureAction: 'ABORT' },
    dataCapture: { gapAction: 'PAUSE', persistentGapAction: 'ABORT' },
    node: { criticalNodeDownAction: 'PAUSE', timeMasterDownAction: 'ABORT' },
    manualControl: ['PAUSE', 'RESUME', 'ABORT'],
    safetyPrinciple: '停试/中止动作不等待新增审批；恢复运行必须由当前Run执行岗位确认故障已清除并签署。',
  }
}

function healthSnapshotData(args: {
  stepId: RunControlStepId
  sessionRef: string
  cycle: number
  mode: 'Live' | 'LVC' | 'Digital'
  environment: Record<string, any>
  federation: Record<string, any> | null
  executionProfile: Record<string, any>
  anomaly?: 'TIME_DRIFT' | null
  recovery?: boolean
}) {
  const { stepId, sessionRef, cycle, mode, environment, federation, executionProfile, anomaly, recovery } = args
  const tolerance = Number(environment.timeService?.syncToleranceMs ?? federation?.timeService?.syncToleranceMs ?? 10)
  const maxOffsetMs = anomaly === 'TIME_DRIFT' ? 22 : recovery ? 5 : mode === 'Digital' ? 1 : 6
  const activeNodes = Array.isArray(executionProfile.activeNodeRefs) ? executionProfile.activeNodeRefs : []
  const activeGatewayRefs = Array.isArray(executionProfile.activeGatewayRefs) ? executionProfile.activeGatewayRefs : []
  const requiredTopics = Array.isArray(executionProfile.topicNames) ? executionProfile.topicNames : []
  const nodeHealth = activeNodes.map((id: string, index: number) => ({ id, status: 'ONLINE', heartbeatAgeMs: 80 + index * 17 }))
  const gatewayHealth = activeGatewayRefs.map((id: string, index: number) => ({ id, status: 'UP', latencyMs: 3 + index * 2, dropPct: anomaly === 'TIME_DRIFT' && id === 'GW-HLA-01' ? 0.2 : 0.02 }))
  const topicLossPct = anomaly === 'TIME_DRIFT' ? 0.35 : 0.03
  const dataCapture = { status: 'WRITING', writeLagMs: mode === 'Digital' ? 140 : 45, gapCount: 0, checksumStream: 'ACTIVE' }
  const stopConditions: Array<Record<string, any>> = []
  if (maxOffsetMs > tolerance) stopConditions.push({ id: 'STOP-TIME-SYNC', severity: 'HARD', action: 'AUTO_PAUSE', observed: `${maxOffsetMs}ms`, threshold: `${tolerance}ms`, note: '联邦时统漂移超过冻结容差。' })
  if (topicLossPct > 2) stopConditions.push({ id: 'STOP-TOPIC-LOSS', severity: 'HARD', action: 'AUTO_PAUSE', observed: `${topicLossPct}%`, threshold: '2%', note: '关键Topic丢失率超过运行控制阈值。' })
  if (gatewayHealth.some((x: any) => x.status !== 'UP')) stopConditions.push({ id: 'STOP-GATEWAY-DOWN', severity: 'HARD', action: 'AUTO_PAUSE', note: '关键协议网关不可用。' })
  if (nodeHealth.some((x: any) => x.status !== 'ONLINE')) stopConditions.push({ id: 'STOP-NODE-OFFLINE', severity: 'HARD', action: 'AUTO_PAUSE', note: '活动联邦节点离线。' })
  if (dataCapture.gapCount > 0 || dataCapture.status !== 'WRITING') stopConditions.push({ id: 'STOP-DATA-CAPTURE', severity: 'HARD', action: 'AUTO_PAUSE', note: '正式数据落盘出现缺口。' })
  const severity = stopConditions.length ? 'RED' : maxOffsetMs > Math.max(5, Math.floor(tolerance * 0.7)) ? 'AMBER' : 'GREEN'
  const body = {
    schema: 'dtep/run-health-snapshot/v2.0e', caseId: 'CASE-01', stepId, sessionRef, cycle, mode,
    observedAt: nowIso(), severity,
    nodeHealth, gatewayHealth,
    timeSync: { authority: environment.timeService?.authority ?? federation?.timeService?.authority ?? null, maxOffsetMs, toleranceMs: tolerance, status: maxOffsetMs <= tolerance ? 'LOCKED' : 'OUT_OF_TOLERANCE' },
    topicHealth: { schema: environment.topicSet?.schema ?? federation?.topicSet?.schema ?? null, requiredCount: requiredTopics.length, activeCount: requiredTopics.length, lossPct: topicLossPct, staleTopics: [] },
    dataCapture,
    resourceHealth: { allocated: executionProfile.activeResourceRefs ?? [], status: 'AVAILABLE' },
    stopConditionsTriggered: stopConditions,
    notice: 'DEMO/SYNTHETIC：健康指标用于演示Run Control与停试状态机，不代表真实基地监测参数。',
  }
  return { ...body, snapshotHash: sha256(body), immutable: true }
}

async function createSnapshot(stepId: RunControlStepId, session: Record<string, any>, options: { anomaly?: 'TIME_DRIFT' | null; recovery?: boolean } = {}) {
  const { profile, environment, federation, executionProfile } = await contextForStep(stepId)
  const cycle = Number(session.monitorCycle ?? 0) + 1
  const data = healthSnapshotData({ stepId, sessionRef: session.code, cycle, mode: profile.executionMode, environment: environment.data, federation: federation?.data ?? null, executionProfile, anomaly: options.anomaly ?? null, recovery: options.recovery })
  const code = `RHS-CASE01-${stepId.toUpperCase()}-A${session.attempt}-C${String(cycle).padStart(2, '0')}`
  await createEntry('RunHealthSnapshot', code, `${profile.runRef} · Health Snapshot C${cycle}`, { code, ...data })
  return { code, ...data }
}

async function createControlAction(stepId: RunControlStepId, session: Record<string, any>, action: string, actorId: string | null, detail: Record<string, any>, system = false) {
  const performedAt = nowIso()
  let signer: Record<string, any> | null = null
  let actorLabel = 'DTEP Run Control Service'
  let actorRole = 'automatic-safety-policy'
  if (!system) {
    if (!actorId) throw new Error('运行控制动作缺少 actorId')
    const actor = getGovernanceActor(actorId)
    const policy = getStepPolicy(stepId)
    if (actor.roleId !== policy.executorRole) throw new Error(`运行控制必须由“${actor.roleName}”岗位执行`)
    actorLabel = `${actor.title} · ${actor.name}`
    actorRole = actor.roleId
    signer = await recordRunControlSignature(stepId, actorId, { caseId: 'CASE-01', sessionRef: session.code, action, performedAt, detail })
  }
  const base = {
    schema: 'dtep/run-control-action/v2.0e', caseId: 'CASE-01', stepId, sessionRef: session.code, action,
    performedAt, performedBy: actorId ?? 'SYSTEM-RUN-CONTROL', performedByName: actorLabel, performedByRole: actorRole,
    detail, signatureRef: signer?.code ?? null, signatureHash: signer?.signatureHash ?? null,
    systemAttestationHash: system ? sha256({ caseId: 'CASE-01', sessionRef: session.code, action, performedAt, detail, authority: 'DTEP-RUN-CONTROL' }) : null,
    immutable: true,
  }
  const actionHash = sha256(base)
  const code = `RCA-CASE01-${stepId.toUpperCase()}-A${session.attempt}-${String((session.actionCount ?? 0) + 1).padStart(2, '0')}`
  await createEntry('RunControlAction', code, `${PROFILES[stepId].runRef} · ${action}`, { code, ...base, actionHash })
  await patchEntry('RunControlSession', session.code, { actionCount: Number(session.actionCount ?? 0) + 1, latestActionRef: code })
  return { code, ...base, actionHash }
}

export async function getRunControlState(stepId: string, actorId?: string | null) {
  if (!runControlRequiredForStep(stepId)) return { required: false, status: 'NOT_REQUIRED', readyForFormalization: true }
  await ensureRunControlOntology()
  const session = await currentSession(stepId)
  const policy = getStepPolicy(stepId)
  const actor = actorId ? getGovernanceActor(actorId) : null
  if (!session) return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, executionMode: PROFILES[stepId].executionMode,
    status: 'NOT_STARTED' as RunControlStatus, readyForFormalization: false, allowed: Boolean(actor && actor.roleId === policy.executorRole),
    requiredRole: policy.executorRole, actionLabel: '启动正式 Run', latestHealth: null, actions: [], snapshots: [], note: '审批完成后先启动Run Control；正式Run只有在健康状态可接受并进入READY_TO_COMPLETE后才能执行最终签署。',
  }
  const snapshots = await sessionSnapshots(session.pk)
  const actions = await sessionActions(session.pk)
  const latestHealth = snapshots.at(-1)?.data ?? null
  const status = session.data.status as RunControlStatus
  const allowed = Boolean(actor && actor.roleId === policy.executorRole)
  const actionLabel = status === 'RUNNING' ? '采集下一监控帧' : status === 'PAUSED' ? '执行故障处置' : status === 'RECOVERY_READY' ? '恢复 Run' : status === 'READY_TO_COMPLETE' ? '可完成正式 Run' : status === 'ABORTED' ? '重新启动新 Run Attempt' : status === 'COMPLETED' ? 'Run已完成' : '启动正式 Run'
  return {
    required: true, stepId, runRef: PROFILES[stepId].runRef, executionMode: PROFILES[stepId].executionMode,
    status, attempt: session.data.attempt, readyForFormalization: status === 'READY_TO_COMPLETE', completed: status === 'COMPLETED', allowed,
    requiredRole: policy.executorRole, actionLabel, session: session.data, latestHealth,
    snapshots: snapshots.map((x) => x.data), actions: actions.map((x) => x.data),
    blockers: status === 'PAUSED' ? (latestHealth?.stopConditionsTriggered ?? []).map((x: any) => `${x.id}: ${x.note ?? x.observed}`) : [],
    note: '运行控制健康快照为追加式不可变记录；Pause/Resume/Abort均形成RunControlAction。自动安全停试由系统策略见证，人工控制动作由执行岗位签署。',
  }
}

async function assertExecutor(stepId: RunControlStepId, actorId: string) {
  const actor = getGovernanceActor(actorId)
  const policy = getStepPolicy(stepId)
  if (actor.roleId !== policy.executorRole) throw new Error(`当前Run Control必须由“${actor.roleName}”岗位执行`)
  const approval = await entry('ApprovalRecord', `APR-CASE01-${stepId}`)
  if (!approval || approval.data.status !== 'approved') throw new Error('正式Run尚未获得步骤审批，不能进入Run Control')
  return actor
}

export async function executeRunControlOperation(stepId: RunControlStepId, operation: RunControlOperation, actorId: string) {
  await ensureRunControlOntology()
  await assertExecutor(stepId, actorId)
  let current = await currentSession(stepId)

  if (operation === 'start') {
    if (current && !['ABORTED', 'COMPLETED'].includes(String(current.data.status))) throw new Error(`已有活动Run Control Session：${current.data.status}`)
    const { profile, environment, federation, executionProfile } = await contextForStep(stepId)
    const attempt = current ? Number(current.data.attempt ?? 0) + 1 : 1
    const code = `RCS-CASE01-${stepId.toUpperCase()}-A${attempt}`
    const control = controlPolicy(profile.executionMode, Number(environment.data.timeService?.syncToleranceMs ?? 10))
    const manifest = {
      schema: 'dtep/run-control-session/v2.0e', caseId: 'CASE-01', stepId, runRef: profile.runRef, executionMode: profile.executionMode,
      scenarioRef: profile.scenarioRef, environmentRef: environment.pk, environmentHash: environment.data.environmentHash,
      federationRef: federation?.pk ?? null, federationHash: federation?.data.federationHash ?? null,
      executionProfile, controlPolicy: control, attempt,
    }
    const data = { code, ...manifest, status: 'RUNNING', startedAt: nowIso(), endedAt: null, monitorCycle: 0, actionCount: 0, resumeCount: 0, latestHealthRef: null, sessionConfigHash: sha256(manifest), immutableConfig: true }
    await createEntry('RunControlSession', code, `${profile.runRef} · Run Control Session · A${attempt}`, data)
    await createControlAction(stepId, data, 'START', actorId, { sessionConfigHash: data.sessionConfigHash })
    const initial = await createSnapshot(stepId, data)
    await patchEntry('RunControlSession', code, { latestHealthRef: initial.code, monitorCycle: initial.cycle, currentSeverity: initial.severity })
    return getRunControlState(stepId, actorId)
  }

  if (!current) throw new Error('尚未启动 Run Control Session')
  let session = current.data

  if (operation === 'monitor') {
    if (session.status !== 'RUNNING') throw new Error(`当前状态${session.status}不能采集运行监控帧`)
    const shouldInjectLvcDrift = stepId === 'lvc-anchor' && Number(session.monitorCycle ?? 0) <= 1 && !session.demoTimeDriftInjected
    const snapshot = await createSnapshot(stepId, session, { anomaly: shouldInjectLvcDrift ? 'TIME_DRIFT' : null })
    const triggered = Array.isArray(snapshot.stopConditionsTriggered) && snapshot.stopConditionsTriggered.length > 0
    if (triggered) {
      const auto = await createControlAction(stepId, session, 'AUTO_PAUSE', null, { triggerSnapshotRef: snapshot.code, stopConditions: snapshot.stopConditionsTriggered }, true)
      session = await patchEntry('RunControlSession', session.code, { status: 'PAUSED', pausedAt: nowIso(), pauseReason: snapshot.stopConditionsTriggered, latestHealthRef: snapshot.code, monitorCycle: snapshot.cycle, currentSeverity: snapshot.severity, demoTimeDriftInjected: shouldInjectLvcDrift || session.demoTimeDriftInjected, latestActionRef: auto.code })
    } else {
      session = await patchEntry('RunControlSession', session.code, { latestHealthRef: snapshot.code, monitorCycle: snapshot.cycle, currentSeverity: snapshot.severity })
    }
    return getRunControlState(stepId, actorId)
  }

  if (operation === 'pause') {
    if (session.status !== 'RUNNING') throw new Error('只有运行中的Run可以人工暂停')
    await createControlAction(stepId, session, 'PAUSE', actorId, { reason: '操作员人工暂停/检查点' })
    await patchEntry('RunControlSession', session.code, { status: 'PAUSED', pausedAt: nowIso(), pauseReason: [{ id: 'MANUAL-PAUSE', note: '操作员人工暂停' }] })
    return getRunControlState(stepId, actorId)
  }

  if (operation === 'remediate') {
    if (session.status !== 'PAUSED') throw new Error('当前Run未处于PAUSED状态')
    const action = await createControlAction(stepId, session, 'REMEDIATE', actorId, { procedure: stepId === 'lvc-anchor' ? '重锁TIME-MASTER-01、刷新时间同步、校验Gateway/Topic缓存' : '检查资源/数据链并恢复健康状态' })
    const snapshot = await createSnapshot(stepId, session, { recovery: true })
    await patchEntry('RunControlSession', session.code, { status: 'RECOVERY_READY', remediationActionRef: action.code, latestHealthRef: snapshot.code, monitorCycle: snapshot.cycle, currentSeverity: snapshot.severity, recoveryVerifiedAt: nowIso() })
    return getRunControlState(stepId, actorId)
  }

  if (operation === 'resume') {
    if (session.status !== 'RECOVERY_READY') throw new Error('故障尚未形成RECOVERY_READY，不允许恢复Run')
    const latest = (await sessionSnapshots(session.code)).at(-1)?.data
    if (!latest || latest.severity === 'RED' || (latest.stopConditionsTriggered ?? []).length) throw new Error('恢复前健康复核未通过')
    await createControlAction(stepId, session, 'RESUME', actorId, { healthSnapshotRef: latest.code, healthSnapshotHash: latest.snapshotHash })
    await patchEntry('RunControlSession', session.code, { status: 'RUNNING', resumedAt: nowIso(), resumeCount: Number(session.resumeCount ?? 0) + 1, pauseReason: [] })
    return getRunControlState(stepId, actorId)
  }

  if (operation === 'prepare-complete') {
    if (session.status !== 'RUNNING') throw new Error('只有运行中的Run可以进入完成准备状态')
    const snaps = await sessionSnapshots(session.code)
    const latest = snaps.at(-1)?.data
    const minSnapshots = stepId === 'lvc-anchor' ? 3 : 2
    if (snaps.length < minSnapshots) throw new Error(`至少需要${minSnapshots}个健康快照后才能完成本次Run`)
    if (!latest || latest.severity === 'RED' || (latest.stopConditionsTriggered ?? []).length) throw new Error('当前健康状态仍存在硬阻塞，不能完成Run')
    if (stepId === 'lvc-anchor' && Number(session.resumeCount ?? 0) < 1) throw new Error('LVC演示必须完成时统异常处置与Resume后才能完成Run')
    await createControlAction(stepId, session, 'PREPARE_COMPLETE', actorId, { finalHealthSnapshotRef: latest.code, finalHealthSnapshotHash: latest.snapshotHash })
    await patchEntry('RunControlSession', session.code, { status: 'READY_TO_COMPLETE', readyToCompleteAt: nowIso(), finalHealthSnapshotRef: latest.code, finalHealthSnapshotHash: latest.snapshotHash })
    return getRunControlState(stepId, actorId)
  }

  if (operation === 'abort') {
    if (!['RUNNING', 'PAUSED', 'RECOVERY_READY'].includes(String(session.status))) throw new Error(`当前状态${session.status}不能中止`)
    await createControlAction(stepId, session, 'ABORT', actorId, { reason: '操作员安全中止；本Attempt不得进入正式证据，重新开始需创建新Attempt。' })
    await patchEntry('RunControlSession', session.code, { status: 'ABORTED', endedAt: nowIso(), evidenceEligible: false, abortReason: 'operator safety abort' })
    return getRunControlState(stepId, actorId)
  }

  throw new Error(`未知Run Control operation：${operation}`)
}

export async function assertRunControlReadyForFormalization(stepId: string) {
  if (!runControlRequiredForStep(stepId)) return null
  const session = await currentSession(stepId)
  if (!session || session.data.status !== 'READY_TO_COMPLETE') throw new Error('Run Control尚未进入READY_TO_COMPLETE；请先完成运行监控、必要故障处置和完成前健康确认')
  return session.data
}

export async function bindRunToControl(runData: Record<string, any>, stepId: RunControlStepId) {
  const session = await assertRunControlReadyForFormalization(stepId)
  if (!session) return runData
  const snapshots = await sessionSnapshots(session.code)
  const actions = await sessionActions(session.code)
  const snapshotData = snapshots.map((x) => x.data)
  const actionData = actions.map((x) => x.data)
  const controlManifest = {
    schema: 'dtep/run-control-provenance/v2.0e', caseId: 'CASE-01', stepId, session,
    healthSnapshots: snapshotData,
    controlActions: actionData,
  }
  return {
    ...runData,
    runControlVersion: 'v2.0e',
    runControlSessionRef: session.code,
    runControlSessionSnapshot: session,
    runHealthSnapshotRefs: snapshotData.map((x) => x.code),
    runHealthSnapshots: snapshotData,
    runControlActionRefs: actionData.map((x) => x.code),
    runControlActions: actionData,
    runControlHash: sha256(controlManifest),
    runControlBindingMode: 'frozen-at-formal-run-finalization',
  }
}

export async function finalizeRunControlSession(stepId: string, executionSignature: Record<string, any>) {
  if (!runControlRequiredForStep(stepId)) return
  const current = await currentSession(stepId)
  if (!current || current.data.status !== 'READY_TO_COMPLETE') throw new Error('Run Control Session不在可正式完成状态')
  const finalData = {
    ...current.data,
    status: 'COMPLETED',
    endedAt: nowIso(),
    evidenceEligible: true,
    finalExecutionSignatureRef: executionSignature.code,
    finalExecutionSignatureHash: executionSignature.signatureHash,
  }
  const snapshots = await sessionSnapshots(current.pk)
  const actions = await sessionActions(current.pk)
  const finalHash = sha256({ schema: 'dtep/run-control-final/v2.0e', session: finalData, healthSnapshots: snapshots.map((x) => x.data), controlActions: actions.map((x) => x.data) })
  await patchEntry('RunControlSession', current.pk, { ...finalData, finalRunControlHash: finalHash })
  const run = await entry('TestRun', PROFILES[stepId].runRef)
  if (run) {
    await patchEntry('TestRun', run.pk, {
      runControlSessionSnapshot: { ...finalData, finalRunControlHash: finalHash },
      runControlFinalHash: finalHash,
      runControlFinalExecutionSignatureRef: executionSignature.code,
      runControlFinalExecutionSignatureHash: executionSignature.signatureHash,
    })
  }
}

export async function clearCase01RunControlRecords() {
  for (const apiName of ['RunControlAction', 'RunHealthSnapshot', 'RunControlSession']) {
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
