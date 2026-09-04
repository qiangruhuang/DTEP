'use client'

// 试验指挥台：基于试验本体的操作型应用（LVC 态势 + 事件执行 + 指令/归零/报告动作写回）
import { useEffect, useMemo, useState } from 'react'
import { api, post, eventStatusBadge, severityColor, measureStatusBadge } from '@/lib/platform'
import { ModuleHeader, StatCard, StatusPill } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Crosshair, ShieldAlert, FileCheck2, CalendarClock, Zap, Loader2, CheckCircle2, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

type TEvent = { id: string; pk: string; title: string; data: Record<string, any> }
type TDef = { id: string; pk: string; title: string; data: Record<string, any> }
type TReport = { id: string; pk: string; title: string; data: Record<string, any> }
type ActionType = {
  id: string; apiName: string; displayName: string; appliesTo: string
  parameters: { name: string; type: string; required: boolean; label: string; options?: string[] }[]
}

// 试验性质筛选标签（DT 研制 / OT 作战 / LFT 实弹 / DOT 纯数字化）
const PHASE_FILTER_LABEL: Record<string, string> = {
  all: '全部',
  DT: '研制试验',
  OT: '作战试验',
  LFT: '实弹试验',
  DOT: '纯数字化',
}
const PHASE_LABEL: Record<string, string> = {
  DT: 'DT · 研制试验',
  OT: 'OT · 作战试验',
  LFT: 'LFT · 实弹试验',
  DOT: 'DOT · 纯数字化OT&E',
}

