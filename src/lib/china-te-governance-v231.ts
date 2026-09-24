import { db } from '@/lib/db'
import {
  CHINA_TE_LIFECYCLE,
  FIELDING_FINALIZATION_REVIEW_DECISIONS,
  FINALIZATION_SPECIAL_ASSESSMENTS,
  STATE_QUALIFICATION_DECISIONS,
  type GovernanceAction,
  type GovernanceCriterion,
  type GovernanceStatus,
} from '@/lib/china-te-governance'

type Node = {
  id: string
  type: string
  pk: string
  title: string
  data: Record<string, any>
}

type Edge = {
  id: string
  type: string
  sourceObjectId: string
  targetObjectId: string
  sourceRef: string
}

const STATUS_RANK: Record<GovernanceStatus, number> = {
  ready: 1,
  partial: 0.5,
  blocked: 0,
  missing: 0,
}

const GRAPH_LINKS = [
  'caseUsesMissionThread',
  'caseUsesScenario',
  'caseUsesEvent',
  'caseAssessesMeasure',
  'caseUsesModel',
  'caseControlledByGate',
  'caseHasRun',
  'caseHasEvidencePackage',
  'threadUsesEvent',
  'threadUsesScenario',
  'assesses',
  'foundDeficiency',
  'supportsReport',
  'usesModel',
  'measureGate',
  'eventHasRun',
  'scenarioUsesModel',
  'scenarioUsesAssembly',
  'runUsesScenario',
  'runUsesModel',
  'runUsesAssembly',
  'runUsesPrototypeBaseline',
  'packageContainsRun',
  'packageControlledByRuleSet',
  'packageSupportsGate',
  'baselineInstantiatesAssembly',
  'assemblyUsesModel',
  'assemblyUsesContract',
  'modelAssemblyFeedsEnvironment',
  'environmentUsesFederation',
  'federationUsesContract',
  'caseHasApprovalRecord',
] as const

const DIRECT_CASE_RELATIONS = new Set([
  'caseUsesMissionThread',
  'caseUsesScenario',
  'caseUsesEvent',
  'caseAssessesMeasure',
  'caseUsesModel',
  'caseControlledByGate',
  'caseHasRun',
  'caseHasEvidencePackage',
  'caseHasApprovalRecord',
])

function parseData(value: string) {
  return JSON.parse(value || '{}') as Record<string, any>
}

function criterion(
  id: string,
  label: string,
  basis: string,
  status: GovernanceStatus,
  detail: string,
  evidence: string[] = [],
  blocking = status === 'blocked' || status === 'missing',
): GovernanceCriterion {
  return { id, label, basis, status, detail, evidence, blocking }
}

function summarize(criteria: GovernanceCriterion[]) {
  const weighted = criteria.reduce((sum, item) => sum + STATUS_RANK[item.status], 0)
  return {
    evidenceCoverage: Math.round((weighted / Math.max(criteria.length, 1)) * 100),
    ready: criteria.filter((item) => item.status === 'ready').length,
    partial: criteria.filter((item) => item.status === 'partial').length,
    blocked: criteria.filter((item) => item.status === 'blocked').length,
    missing: criteria.filter((item) => item.status === 'missing').length,
  }
}

function actionFromCriteria(
  apiName: string,
  label: string,
  stage: string,
  requiredAuthority: string,
  criteria: GovernanceCriterion[],
  extraBlockers: string[] = [],
): GovernanceAction {
  const blockers = [
    ...criteria.filter((item) => item.blocking).map((item) => `${item.id}：${item.detail}`),
    ...extraBlockers.filter(Boolean),
  ]
  return { apiName, label, stage, requiredAuthority, allowed: blockers.length === 0, blockers }
}

function statusIsQualified(value: unknown) {
  return ['达标', '通过', '满足要求', 'PASS'].includes(String(value ?? '').toUpperCase())
    || ['达标', '通过', '满足要求'].includes(String(value ?? ''))
}

function statusIsClosed(value: unknown) {
  const text = String(value ?? '')
  return ['已闭环', '已归零/复试通过', '已关闭', '关闭', 'closed'].some((x) => text.toLowerCase().includes(x.toLowerCase()))
}

function statusIsAccredited(value: unknown) {
  return ['已认可', '有条件认可'].includes(String(value ?? ''))
}

