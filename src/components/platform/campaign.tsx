'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, eventStatusBadge, measureStatusBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Activity, Network, ShieldCheck, Target, Workflow } from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Overview = { measures: Entry[]; events: Entry[] }

const PHASE_ORDER = ['DT', 'OT', 'LFT', 'DOT']
const PHASE_META: Record<string, { label: string; desc: string }> = {
  DT: { label: '研制试验 DT&E', desc: '技术性能、集成、可靠性与风险收敛' },
  OT: { label: '作战试验 OT&E', desc: '任务环境中的作战效能与适用性' },
  LFT: { label: '实弹试验 LFT&E', desc: '杀伤力、生存性与实战毁伤效应' },
  DOT: { label: '数字化作战试验', desc: '高维任务空间探索、蒙特卡洛与极端场景补充证据' },
}

function evidenceMode(e: Entry) {
  const l = Number(e.data.liveCount ?? 0)
  const v = Number(e.data.virtualCount ?? 0)
  const c = Number(e.data.constructiveCount ?? 0)
  if (l === 0 && v + c > 0) return '纯数字'
  if (l > 0 && v + c > 0) return 'LVC混合'
  if (l > 0) return '实装/实测'
  return '未定义'
}

function evidenceStrength(measure: Entry, events: Entry[]) {
  const covered = new Set<string>(measure.data.coveredBy ?? [])
  const linked = events.filter((e) => covered.has(e.pk))
  const complete = linked.filter((e) => e.data.status === '已完成' || e.data.status === '数据分析中')
  const hasLive = linked.some((e) => Number(e.data.liveCount ?? 0) > 0)
  const hasDigital = linked.some((e) => Number(e.data.virtualCount ?? 0) + Number(e.data.constructiveCount ?? 0) > 0)
  const confidence = Number(measure.data.confidence ?? 0)
  let score = Math.min(45, complete.length * 22) + (hasLive ? 20 : 0) + (hasDigital ? 15 : 0) + Math.round(confidence * 20)
  if (measure.data.status === '未达标') score = Math.max(score, 70)
  return Math.min(100, score)
}

