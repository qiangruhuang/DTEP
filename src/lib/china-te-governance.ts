import { db } from '@/lib/db'

type Entry = { pk: string; title: string; data: Record<string, any> }

export type GovernanceStatus = 'ready' | 'partial' | 'blocked' | 'missing'

export type GovernanceCriterion = {
  id: string
  label: string
  basis: string
  status: GovernanceStatus
  evidence: string[]
  detail: string
  blocking: boolean
}

export type GovernanceAction = {
  apiName: string
  label: string
  stage: string
  allowed: boolean
  requiredAuthority: string
  blockers: string[]
}

const STATUS_RANK: Record<GovernanceStatus, number> = {
  ready: 1,
  partial: 0.5,
  blocked: 0,
  missing: 0,
}

export const CHINA_TE_LIFECYCLE = [
  { id: 'performance', label: '性能试验', output: '性能底数', owner: '试验单位 / 研制相关单位' },
  { id: 'stateQualification', label: '状态鉴定', output: '状态鉴定结论', owner: '装备部门组织，试验鉴定管理机构承办' },
  { id: 'operational', label: '作战试验', output: '效能底数 + 部队评价', owner: '试验单位 + 试验部队' },
  { id: 'fieldingFinalization', label: '列装定型', output: '列装定型结论', owner: '二级定委组织，定委办公室承办' },
  { id: 'inService', label: '在役考核', output: '在役使用与保障评价', owner: '试验单位 + 试验部队' },
] as const

export const STATE_QUALIFICATION_DECISIONS = [
  '通过状态鉴定审查',
  '带遗留工作（问题）通过状态鉴定审查',
  '不通过状态鉴定审查',
] as const

export const FIELDING_FINALIZATION_REVIEW_DECISIONS = [
  '建议批准定型、可列装 / 建议批准定型、可让步列装',
  '建议带遗留问题定型、可受限列装',
  '建议带遗留工作定型、可试用列装',
  '建议暂缓定型、完成整改后重新提交定型',
  '建议不同意定型、项目终止',
] as const

export const FINALIZATION_SPECIAL_ASSESSMENTS = [
  '通用质量特性',
  '复杂环境适应性',
  '人机工效',
  '技术体制与互操作性',
  '自主可控',
  '网络安全',
  '软件能力',
  '标准化（含技术状态一致性、随装资料适用性、装备数字化模型有效性）',
] as const

async function getEntries(apiName: string): Promise<Entry[]> {
  const objectType = await db.objectType.findUnique({
    where: { apiName },
    select: {
      entries: {
        select: { pk: true, title: true, dataJson: true },
      },
    },
  })
  return (objectType?.entries ?? []).map((entry) => ({
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}'),
  }))
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
  return { id, label, basis, status, evidence, detail, blocking }
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
    ...extraBlockers,
  ]
  return { apiName, label, stage, requiredAuthority, allowed: blockers.length === 0, blockers }
}

