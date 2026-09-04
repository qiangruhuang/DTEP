'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, measureStatusBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { ArrowRight, CircleAlert, GitFork, Route, ShieldCheck, Target } from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Workspace = { missionThreads: Entry[]; events: Entry[]; measures: Entry[] }

type ThreadStep = {
  id: string
  label: string
  actor?: string
  effect?: string
  measures?: string[]
  events?: string[]
  status?: 'covered' | 'partial' | 'gap'
}

const FALLBACK_STEPS: ThreadStep[] = [
  { id: 'S1', label: '任务区域搜索', actor: 'X9A / 构建侦察节点', effect: '发现候选目标', measures: ['M-05'], events: ['TE-25-004', 'TE-25-009'], status: 'covered' },
  { id: 'S2', label: '目标探测与识别', actor: '光电载荷 / 算法', effect: '形成目标置信判定', measures: ['M-04'], events: ['TE-25-003'], status: 'partial' },
  { id: 'S3', label: '情报分发', actor: '数据链 / 指挥节点', effect: '情报进入任务网络', measures: ['M-03', 'M-08'], events: ['TE-25-002', 'TE-25-004'], status: 'partial' },
  { id: 'S4', label: '指挥决策与任务重规划', actor: '指挥员 / 任务规划软件', effect: '形成交战任务', measures: ['M-05', 'M-08'], events: ['TE-25-004', 'TE-25-006'], status: 'covered' },
  { id: 'S5', label: '突防与交战', actor: 'X9A / 武器系统', effect: '完成目标打击', measures: ['M-07', 'M-09', 'M-10'], events: ['TE-25-007', 'TE-25-008'], status: 'covered' },
  { id: 'S6', label: '毁伤评估与任务结束', actor: '载荷 / 指挥节点', effect: '确认任务结果', measures: ['M-05'], events: ['TE-25-006', 'TE-25-009'], status: 'partial' },
]

function stepTone(status: ThreadStep['status']) {
  if (status === 'covered') return 'border-emerald-200 bg-emerald-50/50'
  if (status === 'partial') return 'border-amber-200 bg-amber-50/50'
  return 'border-red-200 bg-red-50/50'
}