function isOperationalEvent(node: Node) {
  const text = `${node.data.phase ?? ''} ${node.data.type ?? ''}`
  return /(^|\s)(OT|DOT|LFT)(\s|$)|作战|LVC|OT&E|实弹/i.test(text)
}

function isPerformanceEvent(node: Node) {
  return !isOperationalEvent(node) && /DT|性能|研制|互操作/i.test(`${node.data.phase ?? ''} ${node.data.type ?? ''}`)
}

async function listCases() {
  const type = await db.objectType.findUnique({
    where: { apiName: 'DigitalTestCase' },
    select: { entries: { select: { pk: true, title: true, dataJson: true } } },
  })
  return (type?.entries ?? [])
    .map((entry) => ({ pk: entry.pk, title: entry.title, data: parseData(entry.dataJson) }))
    .sort((a, b) => a.pk.localeCompare(b.pk))
}

async function resolveCaseGraph(caseId: string) {
  const caseType = await db.objectType.findUnique({ where: { apiName: 'DigitalTestCase' } })
  if (!caseType) throw new Error('DigitalTestCase 本体不存在')
  const root = await db.objectEntry.findUnique({
    where: { objectTypeId_pk: { objectTypeId: caseType.id, pk: caseId } },
    include: { objectType: true },
  })
  if (!root) throw new Error(`DigitalTestCase/${caseId} 不存在`)

  const nodes = new Map<string, Node>([[
    root.id,
    { id: root.id, type: root.objectType.apiName, pk: root.pk, title: root.title, data: parseData(root.dataJson) },
  ]])
  const edges = new Map<string, Edge>()
  const visited = new Set<string>([root.id])
  let frontier = new Set<string>([root.id])

  for (let depth = 0; depth < 4 && frontier.size; depth += 1) {
    const ids = [...frontier]
    const rows = await db.linkEntry.findMany({
      where: {
        OR: [
          {
            sourceObjectId: { in: ids },
            linkType: { apiName: { in: [...GRAPH_LINKS] } },
          },
          {
            targetObjectId: { in: ids },
            linkType: { apiName: { in: ['baselineInstantiatesAssembly'] } },
          },
        ],
      },
      include: {
        linkType: true,
        sourceObject: { include: { objectType: true } },
        targetObject: { include: { objectType: true } },
      },
    })
    const next = new Set<string>()
    for (const row of rows) {
      edges.set(row.id, {
        id: row.id,
        type: row.linkType.apiName,
        sourceObjectId: row.sourceObjectId,
        targetObjectId: row.targetObjectId,
        sourceRef: row.sourceRef,
      })
      for (const entry of [row.sourceObject, row.targetObject]) {
        nodes.set(entry.id, {
          id: entry.id,
          type: entry.objectType.apiName,
          pk: entry.pk,
          title: entry.title,
          data: parseData(entry.dataJson),
        })
        if (!visited.has(entry.id)) {
          visited.add(entry.id)
          next.add(entry.id)
        }
      }
    }
    frontier = next
  }

  return {
    root: nodes.get(root.id)!,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  }
}

function byType(nodes: Node[], type: string) {
  return nodes.filter((node) => node.type === type)
}

