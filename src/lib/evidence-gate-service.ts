import { createHash } from 'crypto'

export type OntologyEntry = { pk: string; title: string; data: Record<string, any> }
export type DatasetEvidence = { path: string; name: string; qualityScore: number; domain?: string; origin?: string }

export type GateRule = {
  id: string
  label: string
  type: string
  enabled: boolean
  severity: 'hard' | 'soft'
  params?: Record<string, any>
  rationale?: string
}

export type GateRuleSetData = {
  code: string
  name: string
  version: string
  scope: string
  status: string
  purpose: string
  rules: GateRule[]
  decisionPolicy?: Record<string, any>
  owner?: string
}

export type GateCheck = {
  id: string
  label: string
  pass: boolean
  applicable: boolean
  severity: 'hard' | 'soft'
  note: string
}

export type GateEvaluation = {
  decision: '通过' | '有条件通过' | '阻塞'
  score: number
  checks: GateCheck[]
  hardFailures: GateCheck[]
  softFailures: GateCheck[]
  evaluatedAt: string
  packageId: string
  ruleSetId: string
  assessmentMode: '正式准入评估' | '对比/探索评估'
}

type Context = {
  evidencePackage: OntologyEntry
  ruleSet: OntologyEntry
  runs: OntologyEntry[]
  models: OntologyEntry[]
  measures: OntologyEntry[]
  datasets: DatasetEvidence[]
}

