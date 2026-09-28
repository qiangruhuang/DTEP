export type GovernanceArchitectureLayerId = 'object' | 'relation' | 'evidence' | 'decision'

export type GovernanceArchitectureLayer = {
  id: GovernanceArchitectureLayerId
  label: string
  question: string
  responsibility: string
  coreContracts: string[]
  failClosedRule: string
}

export type GovernanceArchitectureMechanism = {
  id: 'v2.3.1' | 'v2.3.2' | 'v2.3.3' | 'v2.3.4'
  label: string
  transition: string
  guarantee: string
}

export const GOVERNANCE_ARCHITECTURE_V24 = {
  name: 'Object–Relation–Evidence–Decision Governance Architecture',
  shortName: 'ORED Governance Compiler',
  thesis:
    'A DigitalTestCase is compiled from an object-centered ontology graph into admissible evidence and then into governed decisions; invalid, foreign, unauthorized or stale evidence is removed before decision criteria are evaluated.',
  layers: [
    {
      id: 'object',
      label: '对象层',
      question: '治理对象是谁，边界在哪里？',
      responsibility:
        '以 DigitalTestCase(caseId) 为治理根，聚合任务、场景、事件、指标、模型、报告、缺陷和基线等一等对象。',
      coreContracts: [
        'stable object identity',
        'case-scoped object root',
        'explicit object type',
        'frozen technical/model references where required',
      ],
      failClosedRule:
        '根对象不存在或对象类型不满足合同，不进入后续关系解析。',
    },
    {
      id: 'relation',
      label: '关系层',
      question: '这些对象以什么语义参与当前 Case？',
      responsibility:
        '通过 LinkEntry 与 semantic/governance roles 表达 Case 作用域、治理角色、跨 Case 归属和关系完整性。',
      coreContracts: [
        'relation type contract',
        'semantic role contract',
        'cross-case ownership isolation',
        'no case-specific reasoning branches',
      ],
      failClosedRule:
        '错类型、错角色、角色冲突或未授权跨 Case 污染作为 ontology integrity error 排除并硬阻塞。',
    },
    {
      id: 'evidence',
      label: '证据层',
      question: '哪些关联对象此刻可以被治理逻辑信任？',
      responsibility:
        '对关系解析后的候选对象执行证据准入、跨 Case 复用授权、适用域约束、provenance、来源快照和失效传播。',
      coreContracts: [
        'authorization-backed reuse',
        'provenance and source snapshot',
        'task/domain applicability',
        'revocation / expiry / source-drift invalidation',
      ],
      failClosedRule:
        '未授权或结构错误进入 hard error；已撤销、过期或来源漂移进入 stale ledger，并从可信证据桶移除。',
    },
    {
      id: 'decision',
      label: '决策层',
      question: '当前可信证据允许系统做什么？',
      responsibility:
        '只消费已准入的 semantic-role evidence，派生法规/业务 criteria、evidence coverage、submission blockers 和 governed actions。',
      coreContracts: [
        'criteria derived from trusted evidence only',
        'hard prerequisites cannot be averaged away',
        'action blockers inherit criterion failures',
        'reuse never upgrades formal decision level',
      ],
      failClosedRule:
        '任一 blocking criterion、完整性错误或法定前置缺口存在时，对应 governed action 不可提交并必须解释原因。',
    },
  ] satisfies GovernanceArchitectureLayer[],
  mechanisms: [
    {
      id: 'v2.3.1',
      label: 'Second-Case Transportability',
      transition: '对象层 → 关系层',
      guarantee:
        'caseId + ontology relations 决定治理作用域；同一治理代码可运行于不同任务类型，核心推理不含 CASE 专属对象编号。',
    },
    {
      id: 'v2.3.2',
      label: 'Relation Completeness & Negative Transport',
      transition: '关系层 → 证据层',
      guarantee:
        '错类型、跨 Case 污染、非法/冲突角色在进入可信证据桶之前 fail closed；正常缺关系与图结构损坏被区分。',
    },
    {
      id: 'v2.3.3',
      label: 'Governed Cross-Case Evidence Reuse',
      transition: '关系层 → 证据层',
      guarantee:
        '跨 Case 证据只有在来源/目标/对象/角色/适用域/审批/provenance 合同完整时才能被准入，且不继承来源 Case 最终结论。',
    },
    {
      id: 'v2.3.4',
      label: 'Reuse Revocation & Change Propagation',
      transition: '证据层 → 决策层',
      guarantee:
        '撤销、过期、来源摘要或验证域漂移使已复用证据自动 stale；证据移除后由同一 criteria/action 链自然传播阻塞。',
    },
  ] satisfies GovernanceArchitectureMechanism[],
  invariants: [
    'Governance reasoning is case-generic; case differences are represented as ontology data and relation semantics.',
    'Only evidence that survives relation integrity and evidence-admission checks may enter governance criteria.',
    'Cross-case reuse is bounded permission, not transfer of evidence quality, VV&A scope, or final adjudication.',
    'Staleness is lifecycle state, distinct from ontology corruption, but stale evidence is equally excluded from trusted evidence.',
    'Governed actions are derived from criteria and authority prerequisites; UI state never substitutes for server-side governance.',
    'The frozen v2.1 execution/evidence/human-adjudication architecture remains intact; v2.4 consolidates governance above it rather than replacing it.',
  ],
  paperStory: {
    problem:
      'Digital T&E platforms can accumulate models, runs and reports while still losing the governance semantics that determine whether evidence is admissible for a different case or remains valid after source change.',
    method:
      'Represent governance as a four-layer compiler from case-scoped objects and typed relations to admissible evidence and finally to explainable governed actions.',
    evidence:
      'Transportability, negative-relation, bounded-reuse and change-propagation gates exercise the four layer boundaries while preserving CASE-01/CASE-02 regression and the frozen v2.1 engineering architecture.',
    claimBoundary:
      'The prototype demonstrates architectural enforcement and traceable fail-closed behavior on synthetic/demo cases; it does not establish operational effectiveness, regulatory approval, or cross-organization external validity.',
  },
} as const
