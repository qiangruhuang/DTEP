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
type Snapshot = {
  version: string
  rootObject: { pk: string; title: string; status: string } | null
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
        desc="把中国装备试验鉴定的流程、审查标准、技术状态、数据采信、数字化模型与审批权限绑定到同一 Ontology Case：不是再做一张看板，而是让系统解释当前证据能支撑什么、还缺什么、为什么某个业务动作现在不能提交。"
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

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <PatternCard icon={<Waypoints className="h-4 w-4" />} title="Object View" text="一个 CASE 聚合全部对象与关系" />
              <PatternCard icon={<GitBranch className="h-4 w-4" />} title="Function Logic" text="服务端派生业务门控与缺口" />
              <PatternCard icon={<Gavel className="h-4 w-4" />} title="Action Criteria" text="动作是否可提交 + 明确 blocker" />
              <PatternCard icon={<LockKeyhole className="h-4 w-4" />} title="Security & Lineage" text="OIDC 身份 + 证据引用 + 决策留痕" />
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
            <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-semibold">这次升级解决的不是“显示更多”，而是“决策语义不再丢失”</h2></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <DarkPoint title="文件 → 对象" text="报告、底数、模型、缺陷、审查意见不再只是附件，而应成为可链接、可查询、可授权的业务对象。" />
              <DarkPoint title="流程 → 动作" text="申请、提交审查、审批、备案、数据采信等动作必须由对象状态和角色共同约束，并留下决策日志。" />
              <DarkPoint title="结论 → 血缘" text="任何鉴定结论都应能反查到适用标准、技术状态、模型版本、数据采信、试验事件、指标和责任主体。" />
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

function PatternCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-1.5 text-zinc-800">{icon}<p className="text-xs font-medium">{title}</p></div>
      <p className="mt-1 text-[10px] leading-4 text-zinc-500">{text}</p>
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
