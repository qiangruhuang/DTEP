import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getGovernanceActor, getStepPolicy, ROLE_NAMES } from '@/lib/case01-governance'

export type ReadinessStepId = 'live-retest' | 'lvc-anchor' | 'digital-5000'

const READINESS_PROFILES: Record<ReadinessStepId, {
  runRef: string
  scenarioRef: string
  executionMode: 'Live' | 'LVC' | 'Digital'
  modelRefs: string[]
  resourceRefs: string[]
  inputDatasetRefs: string[]
  outputDatasetRefs: string[]
}> = {
  'live-retest': {
    runRef: 'RUN-LIVE-002-02', scenarioRef: 'SC-COA-01', executionMode: 'Live',
    modelRefs: ['MD-02'], resourceRefs: ['R-01', 'R-04', 'R-06'],
    inputDatasetRefs: ['raw/environment/range-A'], outputDatasetRefs: ['raw/telemetry/F-2206-R2'],
  },
  'lvc-anchor': {
    runRef: 'RUN-LVC-004-FRM-01', scenarioRef: 'SC-COA-01', executionMode: 'LVC',
    modelRefs: ['MD-01', 'MD-02', 'MD-05', 'MD-07'], resourceRefs: ['R-01', 'R-04', 'R-05', 'R-06'],
    inputDatasetRefs: ['raw/telemetry/F-2206-R2', 'raw/environment/range-A'], outputDatasetRefs: ['raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'],
  },
  'digital-5000': {
    runRef: 'RUN-DOT-S-02', scenarioRef: 'SC-COA-01', executionMode: 'Digital',
    modelRefs: ['MD-01', 'MD-02', 'MD-07', 'MD-08'], resourceRefs: ['R-09'],
    inputDatasetRefs: ['raw/telemetry/F-2206-R2', 'raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'],
    outputDatasetRefs: ['raw/simulation/dot-stress-v2', 'stg/evaluation/metrics-stress-v2'],
  },
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
  if (await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })) throw new Error(`${apiName}/${pk} 已存在；Readiness Review 记录不可覆盖`)
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
async function ensureLink(apiName: string, displayName: string, sourceApi: string, targetApi: string) {
  if (await db.linkType.findFirst({ where: { apiName } })) return
  const [source, target] = await Promise.all([objectType(sourceApi), objectType(targetApi)])
  await db.linkType.create({ data: { apiName, displayName, sourceTypeId: source.id, targetTypeId: target.id, cardinality: '一对多' } })
}

export function readinessRequiredForStep(stepId: string): stepId is ReadinessStepId {
  return stepId in READINESS_PROFILES
}

export async function ensureReadinessOntology() {
  await ensureType('TestReadinessReview', '试验就绪审查', '正式Run前对模型装配、环境装配、资源、输入、数据落盘、网络安全和可重复性进行冻结审查。', 'clipboard-check')
  await ensureType('FederationReadinessReview', '联邦就绪审查', 'LVC正式Run前对联邦节点、协议网关、时统、IDL Topic、Reset和数据捕获进行冻结审查。', 'radio-tower')
  for (const [apiName, displayName, sourceApi, targetApi] of [
    ['readinessUsesModelAssembly', '就绪审查—模型装配', 'TestReadinessReview', 'TestModelAssembly'],
    ['readinessUsesEnvironment', '就绪审查—环境装配', 'TestReadinessReview', 'TestEnvironmentAssembly'],
    ['federationReadinessUsesFederation', '联邦就绪审查—联邦配置', 'FederationReadinessReview', 'LVCFederationConfiguration'],
    ['runUsesTestReadiness', '试验Run—试验就绪审查', 'TestRun', 'TestReadinessReview'],
    ['runUsesFederationReadiness', '试验Run—联邦就绪审查', 'TestRun', 'FederationReadinessReview'],
  ] as const) await ensureLink(apiName, displayName, sourceApi, targetApi)
}

async function latestReview(apiName: 'TestReadinessReview' | 'FederationReadinessReview', stepId: string) {
  const values = (await entries(apiName)).filter((x) => x.data.caseId === 'CASE-01' && x.data.stepId === stepId)
  return values.at(-1) ?? null
}