export function CampaignModule() {
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    api<Overview>('/api/overview').then(setData)
  }, [])

  const analysis = useMemo(() => {
    if (!data) return null
    const events = data.events
    const measures = data.measures
    const eventMap = new Map(events.map((e) => [e.pk, e]))
    const rows = measures.map((m) => {
      const covered = (m.data.coveredBy ?? []).map((pk: string) => eventMap.get(pk)).filter(Boolean) as Entry[]
      return { measure: m, covered, strength: evidenceStrength(m, events) }
    })
    const uncovered = rows.filter((r) => r.covered.length === 0)
    const weak = rows.filter((r) => r.covered.length > 0 && r.strength < 60)
    const pending = rows.filter((r) => r.measure.data.status === '统计中')
    const failed = rows.filter((r) => r.measure.data.status === '未达标')
    const digitalOnly = rows.filter((r) => r.covered.length > 0 && r.covered.every((e) => Number(e.data.liveCount ?? 0) === 0))
    return { rows, uncovered, weak, pending, failed, digitalOnly }
  }, [data])

  if (!data || !analysis) return <div className="space-y-4"><ModuleHeader title="试验策划与证据矩阵" desc="加载中…" /><LoadingGrid rows={5} /></div>

  const evidenceReady = analysis.rows.filter((r) => r.strength >= 70 && r.measure.data.status !== '统计中').length
  const readiness = Math.round((evidenceReady / Math.max(1, analysis.rows.length)) * 100)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="试验策划与证据矩阵"
        desc="以鉴定决策为牵引，将能力/指标、试验事件、LVC 构成、数据与证据强度组织为一条连续 T&E 主线。用于回答：还缺什么证据、下一场试验为什么做、哪些结论只能由数字模型支撑。"
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">鉴定证据就绪度</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-900">{readiness}%</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <Progress value={readiness} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-zinc-500">{evidenceReady}/{analysis.rows.length} 项指标已形成较强且可判定的证据包。</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs text-amber-700">待补强证据</p>
          <p className="mt-1 text-3xl font-semibold text-amber-900">{analysis.weak.length + analysis.uncovered.length}</p>
          <p className="mt-2 text-xs text-amber-700">覆盖不足或证据强度偏低</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
          <p className="text-xs text-red-700">已暴露能力风险</p>
          <p className="mt-1 text-3xl font-semibold text-red-900">{analysis.failed.length}</p>
          <p className="mt-2 text-xs text-red-700">指标未达标，应进入整改/复试闭环</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-zinc-700" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">T&E Continuum · 试验事件编排</h2>
            <p className="text-xs text-zinc-500">研制试验、作战试验、实弹试验与纯数字化试验共享同一任务/指标/证据主线，而不是彼此孤立。</p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {PHASE_ORDER.map((phase) => {
            const events = data.events.filter((e) => e.data.phase === phase)
            return (
              <div key={phase} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
                <div className="mb-3 border-b border-zinc-200 pb-2">
                  <p className="text-xs font-semibold text-zinc-900">{PHASE_META[phase].label}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{PHASE_META[phase].desc}</p>
                </div>
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.pk} className="rounded-md border border-zinc-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-[10px] text-zinc-500">{e.pk}</p>
                          <p className="mt-0.5 text-xs font-medium leading-snug text-zinc-800">{e.title}</p>
                        </div>
                        <Badge variant="outline" className={cn('shrink-0 text-[9px]', eventStatusBadge[e.data.status] ?? '')}>{e.data.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{evidenceMode(e)}</span>
                        <span className="font-mono">{e.data.liveCount ?? 0}L/{e.data.virtualCount ?? 0}V/{e.data.constructiveCount ?? 0}C</span>
                      </div>
                      <Progress value={Number(e.data.progress ?? 0)} className="mt-2 h-1" />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">指标—事件—证据覆盖矩阵</h2>
            <p className="text-xs text-zinc-500">证据强度是原型中的启发式演示值；正式系统应替换为经批准的证据充分性规则、统计功效与模型可信度门槛。</p>
          </div>
          <div className="flex gap-1.5 text-[10px]">
            <Badge variant="outline">统计中 {analysis.pending.length}</Badge>
            <Badge variant="outline">纯数字证据 {analysis.digitalOnly.length}</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {['鉴定指标', '判定', '阈值 / 实测', '覆盖试验事件', '证据形态', '证据强度', '下一步'].map((h) => (
                  <th key={h} className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map(({ measure: m, covered, strength }) => {
                const next = covered.length === 0
                  ? '补充试验设计'
                  : m.data.status === '未达标'
                    ? '整改后复试 / 风险评估'
                    : m.data.status === '统计中'
                      ? '完成分析并固化证据包'
                      : strength < 70
                        ? '增加异质场景或实测交叉验证'
                        : '证据可进入鉴定结论'
                return (
                  <tr key={m.pk} className="hover:bg-zinc-50/60">
                    <td className="border-b border-zinc-100 px-3 py-2.5">
                      <p className="font-mono text-[10px] text-zinc-500">{m.pk}</p>
                      <p className="text-xs font-medium text-zinc-800">{m.title}</p>
                      <p className="text-[10px] text-zinc-400">{m.data.category}</p>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2.5"><Badge variant="outline" className={cn('text-[10px]', measureStatusBadge[m.data.status] ?? '')}>{m.data.status}</Badge></td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 font-mono text-xs text-zinc-600">{m.data.threshold ?? '—'}{m.data.unit ?? ''} / {m.data.measured ?? '—'}{m.data.unit ?? ''}</td>
                    <td className="border-b border-zinc-100 px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{covered.length ? covered.map((e) => <Badge key={e.pk} variant="secondary" className="font-mono text-[9px]">{e.pk}</Badge>) : <span className="text-xs text-red-600">未覆盖</span>}</div>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-600">{covered.length ? [...new Set(covered.map(evidenceMode))].join(' + ') : '—'}</td>
                    <td className="border-b border-zinc-100 px-3 py-2.5">
                      <div className="flex min-w-32 items-center gap-2"><Progress value={strength} className="h-1.5" /><span className="w-8 font-mono text-[10px] text-zinc-500">{strength}</span></div>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-600">{next}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2"><Target className="h-4 w-4" /><h3 className="text-sm font-semibold">决策问题牵引</h3></div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">每个试验事件必须回答一个明确的鉴定问题，并反向关联指标、任务线程、威胁/环境条件和所需证据，而不是以“有场地就做试验”为起点。</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2"><Network className="h-4 w-4" /><h3 className="text-sm font-semibold">LVC / JME 资源编排</h3></div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">真实装备、半实物台架、构建兵力、威胁模拟和跨场区资源都作为可复用对象接入，形成面向任务环境的可组合试验配置。</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4" /><h3 className="text-sm font-semibold">证据持续累积</h3></div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">DT、OT、LFT 与数字化试验数据进入同一证据图谱；模型证据只有在版本、VV&A 状态和适用域可追溯时才能参与正式鉴定。</p>
        </div>
      </section>
    </div>
  )
}