export async function buildChinaTeGovernanceSnapshotV231(caseId = 'CASE-01') {
  const [graph, availableCases] = await Promise.all([resolveCaseGraph(caseId), listCases()])
  const { root, nodes, edges } = graph
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const directEdges = edges.filter((edge) => edge.sourceObjectId === root.id && DIRECT_CASE_RELATIONS.has(edge.type))
  const directTargets = directEdges.map((edge) => nodeById.get(edge.targetObjectId)).filter(Boolean) as Node[]

  const events = byType(nodes, 'TestEvent')
  const measures = byType(nodes, 'Measure')
  const models = byType(nodes, 'ModelAsset')
  const scenarios = byType(nodes, 'TestScenario')
  const gates = byType(nodes, 'EvidenceGate')
  const deficiencies = byType(nodes, 'Deficiency')
  const reports = byType(nodes, 'Report')
  const baselines = byType(nodes, 'ModelBaseline')
  const assemblies = byType(nodes, 'TestModelAssembly')
  const interfaces = byType(nodes, 'InterfaceContract')
  const runs = byType(nodes, 'TestRun')
  const packages = byType(nodes, 'EvidencePackage')
  const approvals = byType(nodes, 'ApprovalRecord')

  const outgoingTargets = (sourcePk: string, linkType: string) => {
    const source = nodes.find((node) => node.pk === sourcePk)
    if (!source) return [] as Node[]
    return edges
      .filter((edge) => edge.sourceObjectId === source.id && edge.type === linkType)
      .map((edge) => nodeById.get(edge.targetObjectId))
      .filter(Boolean) as Node[]
  }

  const performanceEvents = events.filter(isPerformanceEvent)
  const operationalEvents = events.filter(isOperationalEvent)
  const performanceMeasures = Array.from(new Map(
    performanceEvents.flatMap((event) => outgoingTargets(event.pk, 'assesses')).map((node) => [node.id, node]),
  ).values())
  const operationalMeasures = Array.from(new Map(
    operationalEvents.flatMap((event) => outgoingTargets(event.pk, 'assesses')).map((node) => [node.id, node]),
  ).values())
  const completedPerformance = performanceEvents.filter((event) => event.data.status === '已完成')
  const completedOperational = operationalEvents.filter((event) => event.data.status === '已完成')
  const openDeficiencies = deficiencies.filter((item) => !statusIsClosed(item.data.status))
  const accreditedModels = models.filter((item) => statusIsAccredited(item.data.accreditation))
  const formalCaseFrozen = root.data.status === '正式结论已冻结'
  const hasStateQualificationApproval = approvals.some((item) => {
    const stage = `${item.data.approvalType ?? ''} ${item.data.stage ?? ''} ${item.data.stepId ?? ''}`
    return /state.?qualification|状态鉴定/i.test(stage) && item.data.status === 'approved'
  })

  const stateQualificationCriteria: GovernanceCriterion[] = [
    criterion(
      'SQ-A',
      '性能鉴定试验考核完成、性能达到要求且性能底数清楚',
      'TE-BTBA-004 审查标准 a',
      completedPerformance.length > 0
        && performanceMeasures.length > 0
        && performanceMeasures.every((item) => statusIsQualified(item.data.status))
        ? 'partial' : 'blocked',
      completedPerformance.length > 0
        ? `关系图解析出 ${completedPerformance.length} 个已完成性能类事件和 ${performanceMeasures.length} 个关联指标；这些对象可作为输入，但仍不自动等同于正式性能底数报告。`
        : `${caseId} 的关系图尚未解析出已完成的性能类事件。`,
      [...completedPerformance, ...performanceMeasures].map((item) => item.pk),
    ),
    criterion(
      'SQ-B',
      '技术状态清楚，分系统/设备按层级完成相应鉴定',
      'TE-BTBA-004 审查标准 b / 分级管理',
      baselines.length > 0 ? 'partial' : 'missing',
      baselines.length > 0
        ? `关系图包含 ${baselines.length} 个 ModelBaseline，但试验执行基线不自动等同于状态鉴定批准技术状态。`
        : '当前 Case 关系图没有可追溯的模型/技术状态基线。',
      baselines.map((item) => item.pk),
    ),
    criterion(
      'SQ-C',
      '图样、软件与技术文件完整规范，可指导小批量试生产',
      'TE-BTBA-004 审查标准 c',
      reports.length > 0 ? 'partial' : 'missing',
      reports.length > 0
        ? `关系图包含 ${reports.length} 个 Report，可作为材料输入；仍缺鉴定定型文件清单、专用标识与完整性审查对象。`
        : '当前 Case 关系图没有正式报告对象。',
      reports.map((item) => item.pk),
    ),
    criterion('SQ-D', '配套考核完成，小批量试生产工艺和生产条件审查通过', 'TE-BTBA-004 审查标准 d', 'missing', '当前 Ontology 未建立小批量试生产工艺和生产条件审查对象。'),
    criterion('SQ-E', '配套质量可靠、供货稳定并满足自主可控要求', 'TE-BTBA-004 审查标准 e', 'missing', '当前 Case 关系图未提供供货稳定性、自主可控与国产化替代正式证据。'),
    criterion(
      'SQ-F',
      '性能试验反馈问题已解决或有明确措施计划',
      'TE-BTBA-004 审查标准 f',
      deficiencies.length === 0 ? 'partial' : openDeficiencies.length === 0 ? 'ready' : 'blocked',
      deficiencies.length === 0
        ? '关系图未发现本 Case 缺陷对象；这不能被解释为“零问题”，仍需正式问题清单或零问题声明。'
        : openDeficiencies.length === 0
          ? `关联的 ${deficiencies.length} 项缺陷均已闭环。`
          : `仍有 ${openDeficiencies.length} 项关联缺陷未闭环。`,
      deficiencies.map((item) => item.pk),
      openDeficiencies.length > 0,
    ),
    criterion('SQ-G', '承制资格及试验机构使用合规', 'TE-BTBA-004 审查标准 g / TE-BTAB-008', 'missing', '当前 Case 关系图未提供承制资格、承试单位资格及采购服务合规对象。'),
    criterion(
      'SQ-DM',
      '对装备数字化模型进行审验',
      'TE-BTBA-004 §4.1',
      models.length > 0 && accreditedModels.length === models.length ? 'partial' : 'blocked',
      models.length > 0 && accreditedModels.length === models.length
        ? '关联模型均具有当前原型中的 VV&A 认可状态，可作为正式数字化模型审验输入；VV&A 与正式审验结论仍是不同对象。'
        : `关联模型 ${models.length} 个，其中 ${accreditedModels.length} 个达到“已认可/有条件认可”状态；不足以支撑正式数字化模型审验。`,
      accreditedModels.map((item) => item.pk),
    ),
  ]

  const operationalTestCriteria: GovernanceCriterion[] = [
    criterion(
      'OT-PRE',
      '状态鉴定后进入作战试验，申请经试验鉴定管理机构组织审查',
      'TE-BTBA-005',
      hasStateQualificationApproval ? 'partial' : 'missing',
      hasStateQualificationApproval
        ? '关系图存在状态鉴定批准记录，可作为作战试验前置输入；仍需解析装备级别与审批权限。'
        : '当前 Case 关系图没有正式状态鉴定审批/批复对象。',
      approvals.map((item) => item.pk),
    ),
    criterion(
      'OT-PLAN',
      '作战试验大纲（含想定）由试验单位与试验部队联合编制并按程序审批',
      'TE-BTBA-005',
      scenarios.length > 0 ? 'partial' : 'missing',
      scenarios.length > 0
        ? `关系图包含 ${scenarios.length} 个 TestScenario；尚未把联合编制、审批、备案身份建成正式大纲对象。`
        : '当前 Case 关系图没有 TestScenario。',
      scenarios.map((item) => item.pk),
    ),
    criterion('OT-TROOP', '装备操作使用、想定设计与部队评价依托试验部队开展', 'TE-BTBA-005', 'missing', '当前 Ontology 尚未建立试验部队组织对象及其独立评价责任链。'),
    criterion(
      'OT-CONFIG',
      '作战试验样机技术状态与状态鉴定确定的技术状态一致',
      'TE-BTBA-001 技术状态管理',
      baselines.length > 0 && assemblies.length > 0 ? 'partial' : 'missing',
      baselines.length > 0 && assemblies.length > 0
        ? '关系图可追溯 ModelBaseline / TestModelAssembly，但尚无与状态鉴定批准技术状态的正式等同性/批准链。'
        : '当前 Case 关系图缺少可比对的 ModelBaseline / TestModelAssembly。',
      [...baselines, ...assemblies].map((item) => item.pk),
    ),
    criterion(
      'OT-EFF',
      '形成作战效能、作战适用性结论和效能底数',
      'TE-BTBA-005',
      completedOperational.length > 0
        && operationalMeasures.length > 0
        && operationalMeasures.every((item) => statusIsQualified(item.data.status))
        ? 'partial' : 'blocked',
      completedOperational.length > 0
        ? '已有关系驱动的作战类事件/指标输入，但仍缺正式作战试验报告、效能底数与试验部队独立评价对象链。'
        : '关系图尚未解析出已完成的作战试验事件，不能形成正式效能底数。',
      [...completedOperational, ...operationalMeasures].map((item) => item.pk),
    ),
  ]

  const finalizationCriteria: GovernanceCriterion[] = [
    criterion(
      'FF-A',
      '性能鉴定试验和作战试验考核完成，性能底数和效能底数清楚',
      'TE-BTBA-006 审查标准 a',
      formalCaseFrozen && operationalMeasures.length > 0 && operationalMeasures.every((item) => statusIsQualified(item.data.status)) ? 'partial' : 'blocked',
      formalCaseFrozen
        ? 'Case 已冻结数字化结论，但仍需正式性能底数/效能底数报告与作战试验身份链。'
        : 'Case 尚未形成正式冻结结论，列装定型前置条件不充分。',
      [root.pk, ...operationalMeasures.map((item) => item.pk)],
    ),
    criterion(
      'FF-B',
      '技术状态清楚并满足装备体制、技术体制和“三化”要求',
      'TE-BTBA-006 审查标准 b',
      baselines.length > 0 ? 'partial' : 'missing',
      baselines.length > 0 ? '已有关系驱动的基线输入，但尚未形成列装定型批准技术状态与“三化”符合性对象。' : '缺少受控技术状态基线。',
      baselines.map((item) => item.pk),
    ),
    criterion(
      'FF-C',
      '技术文件可指导批量生产验收，随装资料和作战运用参考可支撑部队运用',
      'TE-BTBA-006 审查标准 c',
      reports.length > 0 ? 'partial' : 'missing',
      reports.length > 0 ? '现有 Report 仅作为材料线索；尚未形成列装定型专用文件/随装资料适用性链。' : '当前 Case 关系图没有可用 Report。',
      reports.map((item) => item.pk),
    ),
    criterion('FF-D', '配套考核完成，批量生产（或稳定生产）工艺和生产条件审查通过', 'TE-BTBA-006 审查标准 d', 'missing', '当前 Ontology 未建立批量生产工艺和生产条件审查对象。'),
    criterion('FF-E', '质量稳定、供货可靠、自主可控', 'TE-BTBA-006 审查标准 e', 'missing', '当前 Case 关系图未形成质量稳定性、供应链和自主可控证据图。'),
    criterion(
      'FF-F',
      '状态鉴定遗留问题、作战试验问题及试生产问题已解决或有明确结论',
      'TE-BTBA-006 审查标准 f',
      deficiencies.length === 0 ? 'partial' : openDeficiencies.length === 0 ? 'ready' : 'blocked',
      deficiencies.length === 0
        ? '关系图未发现问题对象；仍需正式问题清单/零问题声明。'
        : openDeficiencies.length === 0 ? '当前 Case 的关联缺陷均已闭环。' : `仍有 ${openDeficiencies.length} 项关联缺陷未闭环。`,
      deficiencies.map((item) => item.pk),
      openDeficiencies.length > 0,
    ),
    criterion('FF-G', '承制资格具备且质量管理体系运行有效', 'TE-BTBA-006 审查标准 g', 'missing', '当前 Case 关系图未建模承制资格和质量管理体系有效性证据。'),
  ]

  const specialAssessments = FINALIZATION_SPECIAL_ASSESSMENTS.map((label, index) => {
    if (label === '技术体制与互操作性' && interfaces.length > 0) {
      return criterion(
        `SA-${index + 1}`, label, 'TE-BTBA-006 专项评估', 'partial',
        `关系图包含 ${interfaces.length} 个 InterfaceContract，可作为互操作性专项评估输入，但不等同于专项评估报告。`,
        interfaces.map((item) => item.pk),
      )
    }
    if (label === '软件能力' && models.length > 0) {
      return criterion(
        `SA-${index + 1}`, label, 'TE-BTBA-006 专项评估', 'partial',
        '关系图包含 ModelAsset/VV&A 输入，但尚无正式软件能力专项评估结论。',
        models.map((item) => item.pk),
      )
    }
    if (label.startsWith('标准化') && accreditedModels.length > 0) {
      return criterion(
        `SA-${index + 1}`, label, 'TE-BTBA-006 专项评估', 'partial',
        '关系图具有模型 VV&A/基线输入，但装备数字化模型有效性仍必须形成正式专项评估结论。',
        accreditedModels.map((item) => item.pk),
      )
    }
    return criterion(`SA-${index + 1}`, label, 'TE-BTBA-006 专项评估', 'missing', `当前 Case 关系图尚未建立“${label}”专项评估对象及正式报告。`)
  })

  const runDatasetRefs = Array.from(new Set(
    runs.flatMap((run) => [...(run.data.inputDatasetRefs ?? []), ...(run.data.outputDatasetRefs ?? [])].map(String)),
  ))
  const candidateDigitalData = runs.some((run) => /Digital|LVC/i.test(String(run.data.executionMode ?? '')))
    || runDatasetRefs.some((ref) => /lvc|simulation|dot/i.test(ref))

  const dataAcceptance = [
    { id: 'DA-A', label: '性能验证试验数据 → 状态鉴定 / 列装定型', status: reports.length > 0 ? 'partial' as const : 'missing' as const, detail: reports.length > 0 ? '已有关系驱动的性能试验/报告输入，但尚无 DataAcceptanceRecord，不能自动升级为正式鉴定证据。' : '尚未建立 DataAcceptanceRecord，不能把过程数据自动升级为正式鉴定证据。' },
    { id: 'DA-B', label: '性能鉴定试验数据 → 作战试验（含作战评估）', status: completedPerformance.length > 0 ? 'partial' as const : 'missing' as const, detail: completedPerformance.length > 0 ? '存在已完成性能类事件，但没有正式数据采信批准对象。' : '没有可解析的已完成性能类事件及正式采信记录。' },
    { id: 'DA-C', label: '其他同类装备试验数据 → 本装备状态鉴定 / 列装定型', status: 'missing' as const, detail: '尚未建立同类装备证据来源和等效性/适用性论证。' },
    { id: 'DA-D', label: '体系试验数据 → 状态鉴定 / 列装定型', status: candidateDigitalData ? 'partial' as const : 'missing' as const, detail: candidateDigitalData ? '关系图存在 LVC/数字运行候选输入；仍缺正式数据采信分析评估记录。' : '当前 Case 关系图没有体系试验/数字仿真运行候选。' },
  ]

  const classificationReady = Boolean(root.data.equipmentClass && root.data.militaryProductLevel)
  const equipmentClassificationBlocker = classificationReady ? '' : '未建模装备分类（重要/一般/单独立项分系统设备）和军工产品级别，系统无法自动解析审批/备案权限。'
  const stateApprovalBlocker = hasStateQualificationApproval ? '' : '未发现正式“状态鉴定审批/批复”对象，不能自动授权进入作战试验。'

  const actions: GovernanceAction[] = [
    actionFromCriteria('submitStateQualificationReview', '提交状态鉴定会议审查', '状态鉴定', '装备部门 / 装备试验鉴定管理机构', stateQualificationCriteria, [equipmentClassificationBlocker]),
    actionFromCriteria('authorizeOperationalTest', '准许进入作战试验', '作战试验', '装备试验鉴定管理机构 / 装备部门会同本级参谋部门', operationalTestCriteria, [stateApprovalBlocker, equipmentClassificationBlocker]),
    actionFromCriteria('submitFieldingFinalizationReview', '提交列装定型审查', '列装定型', '二级定委 / 一级或二级定委按装备级别审批', [...finalizationCriteria, ...specialAssessments], [equipmentClassificationBlocker]),
  ]

  const requiredDirectTypes = ['MissionThread', 'TestScenario', 'TestEvent', 'Measure', 'ModelAsset', 'EvidenceGate']
  const requiredRelationCoverage = requiredDirectTypes.map((type) => ({
    type,
    present: directTargets.some((node) => node.type === type),
    refs: directTargets.filter((node) => node.type === type).map((node) => node.pk),
  }))
  const foreignCaseRefs = directTargets
    .filter((node) => node.data.caseId && node.data.caseId !== caseId)
    .map((node) => `${node.type}/${node.pk}→${node.data.caseId}`)
  const relationCoveragePass = requiredRelationCoverage.every((item) => item.present)
  const transportabilityDecision = relationCoveragePass && foreignCaseRefs.length === 0 ? 'PASS' : 'BLOCKED'
  const taskProfile = String(root.data.taskProfile ?? root.data.question ?? root.title)

  const stateSummary = summarize(stateQualificationCriteria)
  const operationalSummary = summarize(operationalTestCriteria)
  const finalizationSummary = summarize([...finalizationCriteria, ...specialAssessments])

  return {
    version: 'v2.3.1',
    availableCases: availableCases.map((item) => ({
      pk: item.pk,
      title: item.title,
      taskProfile: String(item.data.taskProfile ?? item.data.question ?? item.title),
    })),
    rootObject: { pk: root.pk, title: root.title, status: root.data.status ?? '未知', taskProfile },
    transportabilityGate: {
      decision: transportabilityDecision,
      reasoningMode: 'caseId+ontology-relations',
      relationDerived: true,
      caseId,
      taskProfile,
      directRelationCount: directEdges.length,
      linkedNodeCount: nodes.length - 1,
      linkCount: edges.length,
      requiredRelationCoverage,
      leakageCheck: foreignCaseRefs.length === 0 ? 'PASS' : 'BLOCKED',
      foreignCaseRefs,
      note: 'Gate PASS 仅表示同一治理函数可从该 Case 的 Ontology 关系恢复所需上下文且未发生跨 Case 直接关系泄漏；不表示该装备通过任何鉴定。',
    },
    authoritativeContext: {
      regulation: '《军队装备试验鉴定规定》：军队装备试验鉴定基本法规',
      programMainline: 'TE-BTBA：程序主干；TE-BTBB：试验初案/总案；TE-BTBC：鉴定定型文件；TE-BTBD：在役考核文件',
      configurationManagement: 'GJB 3206 技术状态管理贯穿试验鉴定全程',
      lifecycle: CHINA_TE_LIFECYCLE,
    },
    ontologyPattern: {
      objectView: `${caseId} 作为对象中心；治理上下文只从 LinkEntry 关系图派生，不再由固定事件/指标/模型 ID 列表驱动。`,
      functionLogic: '同一服务端治理函数对不同任务类型 Case 计算审查条件与阻塞项。',
      actionCriteria: '每个治理动作输出 allowed + blockers；证据覆盖率不能抵消硬前置条件。',
      security: '治理动作继续沿用 OIDC actor / role，禁止客户端自报执行身份。',
      lineage: '审查标准只引用当前 Case 关系子图中的 evidence refs，防止跨 Case 污染。',
    },
    objectCoverage: {
      scenarios: scenarios.length,
      events: events.length,
      measures: measures.length,
      models: models.length,
      gates: gates.length,
      runs: runs.length,
      evidencePackages: packages.length,
      deficiencies: deficiencies.length,
      reports: reports.length,
      modelBaselines: baselines.length,
      assemblies: assemblies.length,
      interfaces: interfaces.length,
    },
    stateQualification: {
      summary: stateSummary,
      criteria: stateQualificationCriteria,
      decisionVocabulary: [...STATE_QUALIFICATION_DECISIONS],
      process: ['申请', '技术审查', '会议审查', '审批/备案'],
    },
    operationalTest: {
      summary: operationalSummary,
      criteria: operationalTestCriteria,
      process: ['状态鉴定批复', '申请', '大纲/想定审批', '试验实施', '试验部队独立评价', '报告'],
    },
    fieldingFinalization: {
      summary: finalizationSummary,
      criteria: finalizationCriteria,
      specialAssessments,
      decisionVocabulary: [...FIELDING_FINALIZATION_REVIEW_DECISIONS],
      process: ['申请', '专项评估', '技术审查', '定委审查', '审批/备案'],
    },
    dataAcceptance,
    technicalState: {
      currentModelBaselines: baselines.map((item) => item.pk),
      currentAssemblies: assemblies.map((item) => item.pk),
      stateQualificationApprovedBaseline: baselines.find((item) => item.data.formalTechnicalState === true && /状态鉴定/.test(String(item.data.approvalStage ?? '')))?.pk ?? null,
      fieldingFinalizationApprovedBaseline: baselines.find((item) => item.data.formalTechnicalState === true && /列装定型/.test(String(item.data.approvalStage ?? '')))?.pk ?? null,
      warning: 'ModelBaseline / TestModelAssembly 是试验执行配置与模型来源快照，不自动等同于状态鉴定或列装定型批准的装备技术状态。',
    },
    digitalModel: {
      accreditedModelRefs: accreditedModels.map((item) => item.pk),
      stateQualificationRequirement: '状态鉴定阶段需对装备数字化模型进行审验；VV&A 认可可作为输入但不替代正式审验。',
      finalizationRequirement: '列装定型阶段仍需在标准化专项评估中评价装备数字化模型有效性。',
      warning: 'VV&A、试验执行模型基线、正式装备数字化模型审验/有效性结论是不同的对象，不能自动互相替代。',
    },
    actions,
  }
}