async function buildContext(stepId: ReadinessStepId) {
  const profile = READINESS_PROFILES[stepId]
  const scenario = await entry('TestScenario', profile.scenarioRef)
  const assembly = scenario?.data.testModelAssemblyRef ? await entry('TestModelAssembly', String(scenario.data.testModelAssemblyRef)) : null
  const environment = scenario?.data.testEnvironmentAssemblyRef ? await entry('TestEnvironmentAssembly', String(scenario.data.testEnvironmentAssemblyRef)) : null
  const federation = environment?.data.federationRef ? await entry('LVCFederationConfiguration', String(environment.data.federationRef)) : null
  const datasets = await db.testDataset.findMany({ where: { path: { in: profile.inputDatasetRefs } } })
  const resources = await db.testResource.findMany({ where: { code: { in: profile.resourceRefs } }, orderBy: { code: 'asc' } })
  return { profile, scenario, assembly, environment, federation, datasets, resources }
}

function check(id: string, label: string, pass: boolean, evidence: string, severity: 'HARD' | 'SOFT' = 'HARD') {
  return { id, label, pass, severity, evidence }
}

export async function executeReadinessReview(stepId: ReadinessStepId, actorId: string) {
  await ensureReadinessOntology()
  const policy = getStepPolicy(stepId)
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`就绪审查必须由“${actor.roleName}”岗位执行`) 
  const { profile, scenario, assembly, environment, federation, datasets, resources } = await buildContext(stepId)
  const previous = await latestReview('TestReadinessReview', stepId)
  if (previous?.data.status === 'READY') throw new Error('当前步骤已有通过的 Readiness Review；请进入审批流程')
  const attempt = Number(previous?.data.attempt ?? 0) + 1
  const modelBindings = Array.isArray(assembly?.data.modelBindings) ? assembly!.data.modelBindings : []
  const envResources = new Set((environment?.data.resourceSnapshots ?? []).map((x: any) => String(x.code)))
  const configuredModels = new Set(modelBindings.map((x: any) => String(x.modelRef)))
  const inputPaths = new Set(datasets.map((x) => x.path))
  const commonChecks = [
    check('SCENARIO-LOCK', '场景已绑定可追溯配置', Boolean(scenario?.data.testModelAssemblyRef && scenario?.data.testEnvironmentAssemblyRef), `${profile.scenarioRef} → ${scenario?.data.testModelAssemblyRef ?? 'NO-TMA'} / ${scenario?.data.testEnvironmentAssemblyRef ?? 'NO-TEA'}`),
    check('MODEL-ASSEMBLY', 'Test Model Assembly 哈希完整', Boolean(assembly?.data.assemblyHash), `${assembly?.pk ?? 'missing'} · ${assembly?.data.assemblyHash ?? 'missing'}`),
    check('ENVIRONMENT-ASSEMBLY', 'Test Environment Assembly 哈希完整', Boolean(environment?.data.environmentHash), `${environment?.pk ?? 'missing'} · ${environment?.data.environmentHash ?? 'missing'}`),
    check('MODEL-ENV-CONSISTENCY', '模型装配与环境装配一致', Boolean(assembly && environment && assembly.data.assemblyHash === environment.data.modelAssemblyHash), `${assembly?.data.assemblyHash ?? 'missing'} ↔ ${environment?.data.modelAssemblyHash ?? 'missing'}`),
    check('MODEL-PINS', '本次Run所需模型均纳入装配', profile.modelRefs.every((id) => configuredModels.has(id)), `required=${profile.modelRefs.join(', ')} · assembled=${Array.from(configuredModels).join(', ') || 'none'}`),
    check('RESOURCE-ALLOCATION', '本次Run所需资源均纳入环境装配', profile.resourceRefs.every((id) => envResources.has(id)), `required=${profile.resourceRefs.join(', ')} · env=${Array.from(envResources).join(', ') || 'none'}`),
    check('INPUT-DATA', '输入数据已可解析并具备路径快照', profile.inputDatasetRefs.every((p) => inputPaths.has(p)), `required=${profile.inputDatasetRefs.join(', ')} · ready=${Array.from(inputPaths).join(', ') || 'none'}`),
    check('DATA-CAPTURE', '输出数据落盘目标已定义', profile.outputDatasetRefs.length > 0, profile.outputDatasetRefs.join(', ')),
    check('TIME-REFERENCE', '统一时统/逻辑时间基准已定义', Boolean(environment?.data.timeService?.authority), `${environment?.data.timeService?.authority ?? 'missing'} · tolerance=${environment?.data.timeService?.syncToleranceMs ?? '—'}ms`),
    check('NETWORK-SECURITY', '逻辑网络与安全边界已冻结', Boolean(environment?.data.logicalNetwork && environment?.data.securityBoundary), environment?.data.securityBoundary?.crossBoundaryPolicy ?? 'missing'),
    check('RESET-POLICY', 'Run间Reset策略已定义', Boolean(environment?.data.timeService?.resetPolicy || federation?.data.federationRules?.resetPolicy), environment?.data.timeService?.resetPolicy ?? federation?.data.federationRules?.resetPolicy ?? 'missing'),
    check('MODEL-LIFECYCLE-PREFLIGHT', '模型数据准备与运行前验证完成', Boolean(assembly && environment), assembly && environment ? 'DEMO/SYNTHETIC：PrepareData → Validate → IsPrepared = TRUE；用于演示SAL模型生命周期就绪检查。' : 'missing assembly/environment'),
  ]
  const hardFailures = commonChecks.filter((x) => x.severity === 'HARD' && !x.pass)
  const testStatus = hardFailures.length ? 'BLOCKED' : 'READY'
  const testManifest = {
    schema: 'dtep/test-readiness-review/v2.0d', caseId: 'CASE-01', stepId, runRef: profile.runRef,
    executionMode: profile.executionMode, scenarioRef: profile.scenarioRef, attempt,
    testModelAssemblyRef: assembly?.pk ?? null, testModelAssemblyHash: assembly?.data.assemblyHash ?? null,
    testEnvironmentAssemblyRef: environment?.pk ?? null, testEnvironmentAssemblyHash: environment?.data.environmentHash ?? null,
    lvcFederationConfigRef: federation?.pk ?? null, lvcFederationConfigHash: federation?.data.federationHash ?? null,
    resourceRefs: profile.resourceRefs, modelRefs: profile.modelRefs, inputDatasetRefs: profile.inputDatasetRefs, outputDatasetRefs: profile.outputDatasetRefs,
    checks: commonChecks, performedBy: actor.id, performedByName: `${actor.title} · ${actor.name}`, performedAt: nowIso(),
  }
  const testReviewHash = sha256(testManifest)
  const testCode = `TRR-CASE01-${stepId.toUpperCase()}-A${attempt}`
  await createEntry('TestReadinessReview', testCode, `${profile.runRef} · Test Readiness Review · A${attempt}`, {
    code: testCode, ...testManifest, status: testStatus, hardFailures: hardFailures.map((x) => x.id), reviewHash: testReviewHash,
    immutable: true, prototypeDataNotice: 'DEMO/SYNTHETIC readiness observations; not a real range/federation certification.',
  })

  let federationReview: Record<string, any> | null = null
  if (profile.executionMode === 'LVC') {
    const lvcProfile = environment?.data.executionProfiles?.LVC
    const activeGatewayRefs = new Set(lvcProfile?.activeGatewayRefs ?? [])
    const gateways = (federation?.data.gateways ?? []).filter((g: any) => activeGatewayRefs.has(g.id))
    const activeNodeRefs = Array.isArray(lvcProfile?.activeNodeRefs) ? lvcProfile.activeNodeRefs : []
    const timeTolerance = Number(federation?.data.timeService?.syncToleranceMs ?? 10)
    const observedSync = attempt === 1 ? 18 : 6
    const federationChecks = [
      check('FED-CONFIG-HASH', 'LVC Federation Configuration 已冻结', Boolean(federation?.data.federationHash), `${federation?.pk ?? 'missing'} · ${federation?.data.federationHash ?? 'missing'}`),
      check('NODE-REGISTRATION', 'L/V/C节点注册清单完整', activeNodeRefs.length >= 6, `${activeNodeRefs.length} nodes · ${activeNodeRefs.join(', ') || 'none'}`),
      check('GATEWAY-HEALTH', 'HLA/DIS/TENA/DDS网关已配置', gateways.length >= 4 && gateways.every((g: any) => g.status === 'configured'), gateways.map((g: any) => `${g.id}:${g.status}`).join(', ') || 'none'),
      check('TOPIC-SCHEMA', 'IDL Topic Schema与联邦契约一致', Boolean(federation?.data.topicSet?.schema) && (federation?.data.topicSet?.topics ?? []).length >= 5, `${federation?.data.topicSet?.schema ?? 'missing'} · ${(federation?.data.topicSet?.topics ?? []).length} topics`),
      check('TIME-SYNC', '联邦节点时统锁定在允许容差内', observedSync <= timeTolerance, `DEMO/SYNTHETIC observed max offset=${observedSync}ms · tolerance=${timeTolerance}ms`),
      check('JOIN-SEQUENCE', '初始化与加入顺序已定义', (federation?.data.federationRules?.initializationOrder ?? []).length >= 5, (federation?.data.federationRules?.initializationOrder ?? []).join(' → ') || 'missing'),
      check('RESET-DRY-RUN', '联邦Reset/重入策略具备可重复运行约束', Boolean(federation?.data.federationRules?.resetPolicy), federation?.data.federationRules?.resetPolicy ?? 'missing'),
      check('FED-DATA-CAPTURE', '联邦事件与Topic数据具备落盘路径', profile.outputDatasetRefs.length >= 2, profile.outputDatasetRefs.join(', ')),
    ]
    const fHardFailures = federationChecks.filter((x) => x.severity === 'HARD' && !x.pass)
    const fStatus = fHardFailures.length ? 'BLOCKED' : 'READY'
    const fManifest = {
      schema: 'dtep/federation-readiness-review/v2.0d', caseId: 'CASE-01', stepId, runRef: profile.runRef, attempt,
      federationRef: federation?.pk ?? null, federationHash: federation?.data.federationHash ?? null,
      environmentRef: environment?.pk ?? null, environmentHash: environment?.data.environmentHash ?? null,
      checks: federationChecks,
      remediation: attempt === 1 && fStatus === 'BLOCKED' ? ['DEMO/SYNTHETIC：重锁 TIME-MASTER-01；清理节点时钟漂移并重新执行联邦加入前时统检查。'] : [],
      performedBy: actor.id, performedByName: `${actor.title} · ${actor.name}`, performedAt: nowIso(),
    }
    const fHash = sha256(fManifest)
    const fCode = `FRR-CASE01-${stepId.toUpperCase()}-A${attempt}`
    federationReview = { code: fCode, ...fManifest, status: fStatus, hardFailures: fHardFailures.map((x) => x.id), reviewHash: fHash, immutable: true }
    await createEntry('FederationReadinessReview', fCode, `${profile.runRef} · Federation Readiness Review · A${attempt}`, federationReview)
  }

  return getReadinessState(stepId, actorId)
}

