'use client'

import { useEffect, useState } from 'react'
import { api, type ModuleKey } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  Fingerprint,
  Gavel,
  GitBranch,
  Link2,
  LockKeyhole,
  Network,
  Scale,
  ShieldCheck,
  Waypoints,
  XCircle,
} from 'lucide-react'

type Status = 'ready' | 'partial' | 'blocked' | 'missing'
type Criterion = {
  id: string
  label: string
  basis: string
  status: Status
  evidence: string[]
  detail: string
  blocking: boolean
}
type Summary = { evidenceCoverage: number; ready: number; partial: number; blocked: number; missing: number }
type Action = { apiName: string; label: string; stage: string; allowed: boolean; requiredAuthority: string; blockers: string[] }
type ArchitectureLayer = {
  id: 'object' | 'relation' | 'evidence' | 'decision'
  label: string
  question: string
  responsibility: string
  coreContracts: readonly string[]
  failClosedRule: string
}
type ArchitectureMechanism = {
  id: string
  label: string
  transition: string
  guarantee: string
}
type Snapshot = {
  version: string
  rootObject: { pk: string; title: string; status: string; taskType?: string | null } | null
  governanceArchitecture: {
    name: string
    shortName: string
    thesis: string
    layers: readonly ArchitectureLayer[]
    mechanisms: readonly ArchitectureMechanism[]
    invariants: readonly string[]
    paperStory: {
      problem: string
      method: string
      evidence: string
      claimBoundary: string
    }
    runtime: {
      caseId: string
      objectCount: number
      relationCount: number
      acceptedRelationCount: number
      rejectedRelationCount: number
      hardErrorCount: number
      trustedEvidenceRoleCount: number
      acceptedReuseCount: number
      staleReuseCount: number
      criterionCount: number
      blockingCriterionCount: number
      governedActionCount: number
      blockedActionCount: number
    }
  }
  transportability: {
    integrity: { status: 'valid' | 'invalid'; hardErrors: { code: string; detail: string }[] }
    crossCaseReuse: {
      acceptedReuseCount: number
      staleReuseCount: number
      accepted: { authorizationRef: string; targetPk: string; sourceCaseId: string; governanceRole: string | null }[]
      stale: { authorizationRef: string; code: string; targetPk: string; detail: string }[]
    }
  }
  authoritativeContext: {
    regulation: string
    programMainline: string
    configurationManagement: string
    lifecycle: { id: string; label: string; output: string; owner: string }[]
  }
  ontologyPattern: Record<string, string>
  objectCoverage: Record<string, number>
  stateQualification: { summary: Summary; criteria: Criterion[]; decisionVocabulary: string[]; process: string[] }
  operationalTest: { summary: Summary; criteria: Criterion[]; process: string[] }
  fieldingFinalization: { summary: Summary; criteria: Criterion[]; specialAssessments: Criterion[]; decisionVocabulary: string[]; process: string[] }
  dataAcceptance: { id: string; label: string; status: Status; detail: string }[]
  technicalState: {
    currentModelBaselines: string[]
    currentAssemblies: string[]
    stateQualificationApprovedBaseline: string | null
    fieldingFinalizationApprovedBaseline: string | null
    warning: string
  }
  digitalModel: {
    accreditedModelRefs: string[]
    stateQualificationRequirement: string
    finalizationRequirement: string
    warning: string
  }
  actions: Action[]
}

const STATUS_META: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
  ready: { label: '已具备', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  partial: { label: '部分支撑', className: 'border-sky-200 bg-sky-50 text-sky-700', icon: <CircleDot className="h-3.5 w-3.5" /> },
  blocked: { label: '阻塞', className: 'border-red-200 bg-red-50 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
  missing: { label: '尚未建模', className: 'border-amber-200 bg-amber-50 text-amber-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
}

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status]
  return <Badge variant="outline" className={cn('gap-1 whitespace-nowrap text-[10px]', meta.className)}>{meta.icon}{meta.label}</Badge>
}

function Coverage({ summary }: { summary: Summary }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>证据覆盖度</span>
        <span className="font-semibold text-zinc-900">{summary.evidenceCoverage}%</span>
      </div>
      <Progress value={summary.evidenceCoverage} className="mt-2 h-2" />
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
        <span className="rounded bg-emerald-50 py-1 text-emerald-700">具备 {summary.ready}</span>
        <span className="rounded bg-sky-50 py-1 text-sky-700">部分 {summary.partial}</span>
        <span className="rounded bg-red-50 py-1 text-red-700">阻塞 {summary.blocked}</span>
        <span className="rounded bg-amber-50 py-1 text-amber-700">缺口 {summary.missing}</span>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-zinc-400">这是数字证据覆盖度，不是法规意义上的合格评分；任何硬前置缺口都不能被百分比抵消。</p>
    </div>
  )
}

