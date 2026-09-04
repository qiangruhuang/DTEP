import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { CASE01_STEPS } from '@/lib/case01-state-machine'
import { getStepPolicy, listCase01GovernanceRecords } from '@/lib/case01-governance'
import { evaluateEvidencePackage, type OntologyEntry } from '@/lib/evidence-gate-service'

export type ProvenanceNode = {
  id: string
  kind: 'decision' | 'human-review' | 'expert-opinion' | 'gate' | 'rules' | 'package' | 'run' | 'adjudication' | 'observation' | 'model' | 'dataset' | 'scenario' | 'measure'
  label: string
  subtitle: string
  status?: string
  module: string
  details: Record<string, unknown>
  stepRefs?: string[]
}

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

async function objectType(apiName: string) {
  return db.objectType.findUnique({ where: { apiName } })
}

async function entry(apiName: string, pk: string): Promise<OntologyEntry | null> {
  const t = await objectType(apiName)
  if (!t) return null
  const row = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!row) return null
  return { pk: row.pk, title: row.title, data: JSON.parse(row.dataJson || '{}') }
}

async function entries(apiName: string): Promise<OntologyEntry[]> {
  const t = await objectType(apiName)
  if (!t) return []
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
  return rows.map((row) => ({ pk: row.pk, title: row.title, data: JSON.parse(row.dataJson || '{}') }))
}

function arr(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : [] }

function snapshotEntry(snapshot: any): OntologyEntry | null {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.pk) return null
  return { pk: String(snapshot.pk), title: String(snapshot.title ?? snapshot.pk), data: snapshot.data && typeof snapshot.data === 'object' ? snapshot.data : {} }
}

function node(kind: ProvenanceNode['kind'], item: OntologyEntry, module: string, status?: string, subtitle?: string, stepRefs?: string[]): ProvenanceNode {
  return { id: item.pk, kind, label: item.title, subtitle: subtitle ?? item.pk, status, module, details: { pk: item.pk, ...item.data }, stepRefs }
}

const runStep: Record<string, string[]> = {
  'RUN-LIVE-002-02': ['live-retest'],
  'RUN-LVC-004-FRM-01': ['lvc-anchor'],
  'RUN-DOT-S-02': ['digital-5000'],
}
const modelStep: Record<string, string[]> = { 'MD-02': ['vva-accredit'], 'MD-07': ['vva-accredit'], 'MD-08': ['vva-accredit'] }


