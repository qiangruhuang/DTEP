import { createHash } from 'crypto'
import { db } from '@/lib/db'
import baseline from '@/lib/case01-v03-baseline.json'
import { evaluateEvidencePackage } from '@/lib/evidence-gate-service'
import { CASE01_ACTORS, assertStepExecutionAuthorized, ensureCase01GovernanceOntology, getStepGovernance, getStepPolicy, hasStepExecutionSignature, listCase01GovernanceRecords, recordStepExecutionSignature, resetCase01GovernanceRecords } from '@/lib/case01-governance'
import { bindRunToCurrentAssembly, createCase01StressAssemblyV2, restoreCase01AssembliesIfBaselineAvailable } from '@/lib/test-model-assembly'
import { bindRunToCurrentEnvironment, createCase01StressEnvironmentV2, restoreCase01EnvironmentAssembliesIfAvailable } from '@/lib/test-environment-assembly'
import { attachReadinessExecutionSignature, bindRunToReadiness, clearCase01ReadinessReviews, getReadinessState } from '@/lib/test-readiness-review'
import { assertRunControlReadyForFormalization, bindRunToControl, clearCase01RunControlRecords, finalizeRunControlSession, getRunControlState, runControlRequiredForStep } from '@/lib/run-control-monitoring'
import { assertRunDataQualityReadyForEvidence, bindRunToDataQuality, clearCase01RunDataQualityRecords, finalizeRunDataQuality, getRunDataQualityState, runDataQualityRequiredForStep } from '@/lib/run-data-quality'
import { assertAutomatedAdjudicationReadyForRunSignoff, automatedAdjudicationRequiredForStep, bindRunToAutomatedAdjudication, clearCase01AutomatedAdjudicationRecords, finalizeAutomatedAdjudication, getAutomatedAdjudicationState } from '@/lib/event-to-measure'
import { assertExpertReviewReadyForFinalApproval, clearCase01ExpertReviewRecords, getExpertReviewState } from '@/lib/expert-review'

export type Case01StepId =
  | 'live-retest'
  | 'lvc-anchor'
  | 'vva-accredit'
  | 'digital-5000'
  | 'draft-package'
  | 'freeze-package'
  | 'strict-gate'
  | 'freeze-conclusion'

export const CASE01_STEPS: Array<{ id: Case01StepId; label: string; short: string; output: string }> = [
  { id: 'live-retest', label: '执行强干扰归零复试', short: 'Live 复试', output: 'Readiness + Run Control + Event Reconstruction + M-03自动判读 + 现实锚点' },
  { id: 'lvc-anchor', label: '完成正式 LVC 联合任务试验', short: 'LVC 锚点', output: 'TRR/FRR + Federation + 时间对齐事件账本 + M-08自动判读 + 任务线程锚点' },
  { id: 'vva-accredit', label: '提交并完成高压 VV&A 扩域认可', short: 'VV&A', output: 'MD-02/07/08 进入认可适用域' },
  { id: 'digital-5000', label: '执行 5,000 次正式数字试验', short: '5,000 Run', output: 'Readiness + Run Control + Data Quality + M-13/M-14自动判读' },
  { id: 'draft-package', label: '生成 Evidence Package V0.4 草稿', short: 'V0.4 草稿', output: '固定证据引用与结论候选' },
  { id: 'freeze-package', label: '冻结 Evidence Package V0.4', short: '冻结证据', output: '不可变 Manifest + SHA-256' },
  { id: 'strict-gate', label: '运行并记录 STRICT-V1 正式门控', short: 'STRICT-V1', output: 'Gate PASS / 正式证据充分性' },
  { id: 'freeze-conclusion', label: '冻结 CASE-01 正式鉴定结论', short: '冻结结论', output: '专家合议终审 + 正式批准 + 适用边界 + Action Log' },
]

