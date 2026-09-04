'use client'

// 遥测时序：架次遥测曲线 + 超差判据参考线 + 告警闭环（确认/解决）
import { useEffect, useState } from 'react'
import { api, patch, fmtTime, alertSeverityBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { Activity, CheckCheck, CircleCheck, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type Series = { param: string; threshold: number | null; direction: string | null; points: { ts: string; value: number }[] }
type Alert = { id: string; parameter: string; severity: string; message: string; status: string; raisedAt: string }

const PARAM_LABEL: Record<string, string> = {
  altitude: '飞行高度 (m)',
  speed: '飞行速度 (km/h)',
  deviation: '航迹偏差 (m)',
  linkQuality: '数据链链路质量 (%)',
  missDistance: '实弹脱靶量 (m)',
  impactVelocity: '着速 (m/s)',
  twinNrmse: '孪生一致性 NRMSE (%)',
  missionScore: '任务得分',
}
const RUNS = [
  { id: 'F-2207', label: 'F-2207 · 飞行架次' },
  { id: 'F-2206', label: 'F-2206 · 飞行架次' },
  { id: 'LF-011', label: 'LF-011 · 实弹射组' },
  { id: 'DOT-01', label: 'DOT-01 · 数字化运行' },
]

export function TimeseriesModule() {
  const { toast } = useToast()
  const [run, setRun] = useState('F-2207')
  const [series, setSeries] = useState<Series[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api<{ series: Series[]; alerts: Alert[] }>(`/api/timeseries?run=${run}`)
      .then((d) => { setSeries(d.series); setAlerts(d.alerts) })
      .finally(() => setLoading(false))
  }, [run])

  const setAlertStatus = async (a: Alert, status: string) => {
    setBusy(a.id)
    try {
      await patch('/api/alerts', { id: a.id, status })
      const d = await api<{ alerts: Alert[] }>(`/api/timeseries?run=${run}`)
      setAlerts(d.alerts)
      toast({ title: status === 'acknowledged' ? '告警已确认' : status === 'resolved' ? '告警已解决' : '已重新打开' })
    } finally {
      setBusy(null)
    }
  }

  const fmtTick = (ts: string) => {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="遥测时序"
        desc="飞行架次/实弹射组/数字化运行时序流按 5 分钟粒度物化（IRIG-B 时统），支持超差判据参考线与试验告警闭环（确认 → 解决），异常自动联动停试/停射建议与缺陷登记。"
        actions={
          <Select value={run} onValueChange={setRun}>
            <SelectTrigger className="h-8 w-48 text-xs" aria-label="选择试验运行">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUNS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {loading && series.length === 0 ? (
        <LoadingGrid />
      ) : (
        <>
          {/* 告警条 */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className={cn('flex flex-wrap items-center gap-2 rounded-lg border p-3', a.status === 'open' ? 'border-red-200 bg-red-50/60' : a.status === 'acknowledged' ? 'border-amber-200 bg-amber-50/50' : 'border-zinc-200 bg-zinc-50/40')}>
                  <Badge variant="outline" className={cn('shrink-0 text-[10px]', alertSeverityBadge[a.severity])}>
                    {a.severity === 'critical' ? '紧急' : a.severity === 'warning' ? '警告' : '提示'}
                  </Badge>
                  <span className="font-mono text-xs text-zinc-600">{PARAM_LABEL[a.parameter] ?? a.parameter}</span>
                  <p className="min-w-40 flex-1 text-xs text-zinc-700">{a.message}</p>
                  <span className="text-[10px] text-zinc-400">{fmtTime(a.raisedAt)}</span>
                  <div className="flex gap-1.5">
                    {a.status === 'open' && (
                      <Button size="sm" variant="outline" className="h-7" disabled={busy === a.id} onClick={() => setAlertStatus(a, 'acknowledged')}>
                        <CheckCheck className="mr-1 h-3 w-3" />
                        确认
                      </Button>
                    )}
                    {a.status !== 'resolved' ? (
                      <Button size="sm" variant="outline" className="h-7" disabled={busy === a.id} onClick={() => setAlertStatus(a, 'resolved')}>
                        <CircleCheck className="mr-1 h-3 w-3" />
                        解决
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7" disabled={busy === a.id} onClick={() => setAlertStatus(a, 'open')}>
                        <RotateCcw className="mr-1 h-3 w-3" />
                        重开
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 时序曲线（每参数一张图） */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {series.map((s) => {
              const over = s.direction === 'upper'
                ? s.threshold != null && s.points.some((p) => p.value > s.threshold!)
                : s.direction === 'lower'
                  ? s.threshold != null && s.points.some((p) => p.value < s.threshold!)
                  : false
              return (
                <section key={s.param} className={cn('rounded-lg border bg-white p-4', over ? 'border-amber-300' : 'border-zinc-200')}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                      <Activity className="h-4 w-4 text-zinc-400" />
                      {PARAM_LABEL[s.param] ?? s.param}
                    </h2>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="font-mono">{run}</span>
                      {s.threshold != null && (
                        <span className={cn('rounded px-1.5 py-px font-mono', over ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-500')}>
                          判据 {s.direction === 'upper' ? '≤' : '≥'}{s.threshold}
                        </span>
                      )}
                      {over && <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] text-red-600">超差</Badge>}
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-zinc-400">
                    本架次全程 · {s.points.length} 个采样点 · 当前 {s.points[s.points.length - 1]?.value ?? '—'}
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis dataKey="ts" tickFormatter={fmtTick} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#d4d4d8' }} tickLine={false} minTickGap={40} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                          labelFormatter={(ts) => new Date(String(ts)).toLocaleString('zh-CN')}
                          formatter={(v: number) => [v, PARAM_LABEL[s.param] ?? s.param]}
                        />
                        {s.threshold != null && <ReferenceLine y={s.threshold} stroke="#ef4444" strokeDasharray="6 3" />}
                        <Line type="monotone" dataKey="value" stroke={s.param === 'deviation' ? '#7c3aed' : s.param === 'linkQuality' ? '#f59e0b' : s.param === 'altitude' ? '#0d9488' : '#0284c7'} strokeWidth={1.8} dot={false} animationDuration={300} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