export function WorkshopModule() {
  const { toast } = useToast()
  const [events, setEvents] = useState<TEvent[]>([])
  const [deficiencies, setDeficiencies] = useState<TDef[]>([])
  const [reports, setReports] = useState<TReport[]>([])
  const [actionTypes, setActionTypes] = useState<ActionType[]>([])
  const [ready, setReady] = useState(false)

  // 应用变量（模拟 Workshop 变量绑定）
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'DT' | 'OT' | 'LFT' | 'DOT'>('all')
  const [selectedPk, setSelectedPk] = useState<string | null>(null)

  // 动作表单
  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [actionTarget, setActionTarget] = useState<string | null>(null)
  const [actionTargetTitle, setActionTargetTitle] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  const load = async () => {
    const [ev, df, rp, at] = await Promise.all([
      api<{ objects: TEvent[] }>('/api/objects?type=TestEvent'),
      api<{ objects: TDef[] }>('/api/objects?type=Deficiency'),
      api<{ objects: TReport[] }>('/api/objects?type=Report'),
      api<{ actionTypes: ActionType[] }>('/api/ontology'),
    ])
    setEvents(ev.objects)
    setDeficiencies(df.objects)
    setReports(rp.objects)
    setActionTypes(at.actionTypes)
    setReady(true)
  }
  useEffect(() => { load() }, [])

  // 变量联动：试验性质筛选
  const filtered = useMemo(
    () => (phaseFilter === 'all' ? events : events.filter((e) => e.data.phase === phaseFilter)),
    [events, phaseFilter],
  )
  const selected = events.find((e) => e.pk === selectedPk) ?? null

  const activeCount = events.filter((e) => ['执行中', '数据分析中'].includes(e.data.status)).length
  const openDefs = deficiencies.filter((d) => d.data.status !== '已闭环').length
  const lvcTotal = events.reduce((s, e) => s + (e.data.constructiveCount ?? 0) + (e.data.virtualCount ?? 0) + (e.data.liveCount ?? 0), 0)

  const byEvent = useMemo(
    () => events.map((e) => ({
      name: e.pk.replace('TE-25-', 'TE'),
      live: e.data.liveCount ?? 0,
      virtual: e.data.virtualCount ?? 0,
      constructive: e.data.constructiveCount ?? 0,
    })),
    [events],
  )

  const openAction = (at: ActionType, pk: string, title: string) => {
    setActionType(at)
    setActionTarget(pk)
    setActionTargetTitle(title)
    setResultMsg('')
    const init: Record<string, string> = {}
    at.parameters.forEach((p) => {
      if (p.options && p.options.length > 0) {
        init[p.name] = p.options[0]
      } else if (at.apiName === 'issueTestOrder' && p.name === 'orderNo') {
        init[p.name] = `TL-${Date.now().toString().slice(-6)}`
      } else {
        init[p.name] = ''
      }
    })
    setForm(init)
    setActionOpen(true)
  }

  const executeAction = async () => {
    if (!actionType || !actionTarget) return
    setRunning(true)
    try {
      const d = await post<{ message: string }>('/api/actions', {
        actionTypeId: actionType.id,
        objectPk: actionTarget,
        parameters: form,
        performedBy: '试验总师 · 周衡',
      })
      setResultMsg(d.message)
      toast({ title: '动作执行成功', description: d.message })
      await load()
    } catch (e) {
      toast({ title: '动作执行失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="试验指挥台" desc="加载试验本体数据…" />
        <div className="h-56 animate-pulse rounded-lg bg-zinc-200/60" />
      </div>
    )
  }

  const eventActions = actionTypes.filter((a) => a.appliesTo === 'TestEvent')
  const defActions = actionTypes.filter((a) => a.appliesTo === 'Deficiency' && a.apiName === 'closeDeficiency')
  const reportActions = actionTypes.filter((a) => a.appliesTo === 'Report')

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="试验指挥台"
        desc="Workshop 操作型应用：绑定试验事件/缺陷/报告对象集，DT/OT/LFT 实弹/纯数字化（DOT）四类事件联动指挥，试验指令、实弹射击授权、缺陷归零、报告提交直接写回试验档案。"
        actions={
          <div className="flex flex-wrap gap-1.5">
            {eventActions.map((at) => (
              <Button key={at.id} size="sm" variant="outline" className="h-8" disabled={!selected} onClick={() => selected && openAction(at, selected.pk, selected.title)}>
                <Zap className="mr-1 h-3 w-3 text-amber-500" />
                {at.displayName}
              </Button>
            ))}
          </div>
        }
      />

      {/* KPI 变量卡片 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="试验事件" value={events.length} sub={`进行中 ${activeCount} · 待执行 ${events.filter((e) => e.data.status === '待执行').length}`} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="LVC 实体总量" value={lvcTotal} sub="真实+虚拟+构建兵力合计" icon={<Radio className="h-4 w-4" />} accent="emerald" />
        <StatCard label="未闭环缺陷" value={openDefs} sub={`含 I 类 ${deficiencies.filter((d) => d.data.severity === 'I类' && d.data.status !== '已闭环').length} 项`} icon={<ShieldAlert className="h-4 w-4" />} accent={openDefs > 2 ? 'red' : 'amber'} />
        <StatCard label="报告在办" value={reports.filter((r) => r.data.status !== '已批准').length} sub="编制/评审/已提交" icon={<FileCheck2 className="h-4 w-4" />} accent="zinc" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,340px]">
        {/* 左：LVC 态势 + 事件表格 */}
        <div className="space-y-4">
          {/* LVC 构成图（联动变量） */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">各试验事件 LVC 构成</h2>
              {/* 试验性质筛选变量 */}
              <div className="flex gap-1">
                {(['all', 'DT', 'OT', 'LFT', 'DOT'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setPhaseFilter(r)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                      phaseFilter === r
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
                    )}
                  >
                    {PHASE_FILTER_LABEL[r]}
                    {r === 'all' ? ` (${events.length})` : ` (${events.filter((e) => e.data.phase === r).length})`}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byEvent} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="live" name="真实 L" stackId="lvc" fill="#059669" radius={[0, 0, 0, 0]} maxBarSize={44} />
                  <Bar dataKey="virtual" name="虚拟 V" stackId="lvc" fill="#7c3aed" maxBarSize={44} />
                  <Bar dataKey="constructive" name="构建 C" stackId="lvc" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 试验事件对象表格（对象集视图） */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-zinc-900">
                试验事件对象集
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  变量 phase = {phaseFilter === 'all' ? '*' : `'${phaseFilter}'`} → {filtered.length} 个对象
                </span>
              </h2>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50">
                  <tr>
                    {['事件', '性质', 'LVC', '考核指标', '进度', '状态', ''].map((h) => (
                      <th key={h} className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedPk(e.pk)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedPk === e.pk ? 'bg-emerald-50/60' : 'hover:bg-zinc-50/60',
                      )}
                    >
                      <td className="border-b border-zinc-100 px-3 py-2">
                        <p className="font-mono text-xs font-medium text-zinc-800">{e.pk}</p>
                        <p className="text-[10px] text-zinc-400">{e.title}</p>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-600">
                        {PHASE_LABEL[e.data.phase] ?? `${e.data.phase} · ${e.data.type}`}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 font-mono text-[10px] text-zinc-600">
                        {e.data.liveCount}L/{e.data.virtualCount}V/{e.data.constructiveCount}C
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 font-mono text-[10px] text-zinc-500">
                        {(e.data.assesses ?? []).join('、') || '—'}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-zinc-100">
                            <span className={cn('block h-full rounded-full', (e.data.progress ?? 0) >= 80 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${e.data.progress ?? 0}%` }} />
                          </span>
                          <span className="text-[10px] text-zinc-500">{e.data.progress}%</span>
                        </div>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        <Badge variant="outline" className={cn('text-[10px]', eventStatusBadge[e.data.status] ?? '')}>{e.data.status}</Badge>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={eventActions.length === 0} onClick={(ev) => { ev.stopPropagation(); setSelectedPk(e.pk); openAction(eventActions[0], e.pk, e.title) }}>
                          下达指令
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右：选中事件详情 + 动作 */}
        <div className="space-y-4">
          {selected ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-zinc-900">{selected.pk}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{selected.title}</p>
                </div>
                <Badge variant="outline" className={cn('shrink-0 text-[10px]', eventStatusBadge[selected.data.status] ?? '')}>
                  {selected.data.status}
                </Badge>
              </div>

              {/* 试验进度仪表 */}
              <div className="mt-4 flex items-center justify-center">
                <div className="relative h-28 w-28">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-zinc-100" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(selected.data.progress / 100) * 264} 264`}
                      className={(selected.data.progress ?? 0) >= 80 ? 'stroke-emerald-500' : 'stroke-amber-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-zinc-800">{selected.data.progress}%</span>
                    <span className="text-[10px] text-zinc-400">事件进度</span>
                  </div>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5">
                {[
                  ['试验性质', PHASE_LABEL[selected.data.phase] ?? `${selected.data.phase} · ${selected.data.type}`],
                  ['试验窗口', selected.data.window],
                  ['场地', selected.data.range],
                  ['LVC 构成', `${selected.data.liveCount}L / ${selected.data.virtualCount}V / ${selected.data.constructiveCount}C`],
                  ['考核指标', (selected.data.assesses ?? []).join('、') || '—'],
                  ['指挥员', selected.data.lead],
                  ...(Array.isArray(selected.data.orders) && selected.data.orders.length > 0
                    ? [['最新指令', `${selected.data.orders[0].orderNo} · ${selected.data.orders[0].window}`] as [string, string]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-zinc-50 pb-1.5">
                    <dt className="text-xs text-zinc-500">{k}</dt>
                    <dd className="max-w-[60%] break-words text-right text-xs font-medium text-zinc-800">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* 动作按钮区 */}
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">可用动作（写回试验档案）</p>
                {eventActions.map((at) => (
                  <Button key={at.id} className="w-full justify-start" size="sm" onClick={() => openAction(at, selected.pk, selected.title)}>
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    {at.displayName}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-400">
              点击表格选择试验事件以执行指挥动作
            </div>
          )}

          {/* 指令与告警流 */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">事件动态</h3>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {events.flatMap((e) => (Array.isArray(e.data.orders) ? e.data.orders.map((o: any) => ({ e, o })) : [])).slice(0, 8).map(({ e, o }, i) => (
                <li key={i} className="rounded-md border border-zinc-100 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-emerald-700">{o.orderNo}</span>
                    {o.priority === '加急' && <Badge variant="outline" className="text-[9px] border-red-200 bg-red-50 text-red-600">加急</Badge>}
                    <span className="ml-auto"><StatusPill status="succeeded" label="已执行" /></span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-700">指令下达至 {e.pk}「{e.title}」</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">{o.window} · {o.issuedBy}</p>
                </li>
              ))}
              {events.every((e) => !Array.isArray(e.data.orders) || e.data.orders.length === 0) && (
                <li className="rounded-md border border-dashed border-zinc-200 p-3 text-center text-xs text-zinc-400">
                  暂无指令记录 — 选择事件后「下达试验指令」
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 缺陷归零 + 报告提交 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            缺陷归零队列（{openDefs} 项在办）
          </h3>
          <ul className="space-y-2">
            {deficiencies.map((d) => (
              <li key={d.id} className={cn('rounded-md border p-3', d.data.status === '已闭环' ? 'border-zinc-100 bg-zinc-50/40' : 'border-red-100 bg-red-50/30')}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-700">{d.pk}</span>
                  <Badge variant="outline" className={cn('text-[9px]', severityColor[d.data.severity] ?? '')}>{d.data.severity}</Badge>
                  <span className="text-[10px] text-zinc-400">{d.data.foundIn}</span>
                  <span className="ml-auto">
                    {d.data.status === '已闭环' ? (
                      <Badge variant="outline" className="text-[9px] border-emerald-200 bg-emerald-50 text-emerald-600">已闭环</Badge>
                    ) : (
                      defActions[0] && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => openAction(defActions[0], d.pk, d.title)}>
                          归零确认
                        </Button>
                      )
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-700">{d.title}</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">{d.data.owner} · {d.data.rootCause || '归零分析中'}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            <FileCheck2 className="h-4 w-4 text-sky-500" />
            鉴定报告在办
          </h3>
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-md border border-zinc-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-700">{r.pk}</span>
                  <Badge variant="outline" className={cn('text-[9px]', r.data.status === '已批准' || r.data.status === '已提交' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-amber-200 bg-amber-50 text-amber-600')}>
                    {r.data.status}
                  </Badge>
                  <span className="text-[10px] text-zinc-400">{r.data.type} · {r.data.version}</span>
                  <span className="ml-auto">
                    {r.data.status !== '已批准' && reportActions[0] && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => openAction(reportActions[0], r.pk, r.title)}>
                        提交报告
                      </Button>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-700">{r.title}</p>
                {r.data.verdict && <p className="mt-0.5 text-[10px] text-zinc-400">结论建议：{r.data.verdict}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 动作执行对话框 */}
      <Dialog open={actionOpen} onOpenChange={(open) => { if (!open) { setActionOpen(false); setResultMsg('') } }}>
        <DialogContent className="sm:max-w-md">
          {resultMsg ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">动作执行成功</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">{resultMsg}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setActionOpen(false); setResultMsg('') }}>再执行一个</Button>
                <Button size="sm" onClick={() => { setActionOpen(false); setResultMsg('') }}>完成</Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>执行动作：{actionType?.displayName}</DialogTitle>
                <DialogDescription>
                  目标对象 <span className="font-mono">{actionTarget}</span>「{actionTargetTitle}」
                  {actionType?.apiName === 'issueTestOrder' && ' · 指令将写入事件档案并通知现场指挥席位'}
                  {actionType?.apiName === 'closeDeficiency' && ' · 归零结论将写入缺陷档案并归档证据'}
                  {actionType?.apiName === 'submitReport' && ' · 报告状态将转为已提交并进入评审流程'}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] space-y-4 overflow-y-auto">
                {actionType?.parameters.map((p) => (
                  <div key={p.name} className="space-y-1.5">
                    <Label className="text-xs">
                      {p.label}
                      {p.required && <span className="ml-1 text-red-500">*</span>}
                    </Label>
                    {p.options ? (
                      <Select value={form[p.name] ?? ''} onValueChange={(v) => setForm({ ...form, [p.name]: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={`选择${p.label}`} /></SelectTrigger>
                        <SelectContent>
                          {p.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : p.type === 'text' ? (
                      <Textarea rows={2} placeholder="选填" value={form[p.name] ?? ''} onChange={(e) => setForm({ ...form, [p.name]: e.target.value })} />
                    ) : (
                      <Input className="h-9" value={form[p.name] ?? ''} onChange={(e) => setForm({ ...form, [p.name]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActionOpen(false)}>取消</Button>
                <Button onClick={executeAction} disabled={running}>
                  {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                  {running ? '执行中…' : '确认执行'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