const arr = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : []
const acceptedRunStatuses = ['已完成', '数据分析中', '预演完成']

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function manifestHash(value: unknown) {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`
}

function isSynthetic(run: OntologyEntry) {
  return ['Digital', 'LVC'].includes(String(run.data.executionMode))
}

function statusAccepted(run: OntologyEntry, accepted?: string[]) {
  return (accepted ?? acceptedRunStatuses).includes(String(run.data.status))
}

function checkRule(rule: GateRule, ctx: Context): GateCheck {
  const p = ctx.evidencePackage.data
  const manifest = p.manifest && typeof p.manifest === 'object' ? p.manifest as Record<string, any> : null
  const frozen = String(p.status ?? '').startsWith('已冻结')

  // A frozen Evidence Package must be evaluated against its frozen snapshots, not
  // mutable current-state Ontology objects. Draft packages intentionally fall back
  // to current objects for exploratory evaluation.
  const frozenRuns: OntologyEntry[] = frozen && Array.isArray(manifest?.runSnapshots) ? manifest!.runSnapshots : []
  const frozenModels: OntologyEntry[] = frozen && Array.isArray(manifest?.modelSnapshots) ? manifest!.modelSnapshots : []
  const frozenDatasets: DatasetEvidence[] = frozen && Array.isArray(manifest?.datasetSnapshots) ? manifest!.datasetSnapshots : []
  const runSource = frozenRuns.length ? frozenRuns : ctx.runs
  const modelSource = frozenModels.length ? frozenModels : ctx.models
  const datasetSource = frozenDatasets.length ? frozenDatasets : ctx.datasets

  const requiredRunIds = arr(p.requiredRunRefs).length ? arr(p.requiredRunRefs) : arr(p.runRefs)
  const requiredRuns = requiredRunIds.map((id) => runSource.find((r) => r.pk === id)).filter(Boolean) as OntologyEntry[]
  const syntheticUsed = requiredRuns.some(isSynthetic)
  const modelIds = arr(p.modelRefs)
  const models = modelIds.map((id) => modelSource.find((m) => m.pk === id)).filter(Boolean) as OntologyEntry[]
  const datasetRefs = arr(p.datasetRefs)
  const datasetMap = new Map(datasetSource.map((d) => [d.path, d]))
  const datasets = datasetRefs.map((id) => datasetMap.get(id)).filter(Boolean) as DatasetEvidence[]
  const params = rule.params ?? {}

  let pass = true
  let applicable = true
  let note = '满足'

  switch (rule.type) {
    case 'runCoverage': {
      const minRuns = Number(params.minRuns ?? 1)
      pass = requiredRuns.length >= minRuns && requiredRuns.length === requiredRunIds.length
      note = `${requiredRuns.length}/${requiredRunIds.length} 个要求 Run 可解析；最低 ${minRuns}`
      break
    }
    case 'formalEvidenceEligibility': {
      const accepted = Array.isArray(params.acceptedClasses) ? params.acceptedClasses.map(String) : ['正式证据', '条件使用']
      const rejected = requiredRuns.filter((r) => !accepted.includes(String(r.data.formalEvidenceClass)))
      pass = requiredRuns.length > 0 && rejected.length === 0
      note = pass
        ? `${requiredRuns.length} 个要求 Run 的证据用途允许进入当前规则集`
        : `不可进入正式证据：${rejected.map((r) => `${r.pk}(${r.data.formalEvidenceClass ?? '未标记'})`).join('、') || '没有可判定 Run'}`
      break
    }
    case 'datasetQuality': {
      const minQuality = Number(params.minQuality ?? 90)
      const allRefsResolved = datasets.length === datasetRefs.length
      const minimum = datasets.length ? Math.min(...datasets.map((d) => Number(d.qualityScore ?? 0))) : 0
      pass = datasetRefs.length > 0 && allRefsResolved && minimum >= minQuality
      note = datasetRefs.length ? `数据引用 ${datasets.length}/${datasetRefs.length}；最低质量 ${minimum}，门槛 ${minQuality}` : '证据包未登记数据集'
      break
    }
    case 'runMaturity': {
      const accepted = Array.isArray(params.acceptedStatuses) ? params.acceptedStatuses.map(String) : acceptedRunStatuses
      const ready = requiredRuns.filter((r) => statusAccepted(r, accepted)).length
      pass = requiredRuns.length > 0 && ready === requiredRuns.length
      note = `${ready}/${requiredRuns.length} 个要求 Run 达到可判读状态`
      break
    }
    case 'packageIntegrity': {
      const frozen = String(p.status).startsWith('已冻结')
      const hasManifest = Boolean(p.manifest && typeof p.manifest === 'object')
      const expected = hasManifest ? manifestHash(p.manifest) : null
      const hashOk = Boolean(expected && p.packageHash === expected)
      pass = frozen && hashOk
      if (!frozen) note = '证据包仍为草稿，尚未形成不可变证据快照'
      else if (!hasManifest) note = '证据包已冻结但缺少 manifest'
      else if (!hashOk) note = `完整性校验失败：登记 ${String(p.packageHash ?? '无哈希').slice(0, 22)}…，重算 ${String(expected).slice(0, 22)}…`
      else note = `证据包 manifest 哈希校验通过，${String(p.packageHash).slice(0, 22)}…`
      break
    }
    case 'modelIntendedUse': {
      if (!syntheticUsed) { applicable = false; note = '本证据包不依赖 LVC/纯数字 Run'; break }
      pass = models.length === modelIds.length && models.every((m) => Boolean(String(m.data.intendedUse ?? '').trim()))
      note = pass ? `${models.length} 个数字模型均登记 Intended Use` : '存在缺失模型或未登记 Intended Use'
      break
    }
    case 'modelValidationDomain': {
      if (!syntheticUsed) { applicable = false; note = '本证据包不依赖 LVC/纯数字 Run'; break }
      const checks = requiredRuns.flatMap((r) => Array.isArray(r.data.modelDomainChecks) ? r.data.modelDomainChecks : [])
        .filter((c: any) => modelIds.includes(String(c.model)))
      const missing = modelIds.filter((id) => !checks.some((c: any) => String(c.model) === id))
      const failed = checks.filter((c: any) => c.inDomain === false)
      pass = missing.length === 0 && failed.length === 0
      note = failed.length ? failed.map((c: any) => `${c.model}: ${c.reason ?? '超出验证域'}`).join('；') : missing.length ? `缺少验证域检查：${missing.join('、')}` : `${checks.length} 项模型-场景适用域检查均通过`
      break
    }
    case 'modelAccreditation': {
      if (!syntheticUsed) { applicable = false; note = '本证据包不依赖 LVC/纯数字 Run'; break }
      const accepted = Array.isArray(params.accepted) ? params.accepted.map(String) : ['已认可', '有条件认可']
      const failed = models.filter((m) => !accepted.includes(String(m.data.accreditation)))
      pass = models.length === modelIds.length && failed.length === 0
      note = pass ? `${models.length} 个数字模型认可状态满足规则` : `未满足认可要求：${failed.map((m) => `${m.pk}(${m.data.accreditation ?? '未知'})`).join('、') || '模型引用缺失'}`
      break
    }
    case 'liveAnchor': {
      if (!syntheticUsed) { applicable = false; note = '纯实测试验证据无需额外数字证据锚定'; break }
      const minAnchors = Number(params.minAnchors ?? 1)
      const anchorIds = arr(p.liveAnchorRefs)
      const anchors = anchorIds.map((id) => runSource.find((r) => r.pk === id)).filter(Boolean) as OntologyEntry[]
      const usable = anchors.filter((r) => ['Live', 'LVC'].includes(String(r.data.executionMode)) && statusAccepted(r, ['已完成', '数据分析中', '预演完成'])).length
      pass = usable >= minAnchors
      note = `可用实测/LVC 锚点 ${usable}/${minAnchors}；登记 ${anchors.length} 个`
      break
    }
    case 'statisticalReadiness': {
      const analysis = p.analysis ?? {}
      pass = analysis.statisticalReady === true
      note = pass ? `统计分析已可判定；${analysis.summary ?? '已登记结果与不确定性'}` : `统计分析尚未冻结；${analysis.summary ?? '缺少可判定结果'}`
      break
    }
    default:
      pass = false
      note = `未知规则类型：${rule.type}`
  }

  return { id: rule.id, label: rule.label, pass, applicable, severity: rule.severity, note }
}

export function evaluateEvidencePackage(ctx: Context): GateEvaluation {
  const ruleSet = ctx.ruleSet.data as GateRuleSetData
  const enabled = (Array.isArray(ruleSet.rules) ? ruleSet.rules : []).filter((r) => r.enabled !== false)
  const checks = enabled.map((rule) => checkRule(rule, ctx))
  const applicable = checks.filter((c) => c.applicable)
  const hardFailures = applicable.filter((c) => !c.pass && c.severity === 'hard')
  const softFailures = applicable.filter((c) => !c.pass && c.severity === 'soft')
  const passed = applicable.filter((c) => c.pass).length
  const score = applicable.length ? Math.round((passed / applicable.length) * 100) : 0
  const policy = ruleSet.decisionPolicy ?? {}
  const decision = hardFailures.length
    ? (policy.hardFailure ?? '阻塞')
    : softFailures.length
      ? (policy.softFailure ?? '有条件通过')
      : (policy.allPass ?? '通过')
  const boundRuleSet = String(ctx.evidencePackage.data.ruleSetRef ?? '')
  const published = String(ruleSet.status ?? '').startsWith('已发布')
  const assessmentMode = boundRuleSet === ctx.ruleSet.pk && published ? '正式准入评估' : '对比/探索评估'

  return {
    decision: ['通过', '有条件通过', '阻塞'].includes(String(decision)) ? decision as GateEvaluation['decision'] : '阻塞',
    score,
    checks,
    hardFailures,
    softFailures,
    evaluatedAt: new Date().toISOString(),
    packageId: ctx.evidencePackage.pk,
    ruleSetId: ctx.ruleSet.pk,
    assessmentMode,
  }
}
