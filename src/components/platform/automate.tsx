'use client'

// 试验自动化：触发器 + 效果工作流 + 运行历史（可手动触发真实执行）
import { useEffect, useState } from 'react'
import { api, patch, post, fmtTime, fmtDateTime } from '@/lib/platform'
import { ModuleHeader, LoadingGrid, StatusPill } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Zap, Play, Clock, Radar, Loader2, ChevronDown, Bell, FunctionSquare, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

type Run = { id: string; status: string; startedAt: string; objectsAffected: number; detail: Record<string, unknown> }
type Automation = {
  id: string; name: string; description: string; enabled: boolean
  triggerType: string; triggerLabel: string; effects: { type: string; config: Record<string, any> }[]
  runCount: number; lastRunAt: string | null; runs: Run[]
}

const TRIGGER_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  objectSet: { label: '对象集条件', icon: <Radar className="h-4 w-4" />, color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  event: { label: '事件条件', icon: <Zap className="h-4 w-4" />, color: 'border-violet-200 bg-violet-50 text-violet-700' },
  time: { label: '时间条件', icon: <Clock className="h-4 w-4" />, color: 'border-amber-200 bg-amber-50 text-amber-700' },
}

const EFFECT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  action: { label: '执行动作', icon: <Zap className="h-3.5 w-3.5" /> },
  notification: { label: '通知', icon: <Bell className="h-3.5 w-3.5" /> },
  function: { label: '函数', icon: <FunctionSquare className="h-3.5 w-3.5" /> },
  logic: { label: '逻辑分支', icon: <GitBranch className="h-3.5 w-3.5" /> },
}

export function AutomateModule() {
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [openRun, setOpenRun] = useState<string | null>(null)

  const load = async () => {
    try {
      const d = await api<{ automations: Automation[] }>('/api/automate')
      setAutomations(d.automations)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const trigger = async (a: Automation) => {
    setTriggering(a.id)
    try {
      const d = await post<{ run: Run }>('/api/automate', { automationId: a.id })
      toast({
        title: `「${a.name}」执行完成`,
        description: `影响 ${d.run.objectsAffected} 个对象${d.run.detail?.matched ? `，命中：${(d.run.detail.matched as string[]).join('、')}` : ''}`,
      })
      await load()
      setOpenRun(a.runs[0]?.id ?? null)
    } catch (e) {
      toast({ title: '触发失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setTriggering(null)
    }
  }

  const toggle = async (a: Automation, enabled: boolean) => {
    await patch('/api/automate', { id: a.id, enabled })
    await load()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="试验自动化" desc="加载中…" />
        <LoadingGrid />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="试验自动化"
        desc="试验工作流引擎：当遥测超差、数据就绪或周期到达时，按效果链执行缺陷登记、判读调度与通知。手动触发会真实执行（写回本体等操作）。"
      />

      <div className="space-y-4">
        {automations.map((a) => {
          const tm = TRIGGER_META[a.triggerType] ?? TRIGGER_META.objectSet
          return (
            <article key={a.id} className={cn('rounded-lg border bg-white shadow-xs', a.enabled ? 'border-zinc-200' : 'border-zinc-200 opacity-70')}>
              {/* 头部 */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-md border', tm.color)}>{tm.icon}</span>
                    <h2 className="text-sm font-semibold text-zinc-900">{a.name}</h2>
                    <Badge variant="secondary" className="text-[10px]">{tm.label}</Badge>
                    <StatusPill status={a.enabled ? 'succeeded' : 'paused'} label={a.enabled ? '运行中' : '已停用'} />
                  </div>
                  <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-zinc-500">{a.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="mr-2 hidden text-right sm:block">
                    <p className="text-xs font-medium text-zinc-700">{a.runCount} 次执行</p>
                    <p className="text-[10px] text-zinc-400">上次 {fmtTime(a.lastRunAt)}</p>
                  </div>
                  <Switch checked={a.enabled} onCheckedChange={(v) => toggle(a, v)} aria-label={`启用或停用 ${a.name}`} />
                  <Button size="sm" variant="outline" className="h-8" disabled={triggering === a.id || !a.enabled} onClick={() => trigger(a)}>
                    {triggering === a.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                    手动触发
                  </Button>
                </div>
              </div>

              {/* 触发器 → 效果链 */}
              <div className="flex flex-col items-stretch gap-2 p-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2.5 lg:w-72">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded border', tm.color)}>
                    <span className="scale-75">{tm.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">WHEN · 触发器</p>
                    <p className="truncate font-mono text-[11px] text-zinc-700">{a.triggerLabel}</p>
                  </div>
                </div>

                <div className="hidden items-center lg:flex" aria-hidden="true">
                  <div className="h-px w-6 bg-zinc-300" />
                  <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg] text-zinc-400" />
                </div>

                <div className="flex flex-1 flex-col gap-1.5 sm:flex-row">
                  {a.effects.map((eff, i) => {
                    const em = EFFECT_META[eff.type] ?? EFFECT_META.action
                    return (
                      <div key={i} className="flex flex-1 items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-amber-200 bg-amber-50 text-amber-600">
                          {em.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600/70">THEN · {em.label}</p>
                          <p className="truncate text-[11px] text-zinc-700">
                            {eff.type === 'action' && (eff.config.actionType === 'createDeficiency' ? `登记试验缺陷（${eff.config.severity}）` : eff.config.actionType)}
                            {eff.type === 'notification' && `${(eff.config.recipients ?? []).join('、')} · ${eff.config.channel}`}
                            {eff.type === 'function' && eff.config.function}
                          </p>
                        </div>
                        {i < a.effects.length - 1 && (
                          <span className="ml-auto hidden text-zinc-300 sm:block" aria-hidden="true">→</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 运行历史（折叠） */}
              <div className="border-t border-zinc-100">
                <Collapsible open={openRun === a.id} onOpenChange={(o) => setOpenRun(o ? a.id : null)}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-zinc-500 hover:bg-zinc-50/60">
                    <span>运行历史（{a.runs.length} 条）</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openRun === a.id && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1.5 px-4 pb-4">
                      {a.runs.map((r) => (
                        <li key={r.id} className="rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={r.status} />
                            <span className="text-xs text-zinc-600">{fmtDateTime(r.startedAt)}</span>
                            <span className="text-[10px] text-zinc-400">影响 {r.objectsAffected} 个对象</span>
                          </div>
                          {Object.keys(r.detail).length > 0 && (
                            <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-zinc-500">
                              {Object.entries(r.detail)
                                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('、') : String(v)}`)
                                .join('  |  ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