export function MissionThreadModule() {
  const [data, setData] = useState<Workspace | null>(null)
  const [selected, setSelected] = useState<string>('MT-01')

  useEffect(() => {
    api<Workspace>('/api/decision-workspace').then(setData)
  }, [])

  const thread = useMemo(() => {
    if (!data) return null
    return data.missionThreads.find((t) => t.pk === selected) ?? data.missionThreads[0] ?? null
  }, [data, selected])

  if (!data) return <div className="space-y-4"><ModuleHeader title="Mission Thread 任务线程" desc="加载中…" /><LoadingGrid rows={4} /></div>

  const steps: ThreadStep[] = thread?.data.steps?.length ? thread.data.steps : FALLBACK_STEPS
  const measureMap = new Map<string, Entry>(data.measures.map((m) => [m.pk, m] as [string, Entry]))
  const eventMap = new Map<string, Entry>(data.events.map((e) => [e.pk, e] as [string, Entry]))
  const covered = steps.filter((s) => s.status === 'covered').length
  const partial = steps.filter((s) => s.status === 'partial').length
  const gaps = steps.filter((s) => s.status === 'gap').length
  const coverage = Math.round((covered + partial * 0.5) / Math.max(1, steps.length) * 100)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Mission Thread · 任务线程"
        desc="把系统级指标放回端到端任务链中：每个任务步骤都必须能追溯到试验事件、考核指标、数据和模型，避免单项指标达标但任务链整体失效。"
        actions={data.missionThreads.length > 1 ? (
          <div className="flex gap-1.5">
            {data.missionThreads.map((t) => (
              <button key={t.pk} onClick={() => setSelected(t.pk)} className={cn('rounded-md border px-2.5 py-1.5 text-xs', selected === t.pk ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600')}>
                {t.pk}
              </button>
            ))}
          </div>
        ) : undefined}
      />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-zinc-500">{thread?.pk ?? 'MT-01'}</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-900">{thread?.title ?? '复杂电磁环境下远程察打一体任务线程'}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{thread?.data.missionObjective ?? '在受干扰、多威胁任务环境下完成发现—识别—决策—交战—评估的端到端任务闭环。'}</p>
            </div>
            <Route className="h-7 w-7 shrink-0 text-emerald-600" />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>任务线程试验覆盖度</span><span className="font-mono font-semibold text-zinc-800">{coverage}%</span></div>
          <Progress value={coverage} className="mt-2 h-2" />
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-emerald-700">完整覆盖步骤</p><ShieldCheck className="h-4 w-4 text-emerald-600" /></div>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{covered}</p>
          <p className="mt-1 text-xs text-emerald-700">已有可执行试验事件支撑</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-amber-700">薄弱/缺口步骤</p><CircleAlert className="h-4 w-4 text-amber-600" /></div>
          <p className="mt-2 text-3xl font-semibold text-amber-900">{partial + gaps}</p>
          <p className="mt-1 text-xs text-amber-700">应由后续试验设计补齐</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <GitFork className="h-4 w-4 text-zinc-700" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">端到端任务链</h2>
            <p className="text-xs text-zinc-500">任务步骤是试验设计的骨架；LVC 只是完成这些步骤所使用的试验手段之一。</p>
          </div>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[1120px] items-stretch gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="contents">
                <div className={cn('w-44 shrink-0 rounded-lg border p-3', stepTone(step.status))}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-zinc-500">{step.id}</span>
                    <Badge variant="outline" className="text-[9px]">{step.status === 'covered' ? '已覆盖' : step.status === 'partial' ? '部分覆盖' : '缺口'}</Badge>
                  </div>
                  <h3 className="mt-2 text-xs font-semibold leading-snug text-zinc-900">{step.label}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">主体：{step.actor ?? '—'}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">输出：{step.effect ?? '—'}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(step.measures ?? []).map((m) => {
                      const measure = measureMap.get(m)
                      return <Badge key={m} variant="outline" className={cn('font-mono text-[9px]', measure ? measureStatusBadge[measure.data.status] : '')}>{m}</Badge>
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(step.events ?? []).map((e) => <Badge key={e} variant="secondary" className="font-mono text-[9px]">{eventMap.has(e) ? e : `${e}?`}</Badge>)}
                  </div>
                </div>
                {index < steps.length - 1 && <div className="flex w-6 shrink-0 items-center justify-center"><ArrowRight className="h-4 w-4 text-zinc-300" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">任务线程驱动的下一轮试验设计</h2></div>
          <div className="space-y-2 text-xs text-zinc-600">
            <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3"><span className="font-medium text-zinc-900">S2 目标识别：</span> 当前主要由 TE-25-003 单事件覆盖且 M-04 仍在统计，应增加不同天气、视距、目标伪装和传感器退化条件。</div>
            <div className="rounded-md border border-red-200 bg-red-50/40 p-3"><span className="font-medium text-zinc-900">S3 情报分发：</span> TE-25-002 因干扰条件下失锁暂停，M-07 未达标。后续复试应与 S4 指挥决策连成同一任务线程，而不是只重复链路距离测试。</div>
            <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3"><span className="font-medium text-zinc-900">S6 毁伤评估：</span> 纯数字事件 TE-25-009 可扩大场景空间，但最终任务闭环结论应由经 VV&A 的模型和实测锚点共同支撑。</div>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="text-xs font-semibold text-zinc-800">设计原则</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">指标不是孤立表格字段。平台应首先回答“任务是否能完成、在哪个步骤失败、失败由哪个系统/接口/战术条件引起”，再下钻到 MOP/MOE、试验数据和模型证据。</p>
        </div>
      </section>
    </div>
  )
}