export async function getReadinessState(stepId: string, actorId?: string | null) {
  if (!readinessRequiredForStep(stepId)) return { required: false, passed: true, status: 'NOT_REQUIRED' }
  await ensureReadinessOntology()
  const policy = getStepPolicy(stepId)
  const actor = actorId ? getGovernanceActor(actorId) : null
  const testReview = await latestReview('TestReadinessReview', stepId)
  const federationReview = stepId === 'lvc-anchor' ? await latestReview('FederationReadinessReview', stepId) : null
  const passed = Boolean(testReview?.data.status === 'READY' && (stepId !== 'lvc-anchor' || federationReview?.data.status === 'READY'))
  const blockers = [
    ...((testReview?.data.checks ?? []).filter((x: any) => !x.pass).map((x: any) => `${x.id}: ${x.evidence}`)),
    ...((federationReview?.data.checks ?? []).filter((x: any) => !x.pass).map((x: any) => `${x.id}: ${x.evidence}`)),
  ]
  const attempt = Math.max(Number(testReview?.data.attempt ?? 0), Number(federationReview?.data.attempt ?? 0))
  return {
    required: true, stepId, executionMode: READINESS_PROFILES[stepId].executionMode,
    status: passed ? 'READY' : attempt ? 'BLOCKED' : 'NOT_RUN', passed, attempt,
    requiredRole: policy.executorRole, requiredRoleName: ROLE_NAMES[policy.executorRole],
    allowed: Boolean(actor && actor.roleId === policy.executorRole),
    latestTestReview: testReview?.data ?? null, latestFederationReview: federationReview?.data ?? null,
    blockers,
    actionLabel: passed ? '就绪审查已通过' : attempt ? (stepId === 'lvc-anchor' ? '执行时统整改并复检' : '重新执行就绪审查') : (stepId === 'lvc-anchor' ? '执行 Test / Federation Readiness Review' : '执行 Test Readiness Review'),
    note: stepId === 'lvc-anchor' ? 'LVC正式Run必须同时通过Test Readiness与Federation Readiness。首轮演示会保留一个时统硬阻塞，复检通过后才允许提交审批。' : '正式Run在提交审批前先冻结自动就绪检查结果。',
  }
}

