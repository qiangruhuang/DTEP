'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, measureStatusBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle2, CircleAlert, FileCheck2, Gavel, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Dataset = { name: string; path: string; domain: string; origin: string; qualityScore: number; rowCount: number }
type Workspace = { measures: Entry[]; events: Entry[]; models: Entry[]; evidenceGates: Entry[]; datasets: Dataset[] }

type GateState = '通过' | '有条件通过' | '阻塞'

type GateResult = {
  measure: Entry
  gate: GateState
  score: number
  blockers: string[]
  checks: { label: string; pass: boolean; note: string }[]
  modes: string[]
}

function modelAccredited(model: Entry) {
  const a = String(model.data.accreditation ?? (model.data.vvaStatus === '已确认' ? '已认可' : '待认可'))
  return a === '已认可' || a === '有条件认可'
}

function evidenceMode(event: Entry) {
  const l = Number(event.data.liveCount ?? 0)
  const v = Number(event.data.virtualCount ?? 0)
  const c = Number(event.data.constructiveCount ?? 0)
  if (l === 0 && v + c > 0) return '纯数字'
  if (l > 0 && v + c > 0) return 'LVC'
  if (l > 0) return '实测'
  return '未知'
}

export function EvidenceGateModule() {
  const [data, setData] = useState<Workspace | null>(null)
  const [selected, setSelected] = useState<string>('M-13')

  useEffect(() => {
    api<Workspace>('/api/decision-workspace').then(setData)
  }, [])

  const results = useMemo<GateResult[]>(() => {
    if (!data) return []
    const eventMap = new Map(data.events.map((e) => [e.pk, e]))
    const datasetQuality = new Map(data.datasets.map((d) => [d.path, d.qualityScore]))

    return data.measures.map((measure) => {
      const eventIds = Array.isArray(measure.data.coveredBy) ? measure.data.coveredBy : []
      const events = eventIds.map((id: string) => eventMap.get(id)).filter(Boolean) as Entry[]
      const modes = [...new Set(events.map(evidenceMode))]
      const produced = events.flatMap((e) => Array.isArray(e.data.produces) ? e.data.produces : [])
      const knownQuality = produced.map((p: string) => datasetQuality.get(p)).filter((q): q is number => typeof q === 'number')
      const qualityOk = knownQuality.length === 0 || knownQuality.every((q) => q >= 90)
      const completeOrAnalyzing = events.some((e) => ['已完成', '数据分析中'].includes(String(e.data.status)))
      const hasLiveAnchor = modes.includes('实测') || modes.includes('LVC')
      const syntheticUsed = modes.includes('纯数字') || modes.includes('LVC')
      const relatedModels = data.models.filter((m) => {
        const usedIn = Array.isArray(m.data.usedIn) ? m.data.usedIn : []
        return usedIn.some((id: string) => eventIds.includes(id))
      })
      const criticalModels = relatedModels.filter((m) => m.data.criticality === '关键' || syntheticUsed)
      const modelsOk = !syntheticUsed || criticalModels.every(modelAccredited)
      const intendedUseOk = !syntheticUsed || criticalModels.every((m) => Boolean(m.data.intendedUse))
      const domainOk = !syntheticUsed || criticalModels.every((m) => Boolean(m.data.validationDomain))
      const statisticalReady = measure.data.confidence != null || measure.data.status !== '统计中'
      const coverageOk = events.length > 0

      const checks = [
        { label: '试验覆盖', pass: coverageOk, note: coverageOk ? `${events.length} 个试验事件` : '尚无试验事件覆盖' },
        { label: '数据质量与血缘', pass: qualityOk, note: knownQuality.length ? `已知数据质量最低 ${Math.min(...knownQuality)} 分` : '当前由事件数据血缘支撑，质量分待补' },
        { label: '执行成熟度', pass: completeOrAnalyzing, note: completeOrAnalyzing ? '存在已完成/分析中事件' : '全部仍待执行或暂停' },
        { label: '模型预期用途', pass: intendedUseOk, note: syntheticUsed ? (intendedUseOk ? '关键模型已登记 Intended Use' : '存在未登记 Intended Use 的关键模型') : '不依赖关键数字模型' },
        { label: '模型验证域', pass: domainOk, note: syntheticUsed ? (domainOk ? '已登记 Validation Domain' : '验证域信息不完整') : '不适用' },
        { label: '模型认可', pass: modelsOk, note: syntheticUsed ? (modelsOk ? '关键模型认可状态满足当前原型规则' : '存在未认可关键模型') : '不适用' },
        { label: '实测锚点', pass: hasLiveAnchor || !syntheticUsed, note: hasLiveAnchor ? '有实测/LVC 锚点' : syntheticUsed ? '纯数字证据尚缺实测锚定' : '不适用' },
        { label: '统计可判定性', pass: statisticalReady, note: statisticalReady ? '已有置信信息或明确判定' : '仍在统计，暂不可冻结结论' },
      ]

      const blockers = checks.filter((c) => !c.pass).map((c) => c.label)
      const score = Math.round(checks.filter((c) => c.pass).length / checks.length * 100)
      const hardBlock = !coverageOk || !modelsOk || !intendedUseOk || !domainOk || (syntheticUsed && !hasLiveAnchor)
      const gate: GateState = hardBlock ? '阻塞' : blockers.length ? '有条件通过' : '通过'
      return { measure, gate, score, blockers, checks, modes }
    })
  }, [data])

  const current = results.find((r) => r.measure.pk === selected) ?? results[0]

  if (!data || !current) return <div className="space-y-4"><ModuleHeader title="Evidence Gate 证据门控" desc="加载中…" /><LoadingGrid rows={4} /></div>

  const passed = results.filter((r) => r.gate === '通过').length
  const conditional = results.filter((r) => r.gate === '有条件通过').length
  const blocked = results.filter((r) => r.gate === '阻塞').length

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Evidence Gate · 鉴定证据门控"
        desc="把“指标是否达标”和“证据是否足以支撑这个结论”分开管理。门控只判断证据可否进入正式鉴定，不替代效能/适用性/生存性本身的技术判定。"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="可进入结论" value={passed} tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label="有条件进入" value={conditional} tone="amber" icon={<CircleAlert className="h-5 w-5" />} />
        <SummaryCard label="证据阻塞" value={blocked} tone="red" icon={<XCircle className="h-5 w-5" />} />
        <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">门控规则</p><p className="mt-1 text-3xl font-semibold text-zinc-900">8</p><p className="mt-1 text-xs text-zinc-500">覆盖、数据、执行、VV&A、实测锚点、统计</p></div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3"><h2 className="text-sm font-semibold text-zinc-900">指标证据准入矩阵</h2><p className="text-xs text-zinc-500">点击任一指标查看阻塞原因。未达标指标也可以“证据通过”，这表示证据足以支撑“不达标”结论。</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-zinc-50"><tr>{['指标', '性能判定', '证据形态', '门控', '充分性', '阻塞项'].map((h) => <th key={h} className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>)}</tr></thead>
            <tbody>{results.map((r) => <tr key={r.measure.pk} onClick={() => setSelected(r.measure.pk)} className={cn('cursor-pointer hover:bg-zinc-50', r.measure.pk === current.measure.pk && 'bg-sky-50/50')}>
              <td className="border-b border-zinc-100 px-3 py-2.5"><p className="font-mono text-[10px] text-zinc-500">{r.measure.pk}</p><p className="text-xs font-medium text-zinc-800">{r.measure.title}</p></td>
              <td className="border-b border-zinc-100 px-3 py-2.5"><Badge variant="outline" className={cn('text-[10px]', measureStatusBadge[r.measure.data.status] ?? '')}>{r.measure.data.status}</Badge></td>
              <td className="border-b border-zinc-100 px-3 py-2.5"><div className="flex flex-wrap gap-1">{r.modes.length ? r.modes.map((m) => <Badge key={m} variant="secondary" className="text-[9px]">{m}</Badge>) : <span className="text-xs text-zinc-400">无</span>}</div></td>
              <td className="border-b border-zinc-100 px-3 py-2.5"><GateBadge state={r.gate} /></td>
              <td className="border-b border-zinc-100 px-3 py-2.5"><div className="flex items-center gap-2"><Progress value={r.score} className="h-1.5 w-20" /><span className="font-mono text-xs text-zinc-600">{r.score}%</span></div></td>
              <td className="border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-600">{r.blockers.length ? r.blockers.join('、') : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-zinc-500">{current.measure.pk}</p><h2 className="mt-1 text-base font-semibold text-zinc-900">{current.measure.title}</h2><p className="mt-1 text-xs text-zinc-500">性能状态：{current.measure.data.status} · 证据状态独立评估</p></div><GateBadge state={current.gate} /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {current.checks.map((check) => <div key={check.label} className={cn('rounded-md border p-3', check.pass ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30')}><div className="flex items-center gap-2">{check.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}<p className="text-xs font-medium text-zinc-900">{check.label}</p></div><p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">{check.note}</p></div>)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-zinc-700" /><h3 className="text-sm font-semibold text-zinc-900">门控结论</h3></div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600">{current.gate === '通过' ? '当前证据满足原型准入规则，可进入正式鉴定结论编制；仍需保留数据、模型和场景版本血缘。' : current.gate === '有条件通过' ? '证据基本可用，但存在非关键缺口，应在报告中显式披露限制并完成补充分析。' : '存在硬性证据缺口，不应把当前结果作为正式鉴定结论的唯一依据。'}</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4">
            <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-sky-700" /><h3 className="text-sm font-semibold text-sky-900">规则边界</h3></div>
            <p className="mt-2 text-xs leading-relaxed text-sky-800">当前 8 条规则是原型业务规则，用于验证软件机制。正式部署时应由本单位试验鉴定规程、专业试验大纲、统计设计和模型认可制度配置，不能把本原型分数直接当作鉴定标准。</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">建议固化的 Evidence Package</h2></div>
        <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
          {['试验问题/指标与判据', '试验设计与任务线程覆盖', '原始数据、处理代码与数据血缘', '场景/威胁/环境配置基线', '模型版本、Intended Use 与验证域', 'VV&A/认可材料与实测验证锚点', '统计结果、不确定性与敏感性', '缺陷、限制、审批与结论版本'].map((x) => <div key={x} className="rounded-md border border-zinc-200 bg-zinc-50/40 p-2.5">{x}</div>)}
        </div>
      </section>
    </div>
  )
}

function GateBadge({ state }: { state: GateState }) {
  const cls = state === '通过' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : state === '有条件通过' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'
  return <Badge variant="outline" className={cn('text-[10px]', cls)}>{state}</Badge>
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: number; tone: 'emerald' | 'amber' | 'red'; icon: ReactNode }) {
  const style = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : tone === 'amber' ? 'border-amber-200 bg-amber-50/50 text-amber-900' : 'border-red-200 bg-red-50/50 text-red-900'
  return <div className={cn('rounded-lg border p-4', style)}><div className="flex items-center justify-between"><p className="text-xs">{label}</p>{icon}</div><p className="mt-2 text-3xl font-semibold">{value}</p></div>
}
