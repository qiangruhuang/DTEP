import { createHash } from 'crypto'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const list = (value: unknown) => Array.isArray(value) ? value : []

export function deriveRunAudit(data: Record<string, any>) {
  const blockers: string[] = []
  if (!String(data.configurationBaseline ?? '').trim() || String(data.configurationBaseline).includes('PENDING')) blockers.push('配置基线尚未正式锁定')
  if (!String(data.scenarioId ?? '').trim()) blockers.push('缺少场景引用')
  if (!list(data.resourceSnapshot).length || list(data.resourceSnapshot).some((x) => String(x).includes('pending'))) blockers.push('资源快照未完整冻结')
  if (!list(data.modelSnapshot).length || list(data.modelSnapshot).some((x) => String(x).includes('pending'))) blockers.push('模型版本快照未完整冻结')
  if (!list(data.inputDatasetRefs).length && data.executionMode !== 'Live') blockers.push('数字/LVC Run 缺少输入数据快照')
  if (!Number(data.replications ?? 0) || Number(data.replications) < 1) blockers.push('重复次数无效')
  if (!String(data.randomSeedPolicy ?? '').trim() && data.executionMode !== 'Live') blockers.push('缺少随机种子策略')
  if (['Digital', 'LVC'].includes(String(data.executionMode)) && !list(data.modelDomainChecks).length) blockers.push('尚未记录模型-场景适用域检查')
  const provenanceRequired = ['Digital', 'LVC'].includes(String(data.executionMode)) && (String(data.formalEvidenceClass ?? '').includes('正式') || String(data.status ?? '') === '已完成')
  if (provenanceRequired && !String(data.testModelAssemblyRef ?? '').trim()) blockers.push('正式数字/LVC Run 未绑定 Test Model Assembly')
  if (provenanceRequired && !String(data.testModelAssemblyHash ?? '').trim()) blockers.push('缺少 Test Model Assembly 哈希')
  if (provenanceRequired && !String(data.prototypeBaselineRef ?? '').trim()) blockers.push('缺少数字样机3.0基地 ModelBaseline 来源')
  if (provenanceRequired && !String(data.prototypeBaselineHash ?? '').trim()) blockers.push('缺少数字样机3.0基地基线哈希')
  if (provenanceRequired && list(data.modelBindingSnapshots).length < list(data.modelSnapshot).length) blockers.push('模型装配绑定未覆盖全部 Run 模型')
  if (provenanceRequired && !list(data.artifactProvenanceRefs).length) blockers.push('缺少 ModelArtifact 来源快照')
  if (provenanceRequired && !list(data.interfaceContractRefs).length) blockers.push('缺少 FMI/SAL/IDL 接口契约来源')

  const environmentRequired = ['Live', 'LVC', 'Digital'].includes(String(data.executionMode)) && Boolean(String(data.testModelAssemblyRef ?? '').trim())
  if (environmentRequired && !String(data.testEnvironmentAssemblyRef ?? '').trim()) blockers.push('缺少 Test Environment Assembly')
  if (environmentRequired && !String(data.testEnvironmentAssemblyHash ?? '').trim()) blockers.push('缺少 Test Environment Assembly 哈希')
  if (environmentRequired && !data.environmentProfileSnapshot) blockers.push('缺少本次 Run 的环境执行 Profile 快照')
  if (environmentRequired && !list(data.environmentResourceSnapshots).length) blockers.push('缺少试验环境资源快照')
  if (environmentRequired && !data.timeServiceSnapshot) blockers.push('缺少时统/逻辑时间服务快照')
  if (environmentRequired && !(data.idlTopicSetSnapshot?.topics?.length)) blockers.push('缺少 IDL Topic Set 快照')
  if (environmentRequired && !data.logicalNetworkSnapshot) blockers.push('缺少逻辑网络拓扑快照')
  if (environmentRequired && !data.securityBoundarySnapshot) blockers.push('缺少试验环境安全边界快照')
  if (environmentRequired && String(data.executionMode) === 'LVC' && !String(data.lvcFederationConfigRef ?? '').trim()) blockers.push('正式 LVC Run 缺少 LVC Federation Configuration')
  if (environmentRequired && String(data.executionMode) === 'LVC' && !String(data.lvcFederationConfigHash ?? '').trim()) blockers.push('正式 LVC Run 缺少 Federation 配置哈希')
  if (environmentRequired && String(data.executionMode) === 'LVC' && list(data.federationGatewayRefs).length < 2) blockers.push('LVC Federation 网关快照不完整')
  if (environmentRequired && !String(data.environmentProvenanceHash ?? '').trim()) blockers.push('缺少环境来源 Provenance Hash')

  const readinessRequired = ['v2.0d', 'v2.0e'].includes(String(data.readinessGovernanceVersion ?? ''))
  if (readinessRequired && !list(data.readinessReviewRefs).length) blockers.push('缺少 Test Readiness Review 引用')
  if (readinessRequired && !String(data.readinessReviewHash ?? '').trim()) blockers.push('缺少 Readiness Review 冻结哈希')
  if (readinessRequired && !data.testReadinessReviewSnapshot) blockers.push('缺少 Test Readiness Review 快照')
  if (readinessRequired && String(data.executionMode) === 'LVC' && !data.federationReadinessReviewSnapshot) blockers.push('正式 LVC Run 缺少 Federation Readiness Review 快照')
  if (readinessRequired && !data.readinessApprovalSnapshot) blockers.push('缺少 Readiness 审批/申请签署快照')
  if (readinessRequired && !data.readinessExecutionSignatureSnapshot) blockers.push('缺少 Run 执行签署快照')
  if (readinessRequired && !String(data.readinessGovernanceHash ?? '').trim()) blockers.push('缺少 Readiness 治理哈希')

  const runControlRequired = String(data.runControlVersion ?? '') === 'v2.0e'
  if (runControlRequired && !String(data.runControlSessionRef ?? '').trim()) blockers.push('缺少 Run Control Session 引用')
  if (runControlRequired && !data.runControlSessionSnapshot) blockers.push('缺少 Run Control Session 冻结快照')
  if (runControlRequired && !list(data.runHealthSnapshots).length) blockers.push('缺少运行健康快照')
  if (runControlRequired && !list(data.runControlActions).length) blockers.push('缺少 Pause/Resume/监控等运行控制动作历史')
  if (runControlRequired && !String(data.runControlHash ?? '').trim()) blockers.push('缺少 Run Control Provenance Hash')
  if (runControlRequired && !String(data.runControlFinalHash ?? '').trim()) blockers.push('缺少完成后的 Run Control Final Hash')
  if (runControlRequired && String(data.executionMode) === 'LVC' && !list(data.runHealthSnapshots).some((x: any) => x.timeSync?.status === 'OUT_OF_TOLERANCE')) blockers.push('LVC演示缺少运行中时统异常监控记录')
  if (runControlRequired && list(data.runHealthSnapshots).some((x: any) => x.severity === 'RED') && !list(data.runControlActions).some((x: any) => ['AUTO_PAUSE', 'PAUSE'].includes(String(x.action)))) blockers.push('存在RED健康快照但没有对应Pause控制动作')

  const dataQualityRequired = String(data.runDataQualityVersion ?? '') === 'v2.0f'
  if (dataQualityRequired && !String(data.eventReconstructionRef ?? '').trim()) blockers.push('缺少 Time-Aligned Event Reconstruction 引用')
  if (dataQualityRequired && !data.eventReconstructionSnapshot) blockers.push('缺少冻结的事件重建快照')
  if (dataQualityRequired && !String(data.eventReconstructionHash ?? '').trim()) blockers.push('缺少事件重建哈希')
  if (dataQualityRequired && !String(data.dataQualityAssessmentRef ?? '').trim()) blockers.push('缺少 Run Data Quality Assessment 引用')
  if (dataQualityRequired && !data.dataQualityAssessmentSnapshot) blockers.push('缺少冻结的数据质量评估快照')
  if (dataQualityRequired && String(data.dataQualityAssessmentSnapshot?.decision ?? '') !== 'READY_FOR_EVIDENCE') blockers.push('Run Data Quality 未达到 READY_FOR_EVIDENCE')
  if (dataQualityRequired && !String(data.runDataQualityHash ?? '').trim()) blockers.push('缺少 Run Data Quality Provenance Hash')
  if (dataQualityRequired && !String(data.runDataQualityFinalHash ?? '').trim()) blockers.push('缺少最终 Run Data Quality Hash')
  if (dataQualityRequired && String(data.executionMode) === 'LVC' && Number(data.eventReconstructionSnapshot?.canonicalEventStats?.maxClockResidualMs ?? 999) > Number(data.eventReconstructionSnapshot?.correctionModel?.toleranceMs ?? data.runControlSessionSnapshot?.controlPolicy?.timeSync?.pauseMs ?? 10)) blockers.push('LVC事件重建残余时差仍超过运行时统容差')
  if (dataQualityRequired && Array.isArray(data.dataQualityAssessmentSnapshot?.hardFailures) && data.dataQualityAssessmentSnapshot.hardFailures.length) blockers.push('冻结数据质量评估仍存在硬阻塞')

  const adjudicationRequired = String(data.automatedAdjudicationVersion ?? '') === 'v2.0g'
  if (adjudicationRequired && !String(data.adjudicationRuleSetRef ?? '').trim()) blockers.push('缺少 Event-to-Measure 判读规则集引用')
  if (adjudicationRequired && !String(data.adjudicationRuleSetHash ?? '').trim()) blockers.push('缺少冻结的自动判读规则集哈希')
  if (adjudicationRequired && !String(data.runAdjudicationDecisionRef ?? '').trim()) blockers.push('缺少 Run Automated Adjudication 决定引用')
  if (adjudicationRequired && String(data.runAdjudicationDecisionSnapshot?.decision ?? '') !== 'READY_FOR_RUN_SIGNOFF') blockers.push('Event-to-Measure 自动判读未达到 READY_FOR_RUN_SIGNOFF')
  if (adjudicationRequired && !list(data.runMeasureResultSnapshots).length) blockers.push('缺少 Run Measure Result 冻结快照')
  if (adjudicationRequired && list(data.runMeasureResultSnapshots).some((x: any) => x.adjudicationCompleteness !== 'COMPLETE')) blockers.push('存在未完成的指标判读结果')
  if (adjudicationRequired && !String(data.automatedAdjudicationHash ?? '').trim()) blockers.push('缺少 Event-to-Measure Provenance Hash')
  if (adjudicationRequired && !String(data.automatedAdjudicationFinalHash ?? '').trim()) blockers.push('缺少最终 Automated Adjudication Hash')

  const manifest = {
    eventId: data.eventId ?? null,
    scenarioId: data.scenarioId ?? null,
    executionMode: data.executionMode ?? null,
    configurationBaseline: data.configurationBaseline ?? null,
    replications: data.replications ?? null,
    randomSeedPolicy: data.randomSeedPolicy ?? null,
    resourceSnapshot: list(data.resourceSnapshot),
    modelSnapshot: list(data.modelSnapshot),
    inputDatasetRefs: list(data.inputDatasetRefs),
    testModelAssemblyRef: data.testModelAssemblyRef ?? null,
    testModelAssemblyHash: data.testModelAssemblyHash ?? null,
    prototypeBaselineRef: data.prototypeBaselineRef ?? null,
    prototypeBaselineHash: data.prototypeBaselineHash ?? null,
    artifactProvenanceRefs: list(data.artifactProvenanceRefs),
    interfaceContractRefs: list(data.interfaceContractRefs),
    modelBindingSnapshots: list(data.modelBindingSnapshots),
    testEnvironmentAssemblyRef: data.testEnvironmentAssemblyRef ?? null,
    testEnvironmentAssemblyHash: data.testEnvironmentAssemblyHash ?? null,
    lvcFederationConfigRef: data.lvcFederationConfigRef ?? null,
    lvcFederationConfigHash: data.lvcFederationConfigHash ?? null,
    environmentProfileSnapshot: data.environmentProfileSnapshot ?? null,
    environmentResourceSnapshots: list(data.environmentResourceSnapshots),
    federationGatewayRefs: list(data.federationGatewayRefs),
    idlTopicSetSnapshot: data.idlTopicSetSnapshot ?? null,
    timeServiceSnapshot: data.timeServiceSnapshot ?? null,
    logicalNetworkSnapshot: data.logicalNetworkSnapshot ?? null,
    securityBoundarySnapshot: data.securityBoundarySnapshot ?? null,
    environmentProvenanceHash: data.environmentProvenanceHash ?? null,
    readinessReviewRefs: list(data.readinessReviewRefs),
    readinessReviewHash: data.readinessReviewHash ?? null,
    testReadinessReviewSnapshot: data.testReadinessReviewSnapshot ?? null,
    federationReadinessReviewSnapshot: data.federationReadinessReviewSnapshot ?? null,
    readinessApprovalSnapshot: data.readinessApprovalSnapshot ?? null,
    readinessExecutionSignatureSnapshot: data.readinessExecutionSignatureSnapshot ?? null,
    readinessGovernanceHash: data.readinessGovernanceHash ?? null,
    runControlVersion: data.runControlVersion ?? null,
    runControlSessionRef: data.runControlSessionRef ?? null,
    runControlSessionSnapshot: data.runControlSessionSnapshot ?? null,
    runHealthSnapshotRefs: list(data.runHealthSnapshotRefs),
    runHealthSnapshots: list(data.runHealthSnapshots),
    runControlActionRefs: list(data.runControlActionRefs),
    runControlActions: list(data.runControlActions),
    runControlHash: data.runControlHash ?? null,
    runControlFinalHash: data.runControlFinalHash ?? null,
    runDataQualityVersion: data.runDataQualityVersion ?? null,
    eventReconstructionRef: data.eventReconstructionRef ?? null,
    eventReconstructionSnapshot: data.eventReconstructionSnapshot ?? null,
    eventReconstructionHash: data.eventReconstructionHash ?? null,
    dataQualityAssessmentRef: data.dataQualityAssessmentRef ?? null,
    dataQualityAssessmentSnapshot: data.dataQualityAssessmentSnapshot ?? null,
    dataQualityAssessmentHash: data.dataQualityAssessmentHash ?? null,
    dataQualityActionRefs: list(data.dataQualityActionRefs),
    dataQualityActions: list(data.dataQualityActions),
    runDataQualityHash: data.runDataQualityHash ?? null,
    runDataQualityFinalHash: data.runDataQualityFinalHash ?? null,
    automatedAdjudicationVersion: data.automatedAdjudicationVersion ?? null,
    adjudicationRuleSetRef: data.adjudicationRuleSetRef ?? null,
    adjudicationRuleSetHash: data.adjudicationRuleSetHash ?? null,
    runAdjudicationDecisionRef: data.runAdjudicationDecisionRef ?? null,
    runAdjudicationDecisionSnapshot: data.runAdjudicationDecisionSnapshot ?? null,
    missionStepObservationRefs: list(data.missionStepObservationRefs),
    measureObservationRefs: list(data.measureObservationRefs),
    runMeasureResultRefs: list(data.runMeasureResultRefs),
    runMeasureResultSnapshots: list(data.runMeasureResultSnapshots),
    adjudicationActionRefs: list(data.adjudicationActionRefs),
    automatedAdjudicationHash: data.automatedAdjudicationHash ?? null,
    automatedAdjudicationFinalHash: data.automatedAdjudicationFinalHash ?? null,
  }
  return {
    configurationComplete: blockers.length === 0,
    blockers,
    configurationHash: `sha256:${createHash('sha256').update(stable(manifest)).digest('hex')}`,
    manifest,
  }
}