export async function assertReadinessPassedForStep(stepId: string) {
  if (!readinessRequiredForStep(stepId)) return null
  const state = await getReadinessState(stepId)
  if (!state.passed) throw new Error(`Readiness Review 未通过：${state.blockers?.join('；') || '尚未执行就绪审查'}`)
  return state
}

export async function readinessApprovalContext(stepId: string) {
  if (!readinessRequiredForStep(stepId)) return null
  const state = await assertReadinessPassedForStep(stepId)
  return {
    readinessStatus: state?.status,
    testReadinessReviewRef: state?.latestTestReview?.code ?? null,
    testReadinessReviewHash: state?.latestTestReview?.reviewHash ?? null,
    federationReadinessReviewRef: state?.latestFederationReview?.code ?? null,
    federationReadinessReviewHash: state?.latestFederationReview?.reviewHash ?? null,
  }
}

async function approvalForStep(stepId: string) {
  return entry('ApprovalRecord', `APR-CASE01-${stepId}`)
}

export async function bindRunToReadiness(runData: Record<string, any>, stepId: ReadinessStepId) {
  const state = await assertReadinessPassedForStep(stepId)
  const approval = await approvalForStep(stepId)
  if (!approval || approval.data.status !== 'approved') throw new Error('Readiness Review已通过，但正式Run尚未获得步骤审批')
  if (!approval.data.requestSignatureRef || !approval.data.approvalSignatureRef) throw new Error('Readiness Review审批链缺少申请/批准签署')
  const [requestSignature, approvalSignature] = await Promise.all([
    entry('SignatureRecord', approval.data.requestSignatureRef),
    entry('SignatureRecord', approval.data.approvalSignatureRef),
  ])
  if (!requestSignature || !approvalSignature) throw new Error('Readiness Review审批签署不可解析')
  const testSnapshot = state?.latestTestReview ?? null
  const federationSnapshot = state?.latestFederationReview ?? null
  const approvalSnapshot = {
    code: approval.data.code, status: approval.data.status, requestedBy: approval.data.requestedBy, requestedByName: approval.data.requestedByName,
    approvedBy: approval.data.approvedBy, approvedByName: approval.data.approvedByName, requestedAt: approval.data.requestedAt, approvedAt: approval.data.approvedAt,
    readinessContext: approval.data.subjectContext ?? null,
    requestSignature: { code: requestSignature.data.code, signerName: requestSignature.data.signerName, signatureHash: requestSignature.data.signatureHash, signedAt: requestSignature.data.signedAt },
    approvalSignature: { code: approvalSignature.data.code, signerName: approvalSignature.data.signerName, signatureHash: approvalSignature.data.signatureHash, signedAt: approvalSignature.data.signedAt },
  }
  const manifest = {
    schema: 'dtep/run-readiness-provenance/v2.0d', caseId: 'CASE-01', stepId,
    testReadinessReview: testSnapshot,
    federationReadinessReview: federationSnapshot,
    approval: approvalSnapshot,
  }
  return {
    ...runData,
    readinessReviewRefs: [testSnapshot?.code, federationSnapshot?.code].filter(Boolean),
    testReadinessReviewSnapshot: testSnapshot,
    federationReadinessReviewSnapshot: federationSnapshot,
    readinessApprovalSnapshot: approvalSnapshot,
    readinessReviewHash: sha256(manifest),
    readinessGovernanceVersion: 'v2.0d',
    readinessBindingMode: 'frozen-at-run-creation',
  }
}

export async function attachReadinessExecutionSignature(stepId: string, signature: Record<string, any>) {
  if (!readinessRequiredForStep(stepId)) return
  const runRef = READINESS_PROFILES[stepId].runRef
  const run = await entry('TestRun', runRef)
  if (!run) throw new Error(`Run/${runRef}不存在，无法挂接Readiness执行签署`)
  const executionSignatureSnapshot = {
    code: signature.code, signerName: signature.signerName, signerRoleName: signature.signerRoleName,
    signedAt: signature.signedAt, signatureHash: signature.signatureHash, subjectDigest: signature.subjectDigest,
  }
  const governanceHash = sha256({
    readinessReviewHash: run.data.readinessReviewHash,
    readinessApprovalSnapshot: run.data.readinessApprovalSnapshot,
    executionSignatureSnapshot,
  })
  await patchEntry('TestRun', runRef, {
    readinessExecutionSignatureRef: signature.code,
    readinessExecutionSignatureSnapshot: executionSignatureSnapshot,
    readinessGovernanceHash: governanceHash,
  })
}

export async function clearCase01ReadinessReviews() {
  for (const apiName of ['TestReadinessReview', 'FederationReadinessReview']) {
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