const DEMO_DATASETS = {
  'raw/telemetry/F-2206-R2': { name: 'raw_telemetry_F2206_R2', description: 'DEMO/SYNTHETIC: TE-25-002 归零后强干扰复试原始遥测', domain: 'telemetry', origin: 'raw', qualityScore: 98, rowCount: 1864200, sizeMb: 842.6 },
  'raw/simulation/lvc-02': { name: 'raw_sim_lvc02', description: 'DEMO/SYNTHETIC: TE-25-004 正式 LVC 联合任务 Run 原始事件流', domain: 'simulation', origin: 'raw', qualityScore: 97, rowCount: 2840000, sizeMb: 1280.4 },
  'stg/evaluation/lvc-score-v2': { name: 'stg_lvc_score_v2', description: 'DEMO/SYNTHETIC: 正式 LVC 任务线程评分与现实锚定结果', domain: 'evaluation', origin: 'derived', qualityScore: 98, rowCount: 48000, sizeMb: 26.2 },
  'raw/simulation/dot-stress-v2': { name: 'raw_sim_dot_stress_v2', description: 'DEMO/SYNTHETIC: SC-COA-01 5,000 次正式数字化高压 Run 输出', domain: 'simulation', origin: 'raw', qualityScore: 99, rowCount: 5000000, sizeMb: 2380 },
  'stg/evaluation/metrics-stress-v2': { name: 'stg_metrics_stress_v2', description: 'DEMO/SYNTHETIC: 5,000 次正式高压 Run 统计判读与不确定性汇总', domain: 'evaluation', origin: 'derived', qualityScore: 99, rowCount: 125000, sizeMb: 41.7 },
} as const

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`
}

async function type(apiName: string) {
  const value = await db.objectType.findUnique({ where: { apiName } })
  if (!value) throw new Error(`${apiName} 本体未初始化`)
  return value
}

async function entry(apiName: string, pk: string) {
  const t = await type(apiName)
  const value = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!value) return null
  return { ...value, data: JSON.parse(value.dataJson || '{}') as Record<string, any> }
}

async function entries(apiName: string) {
  const t = await type(apiName)
  const values = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
  return values.map((value) => ({ ...value, data: JSON.parse(value.dataJson || '{}') as Record<string, any> }))
}

async function upsertEntry(apiName: string, pk: string, title: string, data: Record<string, any>) {
  const t = await type(apiName)
  const current = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (current) {
    await db.objectEntry.update({ where: { id: current.id }, data: { title, dataJson: JSON.stringify(data) } })
  } else {
    await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
    await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  }
}

async function patchEntry(apiName: string, pk: string, patch: Record<string, any> | ((data: Record<string, any>) => Record<string, any>)) {
  const current = await entry(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  const next = typeof patch === 'function' ? patch(current.data) : { ...current.data, ...patch }
  await db.objectEntry.update({ where: { id: current.id }, data: { dataJson: JSON.stringify(next) } })
  return next
}

async function deleteEntry(apiName: string, pk: string) {
  const t = await type(apiName)
  const current = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!current) return
  await db.objectEntry.delete({ where: { id: current.id } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { decrement: 1 } } })
}

async function ensureDataset(path: keyof typeof DEMO_DATASETS) {
  const spec = DEMO_DATASETS[path]
  const current = await db.testDataset.findFirst({ where: { path } })
  const data = { ...spec, path, status: 'ready', schemaJson: '[]', lastBuiltAt: new Date() }
  if (current) await db.testDataset.update({ where: { id: current.id }, data })
  else await db.testDataset.create({ data })
}

async function ensureTransitionActionType() {
  const existing = await db.actionType.findFirst({ where: { apiName: 'case01StateTransition' } })
  if (existing) return existing
  const caseType = await type('DigitalTestCase')
  return db.actionType.create({ data: { apiName: 'case01StateTransition', displayName: 'CASE-01 演示状态迁移', objectTypeId: caseType.id, parametersJson: JSON.stringify([{ name: 'step', type: 'string' }]), description: 'CASE-01 可点击状态机受控动作；仅用于 DEMO/SYNTHETIC 原型演示。' } })
}

async function logTransition(step: string, detail: Record<string, any>, performedBy = '试验总师 · 周衡') {
  const actionType = await ensureTransitionActionType()
  return db.actionLog.create({ data: { actionTypeId: actionType.id, objectPk: 'CASE-01', parametersJson: JSON.stringify({ step, ...detail, prototypeData: 'DEMO/SYNTHETIC' }), status: 'succeeded', performedBy } })
}

function runLiveData() {
  return {
    code: 'RUN-LIVE-002-02', caseId: 'CASE-01', eventId: 'TE-25-002', scenarioId: 'SC-COA-01', executionMode: 'Live', status: '已完成', configurationBaseline: 'CBL-TE002-2026.09.01-r4', replications: 3, randomSeedPolicy: 'N/A', resourceSnapshot: ['R-01@online', 'R-04@online', 'R-06@online'], modelSnapshot: ['MD-02@CH-3.5'], inputDatasetRefs: ['raw/environment/range-A'], outputDatasetRefs: ['raw/telemetry/F-2206-R2'], modelDomainChecks: [{ model: 'MD-02', inDomain: true, reason: '复试覆盖 J/S 18–24 dB 与扩展组合干扰样式；用于后续 CH-3.5 扩域认可证据。' }], anomalyRefs: [], formalEvidenceClass: '正式证据', resultSummary: 'DEMO/SYNTHETIC：完成 3 组受控强干扰复试；故障归零后无 I 类停试，形成高压任务线程现实锚点。', operator: '现场指挥 · 林晓东', startedAt: 'D+61 08:10', endedAt: 'D+61 16:40',
  }
}

function runLvcData() {
  return {
    code: 'RUN-LVC-004-FRM-01', caseId: 'CASE-01', eventId: 'TE-25-004', scenarioId: 'SC-COA-01', executionMode: 'LVC', status: '已完成', configurationBaseline: 'CBL-LVC-004-FRM-r2', replications: 36, randomSeedPolicy: '固定受控种子集 LVC-FRM-001..036', resourceSnapshot: ['R-01@live-node', 'R-05@6-node-federation', 'R-06@threat-emulation'], modelSnapshot: ['MD-01@FC-7.2', 'MD-02@CH-3.5', 'MD-05@RED-5.0', 'MD-07@DE-4.1'], inputDatasetRefs: ['raw/telemetry/F-2206-R2', 'raw/environment/range-A'], outputDatasetRefs: ['raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'], modelDomainChecks: [{ model: 'MD-01', inDomain: true, reason: '飞行包线位于认可域' }, { model: 'MD-02', inDomain: true, reason: '强电磁组合样式形成扩域验证证据' }, { model: 'MD-05', inDomain: true, reason: '红方模板使用在当前认可范围内' }, { model: 'MD-07', inDomain: true, reason: 'Threat=4 形成扩域验证证据' }], anomalyRefs: [], formalEvidenceClass: '正式证据', resultSummary: 'DEMO/SYNTHETIC：36 个正式 LVC 任务线程 Run 完成 S3/S4 多节点交互锚定，支持高压数字环境校准。', operator: 'LVC 总控席 · 刘晨', startedAt: 'D+63 09:00', endedAt: 'D+64 18:15',
  }
}

function runDigitalData() {
  return {
    code: 'RUN-DOT-S-02', caseId: 'CASE-01', eventId: 'TE-25-009', scenarioId: 'SC-COA-01', executionMode: 'Digital', status: '已完成', configurationBaseline: 'CBL-DOT-009-STRESS-v2-FROZEN', replications: 5000, randomSeedPolicy: '受控种子 seed=300001..305000；清单随 Evidence Package 冻结', resourceSnapshot: ['R-09@cluster-snapshot-20260902'], modelSnapshot: ['MD-01@FC-7.2', 'MD-02@CH-3.5', 'MD-07@DE-4.1', 'MD-08@MT-1.3'], inputDatasetRefs: ['raw/telemetry/F-2206-R2', 'raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'], outputDatasetRefs: ['raw/simulation/dot-stress-v2', 'stg/evaluation/metrics-stress-v2'], modelDomainChecks: [{ model: 'MD-01', inDomain: true, reason: '任务飞行包线位于 FC-7.2 认可域' }, { model: 'MD-02', inDomain: true, reason: 'EW=75% 映射的 J/S 与组合干扰样式位于 CH-3.5 扩展认可域' }, { model: 'MD-07', inDomain: true, reason: 'Threat=4 位于 DE-4.1 扩展认可域' }, { model: 'MD-08', inDomain: true, reason: 'Threat=4、EW=75%、兵力比0.85 均位于 MT-1.3 认可域' }], anomalyRefs: [], formalEvidenceClass: '正式证据', resultSummary: 'DEMO/SYNTHETIC：5,000 次正式高压 Run 任务成功率 83.2%，95% Wilson CI 82.1%–84.2%，低于 85% 鉴定门槛；高压孪生 NRMSE 6.8%。', operator: '数字试验运行席 · 吴静', startedAt: 'D+66 08:30', endedAt: 'D+66 21:05',
  }
}

function packageDraftData() {
  return {
    code: 'EP-CASE01-M13-V0.4', caseId: 'CASE-01', version: 'V0.4', scope: 'SC-COA-01 Threat=4 / EW=75% 高威胁任务效能正式证据闭环', status: '草稿/待冻结',
    runRefs: ['RUN-LIVE-002-02', 'RUN-LVC-004-FRM-01', 'RUN-DOT-S-02'], requiredRunRefs: ['RUN-DOT-S-02'], datasetRefs: ['raw/telemetry/F-2206-R2', 'raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2', 'raw/simulation/dot-stress-v2', 'stg/evaluation/metrics-stress-v2'], modelRefs: ['MD-01', 'MD-02', 'MD-07', 'MD-08'], scenarioRefs: ['SC-COA-01'], measureRefs: ['M-13', 'M-14'], liveAnchorRefs: ['RUN-LIVE-002-02', 'RUN-LVC-004-FRM-01'], ruleSetRef: 'GRS-CASE01-STRICT-V1', supersedes: 'EP-CASE01-M13-V0.3',
    analysis: { statisticalReady: true, summary: 'DEMO/SYNTHETIC：5,000 次正式高压 Run 成功率 83.2%（95% CI 82.1%–84.2%），门槛 85%；高压孪生 NRMSE 6.8%。', performanceDecision: '未达到 M-13 85% 要求' },
    conclusionCandidate: '证据闭环已满足正式判定条件；在 SC-COA-01（Threat=4 / EW=75% / Force Ratio=0.85）条件下，M-13 任务成功率未达到 85% 鉴定要求。',
    limitations: ['结论仅适用于本 Evidence Package 冻结的 SC-COA-01 与已认可模型版本', 'Threat=5、EW>80% 或严重战损条件不在本结论适用范围', '原型中的数值为 DEMO/SYNTHETIC，不代表真实装备试验结果'],
    packageHash: null, frozenAt: null, frozenBy: null, manifest: null, gateDecision: null, gateEvaluatedAt: null, lastGateEvaluation: null,
  }
}

async function freezePackageV04() {
  const pkg = await entry('EvidencePackage', 'EP-CASE01-M13-V0.4')
  if (!pkg) throw new Error('V0.4 草稿尚未生成')
  if (String(pkg.data.status).startsWith('已冻结')) return pkg.data
  const data = pkg.data
  const runIds = data.runRefs as string[]
  const datasetPaths = data.datasetRefs as string[]
  const modelIds = data.modelRefs as string[]
  const scenarioIds = data.scenarioRefs as string[]
  const measureIds = data.measureRefs as string[]
  const ruleSetId = String(data.ruleSetRef)
  const [runEntries, modelEntries, scenarioEntries, measureEntries, ruleEntry, datasets] = await Promise.all([
    Promise.all(runIds.map((id) => entry('TestRun', id))),
    Promise.all(modelIds.map((id) => entry('ModelAsset', id))),
    Promise.all(scenarioIds.map((id) => entry('TestScenario', id))),
    Promise.all(measureIds.map((id) => entry('Measure', id))),
    entry('EvidenceGateRuleSet', ruleSetId),
    db.testDataset.findMany({ where: { path: { in: datasetPaths } } }),
  ])
  if ([...runEntries, ...modelEntries, ...scenarioEntries, ...measureEntries, ruleEntry].some((x) => !x) || datasets.length !== datasetPaths.length) throw new Error('冻结前引用完整性检查失败')
  const dataQualityBlocked = runEntries.filter(Boolean).filter((run: any) => run.data.runDataQualityVersion !== 'v2.0f' || run.data.dataQualityAssessmentSnapshot?.decision !== 'READY_FOR_EVIDENCE' || !run.data.runDataQualityFinalHash)
  if (dataQualityBlocked.length) throw new Error(`Evidence Package冻结被Run Data Quality阻塞：${dataQualityBlocked.map((run: any) => run.pk).join('、')}`)
  const adjudicationBlocked = runEntries.filter(Boolean).filter((run: any) => run.data.automatedAdjudicationVersion !== 'v2.0g' || run.data.runAdjudicationDecisionSnapshot?.decision !== 'READY_FOR_RUN_SIGNOFF' || !run.data.automatedAdjudicationFinalHash)
  if (adjudicationBlocked.length) throw new Error(`Evidence Package冻结被Event-to-Measure自动判读阻塞：${adjudicationBlocked.map((run: any) => run.pk).join('、')}`)
  if (!String(ruleEntry!.data.status).startsWith('已发布')) throw new Error('STRICT-V1 不是已发布规则集')
  const snap = (x: any) => ({ pk: x.pk, title: x.title, data: x.data })
  const manifest = {
    schema: 'dtep/evidence-package-manifest/v2.0g', packageId: 'EP-CASE01-M13-V0.4', version: data.version, scope: data.scope,
    runRefs: runIds, requiredRunRefs: data.requiredRunRefs, datasetRefs: datasetPaths, modelRefs: modelIds, scenarioRefs: scenarioIds, measureRefs: measureIds, liveAnchorRefs: data.liveAnchorRefs, ruleSetRef: ruleSetId,
    analysis: data.analysis, conclusionCandidate: data.conclusionCandidate, limitations: data.limitations,
    runDataQualityRefs: runEntries.filter(Boolean).map((run: any) => ({ runRef: run.pk, reconstructionRef: run.data.eventReconstructionRef, reconstructionHash: run.data.eventReconstructionHash, assessmentRef: run.data.dataQualityAssessmentRef, assessmentHash: run.data.dataQualityAssessmentHash, finalHash: run.data.runDataQualityFinalHash, decision: run.data.dataQualityAssessmentSnapshot?.decision, qualityScore: run.data.dataQualityAssessmentSnapshot?.qualityScore })),
    automatedAdjudicationRefs: runEntries.filter(Boolean).map((run: any) => ({ runRef: run.pk, ruleSetRef: run.data.adjudicationRuleSetRef, ruleSetHash: run.data.adjudicationRuleSetHash, decisionRef: run.data.runAdjudicationDecisionRef, decisionHash: run.data.runAdjudicationDecisionHash, finalHash: run.data.automatedAdjudicationFinalHash, performanceResults: (run.data.runMeasureResultSnapshots ?? []).map((x: any) => ({ measureRef: x.measureRef, value: x.value, unit: x.unit, threshold: x.thresholdSnapshot, performanceDecision: x.performanceDecision, resultHash: x.resultHash })) })),
    runSnapshots: runEntries.filter(Boolean).map(snap).sort((a, b) => a.pk.localeCompare(b.pk)), modelSnapshots: modelEntries.filter(Boolean).map(snap).sort((a, b) => a.pk.localeCompare(b.pk)), scenarioSnapshots: scenarioEntries.filter(Boolean).map(snap).sort((a, b) => a.pk.localeCompare(b.pk)), measureSnapshots: measureEntries.filter(Boolean).map(snap).sort((a, b) => a.pk.localeCompare(b.pk)), ruleSetSnapshot: snap(ruleEntry),
    datasetSnapshots: datasets.sort((a, b) => a.path.localeCompare(b.path)).map((d) => ({ path: d.path, name: d.name, domain: d.domain, origin: d.origin, status: d.status, rowCount: d.rowCount, sizeMb: d.sizeMb, qualityScore: d.qualityScore, schemaJson: d.schemaJson, lastBuiltAt: d.lastBuiltAt?.toISOString() ?? null })),
  }
  const frozenAt = new Date().toISOString()
  const next = { ...data, status: '已冻结（正式鉴定候选）', packageHash: sha256(manifest), frozenAt, frozenBy: '试验总师 · 周衡', manifest }
  await upsertEntry('EvidencePackage', pkg.pk, pkg.title, next)
  return next
}

async function gateContext(packageId: string, ruleSetId: string) {
  const [packages, ruleSets, runs, models, measures, datasets] = await Promise.all([
    entries('EvidencePackage'), entries('EvidenceGateRuleSet'), entries('TestRun'), entries('ModelAsset'), entries('Measure'), db.testDataset.findMany({ select: { path: true, name: true, qualityScore: true, domain: true, origin: true } }),
  ])
  const evidencePackage = packages.find((p) => p.pk === packageId)
  const ruleSet = ruleSets.find((r) => r.pk === ruleSetId)
  if (!evidencePackage || !ruleSet) throw new Error('门控上下文不完整')
  return { evidencePackage, ruleSet, runs, models, measures, datasets }
}

async function commitStrictGate() {
  const ctx = await gateContext('EP-CASE01-M13-V0.4', 'GRS-CASE01-STRICT-V1')
  const result = evaluateEvidencePackage(ctx)
  if (result.assessmentMode !== '正式准入评估') throw new Error('当前不是正式准入评估')
  if (result.decision !== '通过') throw new Error(`STRICT-V1 当前判定为“${result.decision}”，不能进入结论冻结`)
  const pkg = ctx.evidencePackage
  const recordedAt = new Date().toISOString()
  const snapshot = { ...result, recordedAt, performedBy: '鉴定规则委员会 · 孙立' }
  await upsertEntry('EvidencePackage', pkg.pk, pkg.title, { ...pkg.data, gateDecision: result.decision, gateEvaluatedAt: recordedAt, lastGateEvaluation: snapshot })
  await patchEntry('EvidenceGate', 'EG-M03', { decision: '通过', blockers: [], requiredEvidence: [], lastEvaluated: 'D+67', note: 'DEMO/SYNTHETIC：归零复试与 LVC 锚点已完成。' })
  await patchEntry('EvidenceGate', 'EG-M13', { decision: '通过', blockers: [], requiredEvidence: [], lastEvaluated: 'D+67', note: 'Evidence Gate 通过表示证据足以形成正式结论；M-13 性能结论仍为未达到 85% 要求。' })
  return result
}

async function currentStepIndex() {
  const live = await entry('TestRun', 'RUN-LIVE-002-02')
  if (!live || live.data.status !== '已完成' || !(await hasStepExecutionSignature('live-retest'))) return 0
  const lvc = await entry('TestRun', 'RUN-LVC-004-FRM-01')
  if (!lvc || lvc.data.status !== '已完成' || !(await hasStepExecutionSignature('lvc-anchor'))) return 1
  const [md02, md07, md08] = await Promise.all([entry('ModelAsset', 'MD-02'), entry('ModelAsset', 'MD-07'), entry('ModelAsset', 'MD-08')])
  if ([md02, md07, md08].some((m) => !m || m.data.accreditation !== '已认可') || !(await hasStepExecutionSignature('vva-accredit'))) return 2
  const digital = await entry('TestRun', 'RUN-DOT-S-02')
  if (!digital || digital.data.status !== '已完成' || digital.data.formalEvidenceClass !== '正式证据' || !(await hasStepExecutionSignature('digital-5000'))) return 3
  const pkg = await entry('EvidencePackage', 'EP-CASE01-M13-V0.4')
  if (!pkg || !(await hasStepExecutionSignature('draft-package'))) return 4
  if (!String(pkg.data.status).startsWith('已冻结') || !(await hasStepExecutionSignature('freeze-package'))) return 5
  if (pkg.data.gateDecision !== '通过' || !(await hasStepExecutionSignature('strict-gate'))) return 6
  const testCase = await entry('DigitalTestCase', 'CASE-01')
  if (!testCase || testCase.data.status !== '正式结论已冻结' || !(await hasStepExecutionSignature('freeze-conclusion'))) return 7
  return 8
}

export async function getCase01StateMachine(actorId?: string | null) {
  await ensureCase01GovernanceOntology()
  const current = await currentStepIndex()
  const actionType = await db.actionType.findFirst({ where: { apiName: 'case01StateTransition' } })
  const logs = actionType ? await db.actionLog.findMany({ where: { actionTypeId: actionType.id, objectPk: 'CASE-01' }, orderBy: { createdAt: 'desc' }, take: 24 }) : []
  const [testCase, pkg, strict, governanceRecords] = await Promise.all([entry('DigitalTestCase', 'CASE-01'), entry('EvidencePackage', 'EP-CASE01-M13-V0.4'), entry('EvidenceGateRuleSet', 'GRS-CASE01-STRICT-V1'), listCase01GovernanceRecords()])
  const currentGovernance = current < CASE01_STEPS.length ? await getStepGovernance(CASE01_STEPS[current].id, actorId) : null
  const currentReadiness = current < CASE01_STEPS.length ? await getReadinessState(CASE01_STEPS[current].id, actorId) : { required: false, passed: true, status: 'NOT_REQUIRED' }
  const currentRunControl = current < CASE01_STEPS.length ? await getRunControlState(CASE01_STEPS[current].id, actorId) : { required: false, status: 'NOT_REQUIRED', readyForFormalization: true }
  const currentDataQuality = current < CASE01_STEPS.length ? await getRunDataQualityState(CASE01_STEPS[current].id, actorId) : { required: false, status: 'NOT_REQUIRED', readyForEvidence: true }
  const currentAdjudication = current < CASE01_STEPS.length ? await getAutomatedAdjudicationState(CASE01_STEPS[current].id, actorId) : { required: false, status: 'NOT_REQUIRED', readyForRunSignoff: true }
  const currentExpertReview = current < CASE01_STEPS.length && CASE01_STEPS[current].id === 'freeze-conclusion' ? await getExpertReviewState(actorId) : { required: false, status: 'NOT_REQUIRED', readyForFinalApproval: true }
  return {
    caseId: 'CASE-01', currentStep: current, completed: current >= CASE01_STEPS.length,
    actors: CASE01_ACTORS, selectedActorId: actorId ?? null, governance: currentGovernance, readiness: currentReadiness, runControl: currentRunControl, runDataQuality: currentDataQuality, automatedAdjudication: currentAdjudication, expertReview: currentExpertReview,
    approvals: governanceRecords.approvals, signatures: governanceRecords.signatures,
    status: testCase?.data.status ?? '未知', finalGateDecision: testCase?.data.finalGateDecision ?? pkg?.data.gateDecision ?? null, performanceDecision: testCase?.data.performanceDecision ?? null,
    packageStatus: pkg?.data.status ?? '未生成', packageHash: pkg?.data.packageHash ?? null, strictPublishedHash: strict?.data.publishedHash ?? null,
    steps: CASE01_STEPS.map((step, index) => ({ ...step, index, policy: getStepPolicy(step.id), state: index < current ? 'done' : index === current ? 'current' : 'locked' })),
    logs: logs.map((log) => ({ id: log.id, status: log.status, performedBy: log.performedBy, createdAt: log.createdAt.toISOString(), parameters: JSON.parse(log.parametersJson || '{}') })),
    prototypeDataNotice: '所有新增运行结果、Readiness、Run Control、事件重建、自动判读与专家合议数据均为 DEMO/SYNTHETIC；机器负责冻结规则执行，人类专家负责证据解释、适用范围与最终鉴定责任。',
  }
}

export async function resetCase01Demo() {
  for (const item of baseline.entries as Array<any>) await upsertEntry(item.apiName, item.pk, item.title, item.data)
  for (const item of baseline.deleteEntries as Array<any>) await deleteEntry(item.apiName, item.pk)
  for (const path of baseline.deleteDatasets as string[]) await db.testDataset.deleteMany({ where: { path } })
  const actionType = await ensureTransitionActionType()
  await db.actionLog.deleteMany({ where: { actionTypeId: actionType.id, objectPk: 'CASE-01' } })
  await resetCase01GovernanceRecords()
  await clearCase01ReadinessReviews()
  await clearCase01AutomatedAdjudicationRecords()
  await clearCase01ExpertReviewRecords()
  await clearCase01RunDataQualityRecords()
  await clearCase01RunControlRecords()
  await restoreCase01AssembliesIfBaselineAvailable()
  await restoreCase01EnvironmentAssembliesIfAvailable()
  await logTransition('reset', { label: '重置为 V0.3 BLOCKED 基线', result: 'CASE-01 已恢复到证据闭环前状态；若3.0基地基线已存在，则重新挂接 Test Model Assembly v1' })
  return getCase01StateMachine()
}

export async function executeCase01Step(stepId: Case01StepId, actorId: string) {
  await ensureCase01GovernanceOntology()
  const current = await currentStepIndex()
  if (current >= CASE01_STEPS.length) throw new Error('CASE-01 已完成全部状态迁移；请先重置演示')
  const expected = CASE01_STEPS[current]
  if (stepId !== expected.id) throw new Error(`动作越序：当前只能执行“${expected.label}”`)
  if (stepId === 'freeze-conclusion') await assertExpertReviewReadyForFinalApproval()
  const actor = await assertStepExecutionAuthorized(stepId, actorId)
  if (runControlRequiredForStep(stepId)) await assertRunControlReadyForFormalization(stepId)
  if (runDataQualityRequiredForStep(stepId)) await assertRunDataQualityReadyForEvidence(stepId)
  if (automatedAdjudicationRequiredForStep(stepId)) await assertAutomatedAdjudicationReadyForRunSignoff(stepId)
  const actorLabel = `${actor.title} · ${actor.name}`
  let executionLog: Awaited<ReturnType<typeof logTransition>> | null = null
  const stepLog = async (detail: Record<string, any>) => {
    executionLog = await logTransition(stepId, detail, actorLabel)
    return executionLog
  }

  if (stepId === 'live-retest') {
    await ensureDataset('raw/telemetry/F-2206-R2')
    await upsertEntry('TestRun', 'RUN-LIVE-002-02', 'TE-25-002 强干扰归零后正式复试 Run', await bindRunToAutomatedAdjudication(await bindRunToDataQuality(await bindRunToControl(await bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLiveData())), 'live-retest'), 'live-retest'), 'live-retest'), 'live-retest'))
    await patchEntry('TestEvent', 'TE-25-002', (d) => ({ ...d, status: '已完成', progress: 100, anomalyScore: 0.12, produces: Array.from(new Set([...(d.produces ?? []), 'raw/telemetry/F-2206-R2'])) }))
    await patchEntry('Deficiency', 'DF-25-01', { status: '已归零/复试通过', closedAt: 'D+61', closureEvidence: ['RUN-LIVE-002-02', 'raw/telemetry/F-2206-R2'], rootCause: '跳频驻留时间不足；已完成修正并通过受控强干扰复试（DEMO/SYNTHETIC）' })
    await stepLog({ created: ['RUN-LIVE-002-02', 'raw/telemetry/F-2206-R2'], result: '故障归零，形成正式 Live Anchor' })
  }

  if (stepId === 'lvc-anchor') {
    await ensureDataset('raw/simulation/lvc-02'); await ensureDataset('stg/evaluation/lvc-score-v2')
    await upsertEntry('TestRun', 'RUN-LVC-004-FRM-01', 'TE-25-004 正式 LVC 联合任务 Run', await bindRunToAutomatedAdjudication(await bindRunToDataQuality(await bindRunToControl(await bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runLvcData())), 'lvc-anchor'), 'lvc-anchor'), 'lvc-anchor'), 'lvc-anchor'))
    await patchEntry('TestEvent', 'TE-25-004', (d) => ({ ...d, status: '已完成', progress: 100, anomalyScore: 0.04, produces: Array.from(new Set([...(d.produces ?? []), 'raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'])) }))
    await stepLog({ created: ['RUN-LVC-004-FRM-01', 'raw/simulation/lvc-02', 'stg/evaluation/lvc-score-v2'], result: '36 个正式 LVC Run 完成任务线程锚定' })
  }

  if (stepId === 'vva-accredit') {
    await patchEntry('ModelAsset', 'MD-02', { version: 'CH-3.5', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可', validationDomain: '链路20–180km；J/S 0–25dB；5类已测/组合干扰（含 CASE-01 高压样式）', limitations: ['180km以上仍不在认可域', '新型未知认知干扰仍需单独评估'], liveDataRefs: ['TE-25-002/F-2206', 'TE-25-002/F-2206-R2'], lastReviewed: 'D+65' })
    await patchEntry('ModelAsset', 'MD-07', { version: 'DE-4.1', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可', validationDomain: '威胁构型V4.1；威胁密度1–4级；CASE-01 固定/受控适应性交战规则', limitations: ['威胁密度5级不在认可域'], liveDataRefs: ['TE-25-004/LVC-AAR', 'TE-25-004/LVC-AAR-v2'], lastReviewed: 'D+65' })
    await patchEntry('ModelAsset', 'MD-08', { version: 'MT-1.3', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可', validationDomain: 'MT-01；威胁1–4级；EW≤80%；兵力比0.8–1.2；复杂/恶劣天气', limitations: ['Threat=5 或 EW>80% 需重新认可', '不覆盖严重战损下任务重构'], liveDataRefs: ['TE-25-002/F-2206-R2', 'TE-25-004/LVC-AAR-v2', 'TE-25-006/F-2208'], lastReviewed: 'D+65' })
    await patchEntry('TestScenario', 'SC-COA-01', { status: '已批准/正式高压评估', models: ['MD-01@FC-7.2', 'MD-02@CH-3.5', 'MD-07@DE-4.1', 'MD-08@MT-1.3'], linkedEvents: ['TE-25-002', 'TE-25-004', 'TE-25-009'], assumptions: ['CASE-01 正式高压鉴定场景', 'Threat=4 / EW=75% / Force Ratio=0.85 均已纳入本次模型认可适用域'] })
    const assemblyV2 = await createCase01StressAssemblyV2()
    const environmentV2 = await createCase01StressEnvironmentV2()
    await stepLog({ updated: ['MD-02@CH-3.5', 'MD-07@DE-4.1', 'MD-08@MT-1.3', assemblyV2.code, environmentV2.code], result: '高压场景进入已认可 Validation Domain，并生成正式 Run 使用的 Test Model Assembly v2 + Test Environment Assembly v2' })
  }

  if (stepId === 'digital-5000') {
    await ensureDataset('raw/simulation/dot-stress-v2'); await ensureDataset('stg/evaluation/metrics-stress-v2')
    await upsertEntry('TestRun', 'RUN-DOT-S-02', '高压验证域扩展后的 5,000 次正式数字化 Run', await bindRunToAutomatedAdjudication(await bindRunToDataQuality(await bindRunToControl(await bindRunToReadiness(await bindRunToCurrentEnvironment(await bindRunToCurrentAssembly(runDigitalData())), 'digital-5000'), 'digital-5000'), 'digital-5000'), 'digital-5000'))
    await patchEntry('TestEvent', 'TE-25-009', (d) => ({ ...d, status: '已完成', progress: 100, anomalyScore: 0.03, produces: Array.from(new Set([...(d.produces ?? []), 'raw/simulation/dot-stress-v2', 'stg/evaluation/metrics-stress-v2'])) }))
    await patchEntry('TestScenario', 'SC-COA-01', { runCount: 5536 })
    await patchEntry('MissionThread', 'MT-01', (d) => ({ ...d, coverage: 88, status: 'CASE-01 关键证据闭环完成', risks: ['S2/S6 仍存在其他试验覆盖不足，但不阻塞本次 M-13 高压任务效能正式判定'], steps: (d.steps ?? []).map((x: any) => x.id === 'S3' ? { ...x, status: 'covered' } : x) }))
    await stepLog({ created: ['raw/simulation/dot-stress-v2', 'stg/evaluation/metrics-stress-v2'], updated: ['RUN-DOT-S-02'], result: '83.2%（95% CI 82.1%–84.2%）；证据可判定，性能低于 85% 门槛' })
  }

  if (stepId === 'draft-package') {
    await upsertEntry('EvidencePackage', 'EP-CASE01-M13-V0.4', 'M-13 高威胁任务效能正式证据包 · V0.4', packageDraftData())
    await patchEntry('DigitalTestCase', 'CASE-01', (d) => ({ ...d, status: '证据包编制中', evidencePackages: Array.from(new Set([...(d.evidencePackages ?? []), 'EP-CASE01-M13-V0.4'])) }))
    await stepLog({ created: ['EP-CASE01-M13-V0.4'], result: '证据清单已编制，尚未冻结' })
  }

  if (stepId === 'freeze-package') {
    const frozen = await freezePackageV04()
    await patchEntry('DigitalTestCase', 'CASE-01', { status: '正式门控待执行' })
    await stepLog({ packageHash: frozen.packageHash, result: 'V0.4 Manifest 已冻结；后续 Ontology 更新不追溯改变历史包' })
  }

  if (stepId === 'strict-gate') {
    const result = await commitStrictGate()
    await patchEntry('DigitalTestCase', 'CASE-01', { status: '门控通过/待冻结结论', finalGateDecision: result.decision, finalGateRuleSet: 'GRS-CASE01-STRICT-V1' })
    await stepLog({ ruleSet: 'GRS-CASE01-STRICT-V1', decision: result.decision, score: result.score, hardFailures: result.hardFailures.length, result: '证据充分性门控通过；不等于性能达标' })
  }

  if (stepId === 'freeze-conclusion') {
    const humanReview = await assertExpertReviewReadyForFinalApproval()
    await patchEntry('DigitalTestCase', 'CASE-01', (d) => ({ ...d, status: '正式结论已冻结', decision: humanReview.finalFinding ?? 'DEMO/SYNTHETIC：专家合议已确认机器判读，并在冻结适用边界内形成正式性能结论。', nextActions: ['将 M-13 未达标结论转入整改/能力提升闭环', '保持 EP-CASE01-M13-V0.4、模型认可记录、自动判读与专家合议记录不可变归档', '整改后如再次评价，创建新的 Case/证据包/合议版本，不覆盖本次历史'], finalEvidencePackage: 'EP-CASE01-M13-V0.4', finalGateRuleSet: 'GRS-CASE01-STRICT-V1', finalGateDecision: '通过', performanceDecision: humanReview.finalPerformanceDecision ?? '未达到要求', finalHumanAdjudicationRef: humanReview.code, finalHumanAdjudicationHash: humanReview.humanReviewHash, expertReviewDisposition: humanReview.panelDisposition, conclusionScope: humanReview.scope, conclusionFrozenAt: new Date().toISOString(), prototypeDataNotice: '本 Case 的补证数值、自动判读与专家合议均为 DEMO/SYNTHETIC，仅用于演示数字化试验鉴定闭环。' }))
    await stepLog({ finalEvidencePackage: 'EP-CASE01-M13-V0.4', gateDecision: '通过', performanceDecision: humanReview.finalPerformanceDecision ?? '未达到要求', humanFinalAdjudicationRef: humanReview.code, humanReviewHash: humanReview.humanReviewHash, panelDisposition: humanReview.panelDisposition, result: '专家合议、人类最终判定、正式批准与适用边界已冻结' })
  }

  if (!executionLog) throw new Error('状态迁移动作未生成 Action Log')
  const executionSignature = await recordStepExecutionSignature(stepId, actorId, {
    caseId: 'CASE-01', stepId, actionLogId: executionLog.id, performedBy: executionLog.performedBy,
    createdAt: executionLog.createdAt.toISOString(), parameters: JSON.parse(executionLog.parametersJson || '{}'),
  })
  await attachReadinessExecutionSignature(stepId, executionSignature)
  await finalizeRunControlSession(stepId, executionSignature)
  await finalizeRunDataQuality(stepId, executionSignature)
  await finalizeAutomatedAdjudication(stepId, executionSignature)
  return getCase01StateMachine(actorId)
}
