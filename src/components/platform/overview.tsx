'use client'

// 试验总览：任务/事件/指标/缺陷 KPI + 判读管道状态 + 活跃告警 + 平台动态
import { useEffect, useState } from 'react'
import { api, fmtNum, fmtTime, ModuleKey, alertSeverityBadge, statusColor, measureStatusBadge } from '@/lib/platform'
import { StatCard, StatusDot, ModuleHeader, LoadingGrid, StatusPill } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Radio, Table, Boxes, Zap, Bell, GitBranch, Bot, RefreshCw, Target, ClipboardList, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Overview = {
  stats: {
    programs: number; activeEvents: number; pendingEvents: number
    resources: number; onlineResources: number
    datasets: number; totalRows: number
    pipelines: number; objectTypes: number; totalObjects: number; actionTypes: number
    automations: number; openAlerts: number
    measuresTotal: number; measuresMet: number; measuresPending: number; openDeficiencies: number
    lastBuildStatus: string
  }
  measures: { pk: string; title: string; data: Record<string, any> }[]
  events: { pk: string; title: string; data: Record<string, any> }[]
  pipelines: { id: string; name: string; status: string; schedule: string; lastBuildStatus: string; lastBuildAt: string | null; recentBuilds: { status: string; startedAt: string; durationSec: number; rowsProcessed: number }[] }[]
  activities: { id: string; actor: string; module: string; message: string; createdAt: string }[]
  alerts: { id: string; runId: string; severity: string; message: string; status: string; raisedAt: string }[]
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  'Data Resource': <Radio className="h-3.5 w-3.5" />,
  'Pipeline': <GitBranch className="h-3.5 w-3.5" />,
  'Ontology': <Boxes className="h-3.5 w-3.5" />,
  'Workshop': <Target className="h-3.5 w-3.5" />,
  'Automate': <Zap className="h-3.5 w-3.5" />,
  'Time Series': <Bell className="h-3.5 w-3.5" />,
  'AIP': <Bot className="h-3.5 w-3.5" />,
}

export function OverviewModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setData(await api<Overview>('/api/overview'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const quickLinks: { key: ModuleKey; label: string; desc: string }[] = [
    { key: 'pipelines', label: '判读管道', desc: '数据判读流水线' },
    { key: 'ontology', label: '试验本体', desc: '任务·指标·事件' },
    { key: 'workshop', label: '试验指挥台', desc: '指挥与写回' },
    { key: 'aip', label: '鉴定助手', desc: '接地式 AI 问答' },
  ]

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="试验总览"
        desc="数字化试验鉴定驾驶舱：试验任务、指标体系、试验事件、缺陷归零与试验资源的全局态势，数据均为后端实时读取。"
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
        }
      />

      {loading && !data ? (
        <LoadingGrid rows={4} />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="在研试验任务"
              value={data.stats.programs}
              sub={`进行中事件 ${data.stats.activeEvents} · 待执行 ${data.stats.pendingEvents}`}
              icon={<Target className="h-4 w-4" />} accent="emerald"
            />
            <StatCard
              label="指标达成"
              value={`${data.stats.measuresMet}/${data.stats.measuresTotal}`}
              sub={`统计中 ${data.stats.measuresPending} 项 · 缺口 ${data.stats.measuresTotal - data.stats.measuresMet - data.stats.measuresPending} 项`}
              icon={<Boxes className="h-4 w-4" />} accent={data.stats.measuresMet >= data.stats.measuresTotal - data.stats.measuresPending ? 'emerald' : 'amber'}
            />
            <StatCard
              label="未闭环缺陷"
              value={data.stats.openDeficiencies}
              sub="按 I/II/III 类分级归零管理"
              icon={<AlertTriangle className="h-4 w-4" />} accent={data.stats.openDeficiencies > 2 ? 'red' : 'amber'}
            />
            <StatCard
              label="待处理告警"
              value={data.stats.openAlerts}
              sub={`试验资源在线 ${data.stats.onlineResources}/${data.stats.resources}`}
              icon={<Bell className="h-4 w-4" />} accent={data.stats.openAlerts > 0 ? 'red' : 'emerald'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 判读管道 + 指标 */}
            <section className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2" aria-label="判读管道状态">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">判读管道状态</h2>
                <StatusPill status={data.stats.lastBuildStatus} label={`最近运行：${data.stats.lastBuildStatus === 'succeeded' ? '成功' : data.stats.lastBuildStatus === 'failed' ? '失败' : '进行中'}`} />
              </div>
              {data.pipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onNavigate('pipelines')}
                  className="mb-2 flex w-full items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.schedule} · 上次运行 {fmtTime(p.lastBuildAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.recentBuilds.map((b, i) => (
                      <span
                        key={i}
                        title={`${b.status} · ${b.rowsProcessed.toLocaleString()} 点 · ${b.durationSec}s`}
                        className={cn('h-6 w-1.5 rounded-full', statusColor[b.status])}
                      />
                    ))}
                  </div>
                </button>
              ))}

              {/* 鉴定指标速览 */}
              <h2 className="mb-2 mt-4 text-sm font-semibold text-zinc-900">鉴定指标速览</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.measures.map((m) => (
                  <div key={m.pk} className="rounded-md border border-zinc-100 bg-zinc-50/60 p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-mono text-[10px] text-zinc-500">{m.pk}</p>
                      <Badge variant="outline" className={cn('text-[9px]', measureStatusBadge[m.data.status] ?? '')}>{m.data.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-zinc-800">{m.data.name}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      阈值 {m.data.threshold}{m.data.unit ?? ''} · 实测 {m.data.measured ?? '—'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickLinks.map((q) => (
                  <Button key={q.key} size="sm" variant="secondary" className="h-8" onClick={() => onNavigate(q.key)}>
                    {q.label}
                    <span className="ml-1.5 text-[10px] text-zinc-400">{q.desc}</span>
                  </Button>
                ))}
              </div>
            </section>

            {/* 活跃告警 */}
            <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="活跃试验告警">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">试验告警</h2>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNavigate('timeseries')}>
                  查看遥测
                </Button>
              </div>
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {data.alerts.map((a) => (
                  <li key={a.id} className="rounded-md border border-zinc-200 p-2.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px]', alertSeverityBadge[a.severity])}>
                        {a.severity === 'critical' ? '紧急' : a.severity === 'warning' ? '警告' : '提示'}
                      </Badge>
                      <span className="font-mono text-xs text-zinc-700">{a.runId}</span>
                      <span className="ml-auto text-[10px] text-zinc-400">{fmtTime(a.raisedAt)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-600">{a.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 平台动态 */}
          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="平台动态">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">试验鉴定动态</h2>
            <ul className="space-y-0">
              {data.activities.map((e, i) => (
                <li key={e.id} className={cn('flex items-start gap-3 py-2', i !== data.activities.length - 1 && 'border-b border-zinc-100')}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
                    {MODULE_ICONS[e.module] ?? <ClipboardList className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-zinc-700">{e.message}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{e.actor} · {e.module} · {fmtTime(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}
