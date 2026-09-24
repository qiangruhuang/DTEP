'use client'

// 评估分析：多图表联动分析（基于试验本体对象集：指标/缺陷/事件/模型）
import { useEffect, useMemo, useState } from 'react'
import { api, measureStatusBadge, severityColor, eventStatusBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend, LineChart, Line, ReferenceLine,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Obj = { pk: string; title: string; data: Record<string, any> }

// 下行指标（越小越好）单位
const LOWER_BETTER_UNITS = new Set(['m', 'min', 's'])

export function ContourModule() {
  const [measures, setMeasures] = useState<Obj[]>([])
  const [deficiencies, setDeficiencies] = useState<Obj[]>([])
  const [events, setEvents] = useState<Obj[]>([])
  const [models, setModels] = useState<Obj[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [ms, df, ev, md] = await Promise.all([
        api<{ objects: Obj[] }>('/api/objects?type=Measure'),
        api<{ objects: Obj[] }>('/api/objects?type=Deficiency'),
        api<{ objects: Obj[] }>('/api/objects?type=TestEvent'),
        api<{ objects: Obj[] }>('/api/objects?type=ModelAsset'),
      ])
      setMeasures(ms.objects)
      setDeficiencies(df.objects)
      setEvents(ev.objects)
      setModels(md.objects)
      setLoading(false)
    })()
  }, [])

  // 指标达成率（阈值=100%，越高越好；NRMSE 类模型一致性指标为下行）
  const measureAchievement = useMemo(() => {
    return measures
      .filter((m) => typeof m.data.measured === 'number')
      .map((m) => {
        const lower = LOWER_BETTER_UNITS.has(String(m.data.unit ?? '')) || String(m.data.name ?? '').includes('NRMSE')
        const ratio = lower
          ? (m.data.threshold / m.data.measured) * 100
          : (m.data.measured / m.data.threshold) * 100
        return {
          name: m.pk,
          full: m.data.name,
          ratio: Math.round(ratio * 10) / 10,
          status: m.data.status,
          measured: m.data.measured,
          threshold: m.data.threshold,
          unit: m.data.unit ?? '',
        }
      })
  }, [measures])

  // 试验性质构成（DT 研制 / OT 作战 / LFT 实弹 / DOT 纯数字化）
  const PHASE_LABELS: Record<string, string> = {
    DT: '研制试验 DT', OT: '作战试验 OT', LFT: '实弹试验 LFT&E', DOT: '纯数字化 DOT',
  }
  const phaseDist = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of events) m[e.data.phase] = (m[e.data.phase] ?? 0) + 1
    return Object.entries(m).map(([phase, value]) => ({ name: PHASE_LABELS[phase] ?? phase, value }))
  }, [events])

  // 数字孪生同步率（纯数字化试验支撑度）
  const twinSync = useMemo(() =>
    models
      .filter((x) => typeof x.data.syncRate === 'number')
      .map((x) => ({ name: x.pk, full: x.data.name, sync: x.data.syncRate, vva: x.data.vvaStatus })),
    [models])

  const measureStatusDist = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of measures) m[x.data.status] = (m[x.data.status] ?? 0) + 1
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [measures])

  const lvcTotal = useMemo(() => {
    const live = events.reduce((s, e) => s + (e.data.liveCount ?? 0), 0)
    const virtual = events.reduce((s, e) => s + (e.data.virtualCount ?? 0), 0)
    const constructive = events.reduce((s, e) => s + (e.data.constructiveCount ?? 0), 0)
    return [
      { name: '真实 Live', value: live },
      { name: '虚拟 Virtual', value: virtual },
      { name: '构建 Constructive', value: constructive },
    ]
  }, [events])

  const defBySeverity = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of deficiencies) m[d.data.severity] = (m[d.data.severity] ?? 0) + 1
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [deficiencies])

  const defTrend = useMemo(() => {
    // 模拟：按缺陷发现时间（D+N）排序的累计曲线
    const items = deficiencies
      .map((d) => String(d.data.raisedAt ?? '').replace('D+', ''))
      .filter((v) => v !== '' && !isNaN(Number(v)))
      .map(Number)
      .sort((a, b) => a - b)
    let acc = 0
    return items.map((d) => {
      acc++
      return { day: `D+${d}`, count: acc }
    })
  }, [deficiencies])

  const vvaDist = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of models) m[x.data.vvaStatus] = (m[x.data.vvaStatus] ?? 0) + 1
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [models])

  if (loading) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="评估分析" desc="加载中…" />
        <LoadingGrid />
      </div>
    )
  }

  const STATUS_COLORS: Record<string, string> = { '达标': '#10b981', '未达标': '#ef4444', '统计中': '#f59e0b' }
  const LVC_COLORS: Record<string, string> = { '真实 Live': '#059669', '虚拟 Virtual': '#7c3aed', '构建 Constructive': '#0ea5e9' }
  const DEF_COLORS: Record<string, string> = { 'I类': '#ef4444', 'II类': '#f59e0b', 'III类': '#0ea5e9' }
  const VVA_COLORS: Record<string, string> = { '已确认': '#10b981', '验证中': '#f59e0b', '校核中': '#0ea5e9' }
  const PHASE_COLORS: Record<string, string> = { '研制试验 DT': '#0891b2', '作战试验 OT': '#059669', '实弹试验 LFT&E': '#dc2626', '纯数字化 DOT': '#7c3aed' }
  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="评估分析"
        desc="评估分析面板：全部图表直接绑定试验本体对象集（Measure / Deficiency / TestEvent / ModelAsset），覆盖 DT/OT/LFT 实弹/纯数字化试验，随试验数据实时刷新，支撑鉴定结论形成。"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 指标达成率 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">鉴定指标达成率（阈值 = 100%）</h2>
          <p className="mb-3 text-xs text-zinc-400">柱状图 · 实测值相对阈值的达成率（下行指标已归一）· 虚线为阈值基准</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={measureAchievement} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}%`, '达成率']}
                  labelFormatter={(n) => {
                    const m = measureAchievement.find((x) => x.name === n)
                    return m ? `${m.full}（实测 ${m.measured}${m.unit} / 阈值 ${m.threshold}${m.unit}）` : String(n)
                  }}
                />
                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="6 3" />
                <Bar dataKey="ratio" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {measureAchievement.map((d, i) => (
                    <Cell key={i} fill={d.ratio >= 100 ? '#10b981' : d.ratio >= 90 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 指标状态构成 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">鉴定指标状态构成</h2>
          <p className="mb-3 text-xs text-zinc-400">饼图 · GROUP BY status（共 {measures.length} 项指标）</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={measureStatusDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3} label={{ fontSize: 11 }}>
                  {measureStatusDist.map((d, i) => (
                    <Cell key={i} fill={STATUS_COLORS[d.name] ?? '#a1a1aa'} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* LVC 构成 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">LVC 实体构成（全事件合计）</h2>
          <p className="mb-3 text-xs text-zinc-400">饼图 · Live/Virtual/Constructive 聚合 · 分布式联合试验环境（纯数字化事件为 0L）</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={lvcTotal} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3} label={{ fontSize: 11 }}>
                  {lvcTotal.map((d, i) => (
                    <Cell key={i} fill={LVC_COLORS[d.name] ?? '#a1a1aa'} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 试验性质构成 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">试验性质构成（DT/OT/LFT/纯数字化）</h2>
          <p className="mb-3 text-xs text-zinc-400">柱状图 · GROUP BY phase（共 {events.length} 个事件 · LFT&E 参照 DoDI 5000.98）</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseDist} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} 个`, '事件数']} />
                <Bar dataKey="value" name="事件数" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {phaseDist.map((d, i) => (
                    <Cell key={i} fill={PHASE_COLORS[d.name] ?? '#52525b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 数字孪生同步率 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">数字孪生同步率（纯数字化试验支撑度）</h2>
          <p className="mb-3 text-xs text-zinc-400">柱状图 · 孪生体同步率（≥90% 优 · 与 VV&A 状态联动）</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={twinSync} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v}%`, '同步率']}
                  labelFormatter={(n) => { const x = twinSync.find((t) => t.name === n); return x ? `${x.full}（VV&A：${x.vva}）` : String(n) }}
                />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="6 3" />
                <Bar dataKey="sync" name="同步率" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {twinSync.map((d, i) => (
                    <Cell key={i} fill={d.sync >= 90 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 缺陷等级 */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">试验缺陷等级分布</h2>
          <p className="mb-3 text-xs text-zinc-400">柱状图 · GROUP BY severity（共 {deficiencies.length} 项，归零管理）</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defBySeverity} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} 项`, '缺陷数']} />
                <Bar dataKey="value" name="缺陷数" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {defBySeverity.map((d, i) => (
                    <Cell key={i} fill={DEF_COLORS[d.name] ?? '#52525b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <Tabs defaultValue="detail">
        <TabsList className="h-8">
          <TabsTrigger value="detail" className="text-xs"><BarChart3 className="mr-1 h-3.5 w-3.5" />指标与模型明细</TabsTrigger>
        </TabsList>
        <TabsContent value="detail" className="mt-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 缺陷累计趋势 */}
            <section className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">缺陷发现累计趋势</h2>
              <p className="mb-3 text-xs text-zinc-400">折线图 · 按 D+N 试验日累计（发现→归零闭环跟踪）</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={defTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} 项`, '累计缺陷']} />
                    <Line type="monotone" dataKey="count" name="累计缺陷" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* VV&A 状态 */}
            <section className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">数字模型 VV&A 状态（M&S 可信度）</h2>
              <p className="mb-3 text-xs text-zinc-400">饼图 · 校核/验证/确认状态（参照 DoDM 5000.102 M&S VV&A）</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vvaDist} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={3} label={{ fontSize: 11 }}>
                      {vvaDist.map((d, i) => (
                        <Cell key={i} fill={VVA_COLORS[d.name] ?? '#a1a1aa'} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      {/* 指标明细摘要 */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">鉴定指标明细</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {measures.map((m) => (
            <div key={m.pk} className="rounded-md border border-zinc-100 bg-zinc-50/60 p-2.5">
              <p className="font-mono text-[10px] text-zinc-500">{m.pk}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-zinc-800" title={m.data.name}>{m.data.name}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">
                  {m.data.measured ?? '—'}<span className="text-[9px] text-zinc-400">/{m.data.threshold}{m.data.unit ?? ''}</span>
                </span>
                <Badge variant="outline" className={cn('text-[9px]', measureStatusBadge[m.data.status] ?? '')}>{m.data.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