export async function getDecisionProvenance() {
  const testCase = await entry('DigitalTestCase', 'CASE-01')
  if (!testCase) throw new Error('CASE-01 不存在')

  const packages = (await entries('EvidencePackage')).filter((x) => x.data.caseId === 'CASE-01')
  const activePackageId = String(testCase.data.finalEvidencePackage ?? (packages.some((x) => x.pk === 'EP-CASE01-M13-V0.4') ? 'EP-CASE01-M13-V0.4' : 'EP-CASE01-M13-V0.3'))
  const evidencePackage = packages.find((x) => x.pk === activePackageId) ?? packages.find((x) => x.pk === 'EP-CASE01-M13-V0.3') ?? packages[0]
  if (!evidencePackage) throw new Error('CASE-01 没有 Evidence Package')

  const ruleSetId = String(testCase.data.finalGateRuleSet ?? evidencePackage.data.ruleSetRef ?? testCase.data.gateRuleSet ?? 'GRS-CASE01-STRICT-V1')
  const currentRuleSet = await entry('EvidenceGateRuleSet', ruleSetId)
  if (!currentRuleSet) throw new Error(`${ruleSetId} 不存在`)

  const frozen = String(evidencePackage.data.status ?? '').startsWith('已冻结') && evidencePackage.data.manifest && typeof evidencePackage.data.manifest === 'object'
  const manifest = frozen ? evidencePackage.data.manifest as Record<string, any> : null
  const frozenRuleSet = frozen ? snapshotEntry(manifest?.ruleSetSnapshot) : null
  const ruleSet = frozenRuleSet ?? currentRuleSet
  const sourceMode = frozen ? 'frozen-manifest' : 'live-draft'

  const allRuns = await entries('TestRun')
  const allModels = await entries('ModelAsset')
  const allScenarios = await entries('TestScenario')
  const allMeasures = await entries('Measure')
  const reviewPanels = (await entries('ReviewPanelSession')).filter((x) => x.data.caseId === 'CASE-01')
  const expertOpinions = (await entries('ExpertOpinion')).filter((x) => x.data.caseId === 'CASE-01')
  const finalHumanDecisions = (await entries('FinalAdjudicationDecision')).filter((x) => x.data.caseId === 'CASE-01')

  const runRefs = arr(manifest?.runRefs ?? evidencePackage.data.runRefs)
  const modelRefs = arr(manifest?.modelRefs ?? evidencePackage.data.modelRefs)
  const scenarioRefs = arr(manifest?.scenarioRefs ?? evidencePackage.data.scenarioRefs)
  const measureRefs = arr(manifest?.measureRefs ?? evidencePackage.data.measureRefs)
  const datasetRefs = arr(manifest?.datasetRefs ?? evidencePackage.data.datasetRefs)

  const runs: OntologyEntry[] = frozen && Array.isArray(manifest?.runSnapshots)
    ? manifest!.runSnapshots.map(snapshotEntry).filter(Boolean) as OntologyEntry[]
    : runRefs.map((id) => allRuns.find((x) => x.pk === id)).filter(Boolean) as OntologyEntry[]
  const models: OntologyEntry[] = frozen && Array.isArray(manifest?.modelSnapshots)
    ? manifest!.modelSnapshots.map(snapshotEntry).filter(Boolean) as OntologyEntry[]
    : modelRefs.map((id) => allModels.find((x) => x.pk === id)).filter(Boolean) as OntologyEntry[]
  const scenarios: OntologyEntry[] = frozen && Array.isArray(manifest?.scenarioSnapshots)
    ? manifest!.scenarioSnapshots.map(snapshotEntry).filter(Boolean) as OntologyEntry[]
    : scenarioRefs.map((id) => allScenarios.find((x) => x.pk === id)).filter(Boolean) as OntologyEntry[]
  const measures: OntologyEntry[] = frozen && Array.isArray(manifest?.measureSnapshots)
    ? manifest!.measureSnapshots.map(snapshotEntry).filter(Boolean) as OntologyEntry[]
    : measureRefs.map((id) => allMeasures.find((x) => x.pk === id)).filter(Boolean) as OntologyEntry[]

  const datasetRows = frozen && Array.isArray(manifest?.datasetSnapshots)
    ? manifest!.datasetSnapshots
    : (await db.testDataset.findMany({ where: { path: { in: datasetRefs } } })).map((d) => ({ path: d.path, name: d.name, qualityScore: d.qualityScore, domain: d.domain, origin: d.origin, status: d.status, rowCount: d.rowCount, sizeMb: d.sizeMb }))
  const datasets = datasetRows.map((d: any) => ({ path: String(d.path), name: String(d.name ?? d.path), qualityScore: Number(d.qualityScore ?? 0), domain: d.domain, origin: d.origin, status: d.status, rowCount: d.rowCount, sizeMb: d.sizeMb }))

  const recomputedEvaluation = evaluateEvidencePackage({ evidencePackage, ruleSet, runs, models, measures, datasets })
  const evaluation = frozen && evidencePackage.data.lastGateEvaluation && typeof evidencePackage.data.lastGateEvaluation === 'object'
    ? evidencePackage.data.lastGateEvaluation
    : recomputedEvaluation
  const governance = await listCase01GovernanceRecords()
  const actionType = await db.actionType.findFirst({ where: { apiName: 'case01StateTransition' } })
  const rawLogs = actionType ? await db.actionLog.findMany({ where: { actionTypeId: actionType.id, objectPk: 'CASE-01' }, orderBy: { createdAt: 'asc' } }) : []
  const logs = rawLogs.map((log) => ({ id: log.id, status: log.status, performedBy: log.performedBy, createdAt: log.createdAt.toISOString(), parameters: JSON.parse(log.parametersJson || '{}') }))

  const approvalsByStep = new Map(governance.approvals.map((x: any) => [String(x.stepId), x]))
  const signaturesByStep = new Map<string, any[]>()
  for (const sig of governance.signatures as any[]) {
    const key = String(sig.stepId)
    const list = signaturesByStep.get(key) ?? []
    list.push(sig)
    signaturesByStep.set(key, list)
  }
  const logsByStep = new Map<string, any[]>()
  for (const log of logs) {
    const key = String(log.parameters.step ?? '')
    const list = logsByStep.get(key) ?? []
    list.push(log)
    logsByStep.set(key, list)
  }

  const businessChain = CASE01_STEPS.map((step, index) => {
    const signatures = signaturesByStep.get(step.id) ?? []
    const executionSignature = signatures.find((x) => x.phase === 'execution' && x.integrityValid)
    const approval = approvalsByStep.get(step.id) ?? null
    const stepLogs = logsByStep.get(step.id) ?? []
    const policy = getStepPolicy(step.id)
    return {
      index,
      id: step.id,
      label: step.label,
      output: step.output,
      completed: Boolean(executionSignature),
      policy,
      approval,
      signatures,
      actionLogs: stepLogs,
    }
  })

  const signatureValid = governance.signatures.filter((x: any) => x.integrityValid).length
  const packageHashExpected = frozen && manifest ? sha256(manifest) : null
  const packageHashValid = Boolean(packageHashExpected && packageHashExpected === evidencePackage.data.packageHash)
  const finalFrozen = testCase.data.status === '正式结论已冻结'
  const m13 = measures.find((x) => x.pk === 'M-13') ?? allMeasures.find((x) => x.pk === 'M-13')

  const decisionNode: ProvenanceNode = {
    id: 'DECISION-CASE01',
    kind: 'decision',
    label: finalFrozen ? `正式性能结论：${testCase.data.performanceDecision ?? '—'}` : `当前决策状态：${evaluation.decision}`,
    subtitle: finalFrozen ? 'CASE-01 正式鉴定结论' : 'CASE-01 当前证据门控判断',
    status: finalFrozen ? '已冻结' : testCase.data.status,
    module: 'digitalCase',
    stepRefs: finalFrozen ? ['freeze-conclusion'] : [],
    details: {
      caseId: 'CASE-01', caseStatus: testCase.data.status, conclusion: testCase.data.decision,
      gateDecision: finalFrozen ? testCase.data.finalGateDecision : evaluation.decision,
      performanceDecision: finalFrozen ? testCase.data.performanceDecision : '尚未正式冻结',
      measure: m13?.data ?? null, conclusionFrozenAt: testCase.data.conclusionFrozenAt ?? null,
      evidencePackage: evidencePackage.pk, gateRuleSet: ruleSet.pk, sourceMode,
      humanFinalAdjudicationRef: testCase.data.finalHumanAdjudicationRef ?? null, humanFinalAdjudicationHash: testCase.data.finalHumanAdjudicationHash ?? null, expertReviewDisposition: testCase.data.expertReviewDisposition ?? null, conclusionScope: testCase.data.conclusionScope ?? null,
    },
  }

  const gateNode: ProvenanceNode = {
    id: `GATE-${evidencePackage.pk}`,
    kind: 'gate', label: `${evaluation.assessmentMode} · ${evaluation.decision}`,
    subtitle: `${evaluation.score}% · 硬阻塞 ${evaluation.hardFailures.length} · 软缺口 ${evaluation.softFailures.length}`,
    status: evaluation.decision, module: 'evidenceGate', stepRefs: ['strict-gate'],
    details: { ...evaluation, hardFailures: evaluation.hardFailures.map((x) => ({ label: x.label, note: x.note })), softFailures: evaluation.softFailures.map((x) => ({ label: x.label, note: x.note })) },
  }
  const ruleNode = node('rules', ruleSet, 'evidenceGate', String(ruleSet.data.status), `${ruleSet.pk} · v${ruleSet.data.version}`, ['strict-gate'])
  const packageNode = node('package', evidencePackage, 'evidenceGate', String(evidencePackage.data.status), `${evidencePackage.pk} · ${sourceMode === 'frozen-manifest' ? '冻结快照' : '草稿当前态'}`, evidencePackage.pk === 'EP-CASE01-M13-V0.4' ? ['draft-package', 'freeze-package'] : [])

  const adjudicationNodes: ProvenanceNode[] = runs.flatMap((run) => {
    const stepRefs = runStep[run.pk] ?? []
    const decision = run.data.runAdjudicationDecisionSnapshot as Record<string, any> | undefined
    const results = Array.isArray(run.data.runMeasureResultSnapshots) ? run.data.runMeasureResultSnapshots as Array<Record<string, any>> : []
    const observations = Array.isArray(run.data.measureObservationSnapshots) ? run.data.measureObservationSnapshots as Array<Record<string, any>> : []
    const nodes: ProvenanceNode[] = []
    if (decision?.code) {
      nodes.push({
        id: String(decision.code), kind: 'adjudication', label: `自动判读：${decision.decision ?? '—'}`,
        subtitle: `${run.pk} · ${run.data.adjudicationRuleSetRef ?? '规则未绑定'}`, status: String(decision.decision ?? ''),
        module: 'workshop', stepRefs, details: { runRef: run.pk, ruleSetRef: run.data.adjudicationRuleSetRef ?? null, ruleSetHash: run.data.adjudicationRuleSetHash ?? null, reconstructionRef: run.data.eventReconstructionRef ?? null, reconstructionHash: run.data.eventReconstructionHash ?? null, dataQualityAssessmentRef: run.data.dataQualityAssessmentRef ?? null, automatedAdjudicationHash: run.data.automatedAdjudicationHash ?? null, automatedAdjudicationFinalHash: run.data.automatedAdjudicationFinalHash ?? null, ...decision },
      })
    }
    for (const result of results) {
      nodes.push({
        id: String(result.code ?? `${run.pk}-${result.measureRef ?? 'MEASURE'}`), kind: 'observation',
        label: `${result.measureRef ?? 'Measure'} = ${result.value ?? '—'}${result.unit ?? ''}`,
        subtitle: `${run.pk} · ${result.performanceDecision ?? '—'} · 规则 ${result.ruleRef ?? result.adjudicationRuleRef ?? '—'}`,
        status: String(result.performanceDecision ?? ''), module: 'contour', stepRefs,
        details: { runRef: run.pk, ...result, sourceObservation: observations.find((x) => String(x.code ?? x.pk ?? '') === String(result.measureObservationRef ?? result.observationRef ?? '')) ?? null },
      })
    }
    return nodes
  })

  const humanReviewNodes: ProvenanceNode[] = [
    ...finalHumanDecisions.map((x) => node('human-review', x, 'digitalCase', String(x.data.panelDisposition ?? ''), `${x.pk} · ${x.data.finalPerformanceDecision ?? '—'}`, ['freeze-conclusion'])),
    ...reviewPanels.map((x) => node('human-review', x, 'digitalCase', String(x.data.status ?? ''), `${x.pk} · quorum ${x.data.quorumRequired ?? '—'}`, ['freeze-conclusion'])),
    ...expertOpinions.map((x) => node('expert-opinion', x, 'digitalCase', String(x.data.disposition ?? ''), `${x.data.reviewerName ?? x.pk} · ${x.data.challengeType ?? 'NONE'}`, ['freeze-conclusion'])),
  ]

  const evidenceColumns = [
    { id: 'decision', title: '鉴定决策', nodes: [decisionNode] },
    { id: 'human-review', title: '专家合议与终审', nodes: humanReviewNodes },
    { id: 'gate', title: '门控与规则', nodes: [gateNode, ruleNode] },
    { id: 'package', title: '证据包', nodes: [packageNode] },
    { id: 'runs', title: '执行实例', nodes: runs.map((x) => node('run', x, 'workshop', String(x.data.status), `${x.pk} · ${x.data.executionMode ?? 'Run'} · ${x.data.replications ?? 1} 次`, runStep[x.pk] ?? [])) },
    { id: 'adjudication', title: 'Event → Measure 判读', nodes: adjudicationNodes },
    { id: 'sources', title: '证据源', nodes: [
      ...models.map((x) => node('model', x, 'vva', String(x.data.accreditation ?? x.data.vvaStatus ?? ''), `${x.pk} · ${x.data.version ?? ''}`, modelStep[x.pk] ?? [])),
      ...scenarios.map((x) => node('scenario', x, 'scenarioWorkspace', String(x.data.status ?? ''), `${x.pk} · Threat ${x.data.threatLevel ?? '—'} · EW ${x.data.ewIntensity ?? '—'}%`, x.pk === 'SC-COA-01' ? ['vva-accredit'] : [])),
      ...measures.map((x) => node('measure', x, 'contour', String(x.data.status ?? ''), `${x.pk} · ${x.data.measured ?? '—'}${x.data.unit ?? ''} / 门槛 ${x.data.threshold ?? '—'}${x.data.unit ?? ''}`, x.pk === 'M-13' ? ['digital-5000', 'strict-gate', 'freeze-conclusion'] : [])),
      ...datasets.map((d) => {
        const producingSteps = runs.flatMap((r) => arr(r.data.outputDatasetRefs).includes(d.path) ? (runStep[r.pk] ?? []) : [])
        return { id: d.path, kind: 'dataset' as const, label: d.name, subtitle: `${d.path} · Q${d.qualityScore}`, status: d.status, module: 'datasets', details: d, stepRefs: Array.from(new Set(producingSteps)) }
      }),
    ] },
  ]

  return {
    caseId: 'CASE-01', sourceMode, finalFrozen,
    decision: decisionNode,
    activePackageId: evidencePackage.pk,
    ruleSetId: ruleSet.pk,
    evaluation,
    evidenceColumns,
    businessChain,
    approvals: governance.approvals,
    signatures: governance.signatures,
    logs,
    integrity: {
      packageFrozen: frozen,
      packageHash: evidencePackage.data.packageHash ?? null,
      packageHashExpected,
      packageHashValid,
      ruleSetPublishedHash: ruleSet.data.publishedHash ?? null,
      signaturesTotal: governance.signatures.length,
      signaturesValid: signatureValid,
      approvalsTotal: governance.approvals.length,
      completedSteps: businessChain.filter((x) => x.completed).length,
      totalSteps: businessChain.length,
    },
    notice: sourceMode === 'frozen-manifest'
      ? '当前审计视图使用 Evidence Package 冻结快照，后续 Ontology 更新不会追溯改变这条鉴定依据。'
      : '当前 Evidence Package 尚未冻结；审计视图显示的是当前草稿态引用，不能视为不可变历史证据。',
  }
}