function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return (
    <div className="space-y-2">
      {criteria.map((item) => (
        <div key={item.id} className="rounded-md border border-zinc-200 bg-white p-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-[10px] text-zinc-400">{item.id}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xs font-medium leading-5 text-zinc-900">{item.label}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">{item.basis}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">{item.detail}</p>
              {item.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.evidence.map((ref) => <Badge key={ref} variant="secondary" className="font-mono text-[9px]">{ref}</Badge>)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProcessStrip({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-1">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">{step}</span>
          {index < steps.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-300" />}
        </div>
      ))}
    </div>
  )
}

function DecisionVocabulary({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-800"><Scale className="h-3.5 w-3.5" />{title}</p>
      <ul className="mt-2 space-y-1 text-[11px] leading-5 text-zinc-600">
        {values.map((value) => <li key={value}>• {value}</li>)}
      </ul>
      <p className="mt-2 text-[10px] text-zinc-400">结论枚举锁定，避免自由文本产生不规范审查结论。</p>
    </div>
  )
}

export function ChinaTeGovernanceModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api<Snapshot>('/api/china-te-governance'))
    } catch (err) {
      setError(err instanceof Error ? err.message : '治理快照加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="试验鉴定治理工作台"
        desc="把试验鉴定治理收敛为一条可执行链：Case 对象确定边界，typed relations 解释语义，证据层决定哪些信息可被信任和复用，决策层只消费已准入证据并生成可解释的 criteria 与 governed actions。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigate('ontology')}><Network className="mr-1.5 h-3.5 w-3.5" />对象与关系</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate('decisionProvenance')}><Fingerprint className="mr-1.5 h-3.5 w-3.5" />决策血缘</Button>
            <Button size="sm" onClick={() => onNavigate('evidenceGate')}><Gavel className="mr-1.5 h-3.5 w-3.5" />Evidence Gate</Button>
          </div>
        }
      />

      {loading && !data ? <LoadingGrid rows={4} /> : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : data ? (
        <>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{data.version}</Badge>
                  {data.rootObject && <Badge variant="outline" className="font-mono">Object View · {data.rootObject.pk}</Badge>}
                </div>
                <h2 className="mt-3 text-base font-semibold text-zinc-900">对象中心，而不是文件中心</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-600">{data.ontologyPattern.objectView}</p>
              </div>
              {data.rootObject && (
                <div className="min-w-[260px] rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs">
                  <p className="font-mono font-semibold text-zinc-900">{data.rootObject.pk}</p>
                  <p className="mt-1 text-zinc-600">{data.rootObject.title}</p>
                  <p className="mt-2 text-zinc-500">当前对象状态：{data.rootObject.status}</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start gap-2">
                <GitBranch className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-zinc-900">{data.governanceArchitecture.shortName}</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-600">{data.governanceArchitecture.thesis}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="flex min-w-[980px] items-stretch gap-2">
                {data.governanceArchitecture.layers.map((layer, index) => (
                  <div key={layer.id} className="flex flex-1 items-center gap-2">
                    <ArchitectureLayerCard layer={layer} index={index} />
                    {index < data.governanceArchitecture.layers.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <RuntimeMetric label="对象" value={data.governanceArchitecture.runtime.objectCount} detail={data.governanceArchitecture.runtime.caseId} />
              <RuntimeMetric label="关系" value={data.governanceArchitecture.runtime.acceptedRelationCount} detail={`拒绝 ${data.governanceArchitecture.runtime.rejectedRelationCount}`} />
              <RuntimeMetric label="可信治理证据角色" value={data.governanceArchitecture.runtime.trustedEvidenceRoleCount} detail={`复用 ${data.governanceArchitecture.runtime.acceptedReuseCount} · stale ${data.governanceArchitecture.runtime.staleReuseCount}`} />
              <RuntimeMetric label="决策门控" value={data.governanceArchitecture.runtime.criterionCount} detail={`阻塞 criteria ${data.governanceArchitecture.runtime.blockingCriterionCount} · actions ${data.governanceArchitecture.runtime.blockedActionCount}/${data.governanceArchitecture.runtime.governedActionCount}`} />
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-700" /><h2 className="text-sm font-semibold text-zinc-900">治理边界验证 · v2.3.1–v2.3.4</h2></div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">四个版本不是四套功能，而是依次验证四层编译链的边界：可迁移、关系隔离、受控复用、变更传播。</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={data.transportability.integrity.status === 'valid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>
                  Relation graph · {data.transportability.integrity.status}
                </Badge>
                <Badge variant="outline">Reuse {data.transportability.crossCaseReuse.acceptedReuseCount}</Badge>
                <Badge variant="outline" className={data.transportability.crossCaseReuse.staleReuseCount ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>Stale {data.transportability.crossCaseReuse.staleReuseCount}</Badge>
              </div>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-4">
              {data.governanceArchitecture.mechanisms.map((mechanism) => (
                <div key={mechanism.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-[9px]">{mechanism.id}</Badge>
                    <span className="text-[9px] text-zinc-400">{mechanism.transition}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-zinc-800">{mechanism.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-500">{mechanism.guarantee}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2"><Waypoints className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-semibold text-zinc-900">中国试验鉴定全寿命业务链</h2></div>
            <div className="overflow-x-auto">
              <div className="flex min-w-[980px] items-stretch gap-2">
                {data.authoritativeContext.lifecycle.map((stage, index) => (
                  <div key={stage.id} className="flex flex-1 items-center gap-2">
                    <div className="h-full flex-1 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-xs font-semibold text-zinc-900">{index + 1}. {stage.label}</p>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-500">责任：{stage.owner}</p>
                      <p className="mt-2 text-[10px] font-medium text-emerald-700">输出：{stage.output}</p>
                    </div>
                    {index < data.authoritativeContext.lifecycle.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <BasisCard text={data.authoritativeContext.regulation} />
              <BasisCard text={data.authoritativeContext.programMainline} />
              <BasisCard text={data.authoritativeContext.configurationManagement} />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <StagePanel title="状态鉴定" subtitle="性能符合性 → 小批量试生产" icon={<ShieldCheck className="h-4 w-4" />} summary={data.stateQualification.summary}>
              <ProcessStrip steps={data.stateQualification.process} />
              <div className="mt-3"><CriteriaList criteria={data.stateQualification.criteria} /></div>
              <div className="mt-3"><DecisionVocabulary title="状态鉴定审查结论（3 种）" values={data.stateQualification.decisionVocabulary} /></div>
            </StagePanel>

            <StagePanel title="作战试验" subtitle="近似实战/对抗 → 效能与适用性" icon={<Waypoints className="h-4 w-4" />} summary={data.operationalTest.summary}>
              <ProcessStrip steps={data.operationalTest.process} />
              <div className="mt-3"><CriteriaList criteria={data.operationalTest.criteria} /></div>
              <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-600">
                <p className="font-medium text-zinc-800">业务独立性约束</p>
                <p className="mt-1">试验单位与试验部队共同编制报告，但部队评价结论和装备使用意见建议应由试验部队独立提出。原型后续应把“组织身份 + 独立意见 + 联合签署”建成对象关系，而不是一个通用 reviewer 字段。</p>
              </div>
            </StagePanel>

            <StagePanel title="列装定型" subtitle="效能/适用性 + 生产交付 → 列装" icon={<Gavel className="h-4 w-4" />} summary={data.fieldingFinalization.summary}>
              <ProcessStrip steps={data.fieldingFinalization.process} />
              <div className="mt-3"><CriteriaList criteria={data.fieldingFinalization.criteria} /></div>
              <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-800">8 项专项评估</p>
                <div className="mt-2 space-y-1.5">
                  {data.fieldingFinalization.specialAssessments.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2">
                      <span className="text-[10px] leading-4 text-zinc-600">{item.label}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3"><DecisionVocabulary title="列装定型审查结论（锁定用语）" values={data.fieldingFinalization.decisionVocabulary} /></div>
            </StagePanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-red-600" /><h2 className="text-sm font-semibold text-zinc-900">Governed Actions · 提交资格</h2></div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">这里不是“按钮有没有权限”的 UI 判断，而是把业务前置条件作为 submission criteria 计算。未满足时系统必须明确解释原因。</p>
              <div className="mt-3 space-y-3">
                {data.actions.map((action) => (
                  <div key={action.apiName} className={cn('rounded-md border p-3', action.allowed ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40')}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900">{action.label}</p>
                          <Badge variant="outline" className="font-mono text-[9px]">{action.apiName}</Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">责任/审批主体：{action.requiredAuthority}</p>
                      </div>
                      <Button size="sm" disabled={!action.allowed}>{action.allowed ? '可提交' : '当前不可提交'}</Button>
                    </div>
                    {!action.allowed && (
                      <ul className="mt-2 space-y-1 border-t border-red-100 pt-2 text-[10px] leading-4 text-red-700/90">
                        {action.blockers.slice(0, 5).map((reason) => <li key={reason}>• {reason}</li>)}
                        {action.blockers.length > 5 && <li>• 另有 {action.blockers.length - 5} 项阻塞条件，需先完成相应业务对象建模/证据闭环。</li>}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-sky-600" /><h2 className="text-sm font-semibold text-zinc-900">数据采信入口</h2></div>
                <div className="mt-3 space-y-2">
                  {data.dataAcceptance.map((item) => (
                    <div key={item.id} className="rounded-md border border-zinc-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-medium leading-5 text-zinc-800">{item.label}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1.5 text-[10px] leading-4 text-zinc-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" /><h2 className="text-sm font-semibold">技术状态 ≠ 数字试验配置</h2></div>
                <p className="mt-2 text-[11px] leading-5 text-amber-900/80">{data.technicalState.warning}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.technicalState.currentModelBaselines.map((ref) => <Badge key={ref} variant="outline" className="font-mono text-[9px]">{ref}</Badge>)}
                  {data.technicalState.currentAssemblies.map((ref) => <Badge key={ref} variant="outline" className="font-mono text-[9px]">{ref}</Badge>)}
                </div>
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center gap-2 text-violet-900"><FileCheck2 className="h-4 w-4" /><h2 className="text-sm font-semibold">装备数字化模型双重治理</h2></div>
                <p className="mt-2 text-[11px] leading-5 text-violet-900/80">{data.digitalModel.stateQualificationRequirement}</p>
                <p className="mt-1 text-[11px] leading-5 text-violet-900/80">{data.digitalModel.finalizationRequirement}</p>
                <p className="mt-2 border-t border-violet-200 pt-2 text-[10px] leading-4 text-violet-700/80">{data.digitalModel.warning}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-zinc-100">
            <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-semibold">系统主故事：从“数字资产管理”收紧到“可执行的证据治理”</h2></div>
            <p className="mt-2 max-w-5xl text-[11px] leading-5 text-zinc-400">{data.governanceArchitecture.paperStory.problem}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <DarkPoint title="1 · Object" text="Case 给每个任务一个明确治理根，模型、试验、指标、报告和缺陷成为可寻址对象。" />
              <DarkPoint title="2 · Relation" text="typed relations 与 governance roles 把对象连接成可验证语义，而不是依赖页面或文件目录推断含义。" />
              <DarkPoint title="3 · Evidence" text="只有通过完整性、复用授权、适用域与变更检查的对象才进入可信证据集合。" />
              <DarkPoint title="4 · Decision" text="criteria 和 action blockers 只消费已准入证据，因此结论能追溯，也能在证据失效时自动回退。" />
            </div>
            <p className="mt-3 border-t border-zinc-800 pt-3 text-[10px] leading-5 text-zinc-500">研究边界：{data.governanceArchitecture.paperStory.claimBoundary}</p>
          </section>
        </>
      ) : null}
    </div>
  )
}

function ArchitectureLayerCard({ layer, index }: { layer: ArchitectureLayer; index: number }) {
  return (
    <div className="h-full flex-1 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-semibold text-white">{index + 1}</span>
        <p className="text-xs font-semibold text-zinc-900">{layer.label}</p>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-700">{layer.question}</p>
      <p className="mt-1 text-[10px] leading-4 text-zinc-500">{layer.responsibility}</p>
      <p className="mt-2 border-t border-zinc-200 pt-2 text-[9px] leading-4 text-red-600/80">Fail closed：{layer.failClosedRule}</p>
    </div>
  )
}

function RuntimeMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-end justify-between gap-2">
        <p className="text-[10px] text-zinc-500">{label}</p>
        <p className="font-mono text-lg font-semibold text-zinc-900">{value}</p>
      </div>
      <p className="mt-1 text-[9px] leading-4 text-zinc-400">{detail}</p>
    </div>
  )
}

function BasisCard({ text }: { text: string }) {
  return <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] leading-4 text-zinc-600">{text}</div>
}

function StagePanel({ title, subtitle, icon, summary, children }: { title: string; subtitle: string; icon: React.ReactNode; summary: Summary; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <div className="flex items-center gap-2 text-zinc-900">{icon}<div><h2 className="text-sm font-semibold">{title}</h2><p className="text-[10px] text-zinc-500">{subtitle}</p></div></div>
      <div className="mt-3"><Coverage summary={summary} /></div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function DarkPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs font-medium text-emerald-300">{title}</p>
      <p className="mt-1 text-[10px] leading-5 text-zinc-400">{text}</p>
    </div>
  )
}