export async function buildChinaTeGovernanceSnapshot() {
  const [
    cases,
    scenarios,
    events,
    measures,
    models,
    modelBaselines,
    assemblies,
    interfaces,
    evidencePackages,
    deficiencies,
    reports,
  ] = await Promise.all([
    getEntries('DigitalTestCase'),
    getEntries('TestScenario'),
    getEntries('TestEvent'),
    getEntries('Measure'),
    getEntries('ModelAsset'),
    getEntries('ModelBaseline'),
    getEntries('TestModelAssembly'),
    getEntries('InterfaceContract'),
    getEntries('EvidencePackage'),
    getEntries('Deficiency'),
    getEntries('Report'),
  ])

  const datasets = await db.testDataset.findMany({
    select: { path: true, name: true, domain: true, origin: true, qualityScore: true },
    orderBy: { path: 'asc' },
  })

  const currentCase = cases.find((item) => item.pk === 'CASE-01') ?? cases[0] ?? null
  const event = (pk: string) => events.find((item) => item.pk === pk)
  const measure = (pk: string) => measures.find((item) => item.pk === pk)
  const model = (pk: string) => models.find((item) => item.pk === pk)
  const completed = (pk: string) => event(pk)?.data.status === '已完成'
  const qualified = (pk: string) => measure(pk)?.data.status === '达标'
  const accredited = (pk: string) => model(pk)?.data.accreditation === '已认可'
  const openDeficiencies = deficiencies.filter((item) => item.data.status !== '已闭环')
  const recognizedDigitalModels = ['MD-02', 'MD-07', 'MD-08'].filter(accredited)
  const formalCaseFrozen = currentCase?.data.status === '正式结论已冻结'

  const stateQualificationCriteria: GovernanceCriterion[] = [
    criterion(
      'SQ-A',
      '性能鉴定试验考核完成、性能达到要求且性能底数清楚',
      'TE-BTBA-004 审查标准 a',
      completed('TE-25-002') && ['M-03', 'M-05', 'M-07'].every(qualified) ? 'partial' : 'blocked',
      completed('TE-25-002')
        ? '已有试验事件/指标结果可支撑，但当前原型尚未建立“性能鉴定试验报告 + 性能底数报告”的正式对象身份，不能直接等同于已满足状态鉴定标准。'
        : 'CASE-01 的实测锚点仍未形成可识别的正式性能鉴定试验闭环。',
      ['TE-25-002', 'M-03', 'M-05', 'M-07'].filter((pk) => Boolean(event(pk) || measure(pk))),
    ),
    criterion(
      'SQ-B',
      '技术状态清楚，分系统/设备按层级完成相应鉴定',
      'TE-BTBA-004 审查标准 b / 分级管理',
      modelBaselines.length > 0 ? 'partial' : 'missing',
      modelBaselines.length > 0
        ? `已有 ${modelBaselines.length} 个 ModelBaseline，但“状态鉴定确定的装备技术状态”尚未作为独立受控对象建模。`
        : '尚未发现可作为技术状态基线依据的 ModelBaseline。',
      modelBaselines.slice(0, 4).map((item) => item.pk),
    ),
    criterion(
      'SQ-C',
      '图样、软件与技术文件完整规范，可指导小批量试生产',
      'TE-BTBA-004 审查标准 c',
      reports.length > 0 ? 'partial' : 'missing',
      reports.length > 0
        ? '已有试验/鉴定类 Report 对象，但尚未建立“鉴定定型文件清单 + 文件专用标识 + 文件完整性审查”对象链。'
        : '尚未建立状态鉴定文件资料对象链。',
      reports.slice(0, 4).map((item) => item.pk),
    ),
    criterion(
      'SQ-D',
      '配套考核完成，小批量试生产工艺和生产条件审查通过',
      'TE-BTBA-004 审查标准 d',
      'missing',
      '当前原型没有“小批量试生产工艺和生产条件审查”对象，这是会议审查前的硬前置条件。',
    ),
    criterion(
      'SQ-E',
      '配套质量可靠、供货稳定并满足自主可控要求',
      'TE-BTBA-004 审查标准 e',
      'missing',
      '当前 Ontology 尚未建模配套产品供货、自主可控与国产化替代证据。',
    ),
    criterion(
      'SQ-F',
      '性能试验反馈问题已解决或有明确措施计划',
      'TE-BTBA-004 审查标准 f',
      openDeficiencies.length === 0 ? 'ready' : 'blocked',
      openDeficiencies.length === 0
        ? '当前缺陷对象均已闭环。'
        : `仍有 ${openDeficiencies.length} 项未闭环缺陷，必须形成明确结论或措施计划。`,
      openDeficiencies.map((item) => item.pk),
    ),
    criterion(
      'SQ-G',
      '承制资格及试验机构使用合规',
      'TE-BTBA-004 审查标准 g / TE-BTAB-008',
      'missing',
      '当前原型尚未把承制资格、承试单位资格及采购服务合规建成可校验对象。',
    ),
    criterion(
      'SQ-DM',
      '对装备数字化模型进行审验',
      'TE-BTBA-004 §4.1',
      recognizedDigitalModels.length === 3 ? 'partial' : 'blocked',
      recognizedDigitalModels.length === 3
        ? 'MD-02 / MD-07 / MD-08 已有 VV&A 认可，可作为数字化模型审验的重要输入；但 VV&A 认可不等同于正式“装备数字化模型审验”结论。'
        : '数字模型尚未全部完成当前 intended use 下的 VV&A 认可，不能支撑正式数字化模型审验。',
      recognizedDigitalModels,
    ),
  ]

  const operationalTestCriteria: GovernanceCriterion[] = [
    criterion(
      'OT-PRE',
      '状态鉴定后进入作战试验，申请经试验鉴定管理机构组织审查',
      'TE-BTBA-005',
      'missing',
      '当前 Ontology 没有“状态鉴定审批对象/批复对象”，因此不能自动证明作战试验法定前置关系已满足。',
    ),
    criterion(
      'OT-PLAN',
      '作战试验大纲（含想定）由试验单位与试验部队联合编制并按程序审批',
      'TE-BTBA-005',
      scenarios.length > 0 ? 'partial' : 'missing',
      scenarios.length > 0
        ? `已有 ${scenarios.length} 个 TestScenario，但尚未区分“批准的作战试验想定/大纲”及其联合编制、审批、备案身份。`
        : '尚未形成可追溯的作战试验想定/大纲对象。',
      scenarios.slice(0, 4).map((item) => item.pk),
    ),
    criterion(
      'OT-TROOP',
      '装备操作使用、想定设计与部队评价依托试验部队开展',
      'TE-BTBA-005',
      'missing',
      '当前原型只有通用 actor/role，没有“试验部队”组织对象及其独立评价责任链。',
    ),
    criterion(
      'OT-CONFIG',
      '作战试验样机技术状态与状态鉴定确定的技术状态一致',
      'TE-BTBA-001 技术状态管理',
      assemblies.length > 0 && modelBaselines.length > 0 ? 'partial' : 'missing',
      assemblies.length > 0 && modelBaselines.length > 0
        ? '已能冻结 TestModelAssembly / ModelBaseline，但缺少与“状态鉴定确定技术状态”之间的正式等同性/批准链。'
        : '缺少可比对的装配/模型基线。',
      [...assemblies.slice(0, 2), ...modelBaselines.slice(0, 2)].map((item) => item.pk),
    ),
    criterion(
      'OT-EFF',
      '形成作战效能、作战适用性结论和效能底数',
      'TE-BTBA-005',
      completed('TE-25-004') && qualified('M-13') ? 'partial' : 'blocked',
      completed('TE-25-004') && qualified('M-13')
        ? '已有 LVC/任务效能结果，但尚未建立“作战试验报告 + 效能底数报告 + 试验部队独立评价”正式对象链。'
        : '任务效能正式证据闭环尚不充分。',
      ['TE-25-004', 'M-13'].filter((pk) => Boolean(event(pk) || measure(pk))),
    ),
  ]

  const finalizationCriteria: GovernanceCriterion[] = [
    criterion(
      'FF-A',
      '性能鉴定试验和作战试验考核完成，性能底数和效能底数清楚',
      'TE-BTBA-006 审查标准 a',
      formalCaseFrozen && qualified('M-13') ? 'partial' : 'blocked',
      formalCaseFrozen
        ? 'CASE 已冻结数字化结论，但仍缺正式性能底数/效能底数报告对象和作战试验身份，不能直接等同于列装定型标准已满足。'
        : 'CASE 尚未形成正式冻结结论，列装定型考核验证条件不充分。',
      ['CASE-01', 'M-13'],
    ),
    criterion(
      'FF-B',
      '技术状态清楚并满足装备体制、技术体制和“三化”要求',
      'TE-BTBA-006 审查标准 b',
      modelBaselines.length > 0 ? 'partial' : 'missing',
      modelBaselines.length > 0
        ? '已有模型/装配基线，但尚未形成列装定型技术状态基线及“三化”符合性对象。'
        : '缺少受控技术状态基线。',
      modelBaselines.slice(0, 4).map((item) => item.pk),
    ),
    criterion(
      'FF-C',
      '技术文件可指导批量生产验收，随装资料和作战运用参考可支撑部队运用',
      'TE-BTBA-006 审查标准 c',
      reports.length > 0 ? 'partial' : 'missing',
      '现有 Report 只能作为材料线索；尚未建立作战运用参考、随装资料适用性与列装定型专用标识。',
      reports.slice(0, 4).map((item) => item.pk),
    ),
    criterion(
      'FF-D',
      '配套考核完成，批量生产（或稳定生产）工艺和生产条件审查通过',
      'TE-BTBA-006 审查标准 d',
      'missing',
      '当前原型没有“批量生产（或稳定生产）工艺和生产条件审查”对象。',
    ),
    criterion(
      'FF-E',
      '质量稳定、供货可靠、自主可控',
      'TE-BTBA-006 审查标准 e',
      'missing',
      '当前 Ontology 尚未形成质量稳定性、供应链和自主可控证据图。',
    ),
    criterion(
      'FF-F',
      '状态鉴定遗留问题、作战试验问题及试生产问题已解决或有明确结论',
      'TE-BTBA-006 审查标准 f',
      openDeficiencies.length === 0 ? 'ready' : 'blocked',
      openDeficiencies.length === 0
        ? '当前缺陷对象均已闭环。'
        : `仍有 ${openDeficiencies.length} 项未闭环缺陷，不能把问题闭环视为完成。`,
      openDeficiencies.map((item) => item.pk),
    ),
    criterion(
      'FF-G',
      '承制资格具备且质量管理体系运行有效',
      'TE-BTBA-006 审查标准 g',
      'missing',
      '当前原型未建模承制资格和质量管理体系有效性证据。',
    ),
  ]

  const specialAssessments = FINALIZATION_SPECIAL_ASSESSMENTS.map((label, index) => {
    if (label === '技术体制与互操作性' && interfaces.length > 0) {
      return criterion(
        `SA-${index + 1}`,
        label,
        'TE-BTBA-006 专项评估',
        'partial',
        `Ontology 中已有 ${interfaces.length} 个 InterfaceContract，可作为互操作性专项评估输入，但不等同于专项评估报告。`,
        interfaces.slice(0, 4).map((item) => item.pk),
      )
    }
    if (label === '软件能力' && models.length > 0) {
      return criterion(
        `SA-${index + 1}`,
        label,
        'TE-BTBA-006 专项评估',
        'partial',
        '已有 ModelAsset/VV&A 数据，可作为软件能力评估输入，但尚无正式专项评估结论。',
        models.slice(0, 4).map((item) => item.pk),
      )
    }
    if (label.startsWith('标准化') && recognizedDigitalModels.length > 0) {
      return criterion(
        `SA-${index + 1}`,
        label,
        'TE-BTBA-006 专项评估',
        'partial',
        '已有数字模型 VV&A 和模型基线信息，但“装备数字化模型有效性”必须作为标准化专项评估子项形成正式结论。',
        recognizedDigitalModels,
      )
    }
    return criterion(
      `SA-${index + 1}`,
      label,
      'TE-BTBA-006 专项评估',
      'missing',
      `当前原型尚未建立“${label}”专项评估对象及正式报告。`,
    )
  })

  const dataAcceptance = [
    {
      id: 'DA-A',
      label: '性能验证试验数据 → 状态鉴定 / 列装定型',
      status: 'missing' as const,
      detail: '尚未建立 DataAcceptanceRecord，不能把科研过程数据自动升级为正式鉴定证据。',
    },
    {
      id: 'DA-B',
      label: '性能鉴定试验数据 → 作战试验（含作战评估）',
      status: 'missing' as const,
      detail: '现有事件未被标记为正式性能鉴定试验数据采信来源。',
    },
    {
      id: 'DA-C',
      label: '其他同类装备试验数据 → 本装备状态鉴定 / 列装定型',
      status: 'missing' as const,
      detail: '尚未建立同类装备证据来源和等效性/适用性论证。',
    },
    {
      id: 'DA-D',
      label: '体系试验数据 → 状态鉴定 / 列装定型',
      status: datasets.some((item) => /lvc|simulation|dot/i.test(`${item.path} ${item.origin}`)) ? 'partial' as const : 'missing' as const,
      detail: datasets.some((item) => /lvc|simulation|dot/i.test(`${item.path} ${item.origin}`))
        ? '已有 LVC / 数字试验数据资产，是数据采信候选；但缺少正式数据采信分析评估记录，当前只能作为候选证据。'
        : '尚未发现体系试验/数字仿真数据候选。',
    },
  ]

  const stateSummary = summarize(stateQualificationCriteria)
  const operationalSummary = summarize(operationalTestCriteria)
  const finalizationSummary = summarize([...finalizationCriteria, ...specialAssessments])

  const equipmentClassificationBlocker = '未建模装备分类（重要/一般/单独立项分系统设备）和军工产品级别，系统无法自动解析审批/备案权限。'
  const stateApprovalBlocker = '未发现正式“状态鉴定审批/批复”对象，不能自动授权进入作战试验。'

  const actions: GovernanceAction[] = [
    actionFromCriteria(
      'submitStateQualificationReview',
      '提交状态鉴定会议审查',
      '状态鉴定',
      '装备部门 / 装备试验鉴定管理机构',
      stateQualificationCriteria,
      [equipmentClassificationBlocker],
    ),
    actionFromCriteria(
      'authorizeOperationalTest',
      '准许进入作战试验',
      '作战试验',
      '装备试验鉴定管理机构 / 装备部门会同本级参谋部门',
      operationalTestCriteria,
      [stateApprovalBlocker, equipmentClassificationBlocker],
    ),
    actionFromCriteria(
      'submitFieldingFinalizationReview',
      '提交列装定型审查',
      '列装定型',
      '二级定委 / 一级或二级定委按装备级别审批',
      [...finalizationCriteria, ...specialAssessments],
      [equipmentClassificationBlocker],
    ),
  ]

  return {
    version: 'v2.3-prototype',
    rootObject: currentCase ? { pk: currentCase.pk, title: currentCase.title, status: currentCase.data.status ?? '未知' } : null,
    authoritativeContext: {
      regulation: '《军队装备试验鉴定规定》：军队装备试验鉴定基本法规',
      programMainline: 'TE-BTBA：程序主干；TE-BTBB：试验初案/总案；TE-BTBC：鉴定定型文件；TE-BTBD：在役考核文件',
      configurationManagement: 'GJB 3206 技术状态管理贯穿试验鉴定全程',
      lifecycle: CHINA_TE_LIFECYCLE,
    },
    ontologyPattern: {
      objectView: 'CASE-01 作为对象中心，链接场景、事件、指标、模型基线、证据、缺陷、报告与决策。',
      functionLogic: '业务门控由服务端规则函数派生，不把法定/标准要求散落在前端页面。',
      actionCriteria: '每个治理动作输出 allowed + blockers，直接解释“为什么现在不能提交”。',
      security: '治理动作继续沿用 OIDC actor / role，禁止客户端自报执行身份。',
      lineage: '每条审查标准保留 evidence object refs，避免“结论脱离证据”。',
    },
    objectCoverage: {
      scenarios: scenarios.length,
      events: events.length,
      measures: measures.length,
      models: models.length,
      modelBaselines: modelBaselines.length,
      assemblies: assemblies.length,
      interfaces: interfaces.length,
      evidencePackages: evidencePackages.length,
      reports: reports.length,
      openDeficiencies: openDeficiencies.length,
      datasets: datasets.length,
    },
    stateQualification: {
      summary: stateSummary,
      criteria: stateQualificationCriteria,
      decisionVocabulary: STATE_QUALIFICATION_DECISIONS,
      process: ['申请', '前伸审查', '会议审查', '审批 / 备案'],
    },
    operationalTest: {
      summary: operationalSummary,
      criteria: operationalTestCriteria,
      process: ['申请', '大纲（含想定）', '准备', '实施', '问题反馈处理', '报告 / 效能底数 / 部队独立评价'],
    },
    fieldingFinalization: {
      summary: finalizationSummary,
      criteria: finalizationCriteria,
      specialAssessments,
      decisionVocabulary: FIELDING_FINALIZATION_REVIEW_DECISIONS,
      process: ['申请', '8 项专项评估', '会议审查', '定委审议', '审批 / 备案'],
    },
    dataAcceptance,
    technicalState: {
      currentModelBaselines: modelBaselines.slice(0, 8).map((item) => item.pk),
      currentAssemblies: assemblies.slice(0, 8).map((item) => item.pk),
      stateQualificationApprovedBaseline: null,
      fieldingFinalizationApprovedBaseline: null,
      warning: 'ModelBaseline / TestModelAssembly 是数字试验执行基线，不自动等同于状态鉴定或列装定型确定的装备技术状态；二者之间必须建立受审批控制的正式关联。',
    },
    digitalModel: {
      accreditedModelRefs: recognizedDigitalModels,
      stateQualificationRequirement: '状态鉴定：对装备数字化模型进行审验。',
      finalizationRequirement: '列装定型：标准化专项评估应评价装备数字化模型有效性。',
      warning: '模型 VV&A、SysML v2 设计语义、仿真执行基线和正式装备数字化模型审验/有效性结论是相互关联但不同的对象。',
    },
    actions,
  }
}
