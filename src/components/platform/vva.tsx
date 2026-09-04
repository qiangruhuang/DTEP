'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle2, CircleAlert, Cpu, FileCheck2, ShieldCheck, TestTubeDiagonal } from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Workspace = { models: Entry[]; events: Entry[] }

function stateTone(status: string) {
  if (['通过', '已认可', '已确认'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (['验证中', '校核中', '有条件认可'].includes(status)) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function accreditationOf(model: Entry) {
  return String(model.data.accreditation ?? (model.data.vvaStatus === '已确认' ? '已认可' : '待认可'))
}

function eligible(model: Entry) {
  const a = accreditationOf(model)
  return a === '已认可' || a === '有条件认可'
}

export function VvaModule() {
  const [data, setData] = useState<Workspace | null>(null)
  const [selected, setSelected] = useState<string>('MD-03')

  useEffect(() => {
    api<Workspace>('/api/decision-workspace').then((d) => {
      setData(d)
      if (!d.models.some((m) => m.pk === selected) && d.models[0]) setSelected(d.models[0].pk)
    })
  }, [])

  const model = useMemo(() => data?.models.find((m) => m.pk === selected) ?? data?.models[0] ?? null, [data, selected])

  if (!data || !model) return <div className="space-y-4"><ModuleHeader title="Model VV&A / Model Card" desc="加载中…" /><LoadingGrid rows={4} /></div>

  const ready = data.models.filter(eligible).length
  const criticalBlocked = data.models.filter((m) => m.data.criticality === '关键' && !eligible(m)).length
  const eventMap = new Map<string, Entry>(data.events.map((e) => [e.pk, e] as [string, Entry]))
  const intendedUse = String(model.data.intendedUse ?? '支撑相关试验事件中的性能估计与场景扩展')
  const domain = String(model.data.validationDomain ?? '尚未结构化定义')
  const limitations = Array.isArray(model.data.limitations) ? model.data.limitations : ['尚未登记模型局限']
  const liveRefs = Array.isArray(model.data.liveDataRefs) ? model.data.liveDataRefs : []
  const usedIn = Array.isArray(model.data.usedIn) ? model.data.usedIn : []

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Model VV&A · 模型卡与认可管理"
        desc="模型能否用于鉴定，不取决于“精度看起来够高”，而取决于其预期用途、验证域、验证数据、已知局限和认可结论是否与当前试验问题一致。"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:col-span-2">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-zinc-500">模型资产就绪度</p><p className="mt-1 text-3xl font-semibold text-zinc-900">{ready}/{data.models.length}</p><p className="mt-1 text-xs text-zinc-500">已认可或有条件认可，可进入限定用途工作流</p></div><ShieldCheck className="h-7 w-7 text-emerald-600" /></div>
          <Progress value={Math.round(ready / Math.max(1, data.models.length) * 100)} className="mt-3 h-2" />
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4"><p className="text-xs text-red-700">关键模型阻塞</p><p className="mt-2 text-3xl font-semibold text-red-900">{criticalBlocked}</p><p className="mt-1 text-xs text-red-700">未满足正式证据用途条件</p></div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">验证实测锚点</p><p className="mt-2 text-3xl font-semibold text-zinc-900">{data.models.reduce((s, m) => s + (Array.isArray(m.data.liveDataRefs) ? m.data.liveDataRefs.length : 0), 0)}</p><p className="mt-1 text-xs text-zinc-500">模型—实测关联记录</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="mb-2 px-1"><h2 className="text-sm font-semibold text-zinc-900">模型资产</h2><p className="text-[10px] text-zinc-500">选择查看 Model Card</p></div>
          <div className="space-y-1.5">
            {data.models.map((m) => {
              const active = m.pk === model.pk
              const acc = accreditationOf(m)
              return <button key={m.pk} onClick={() => setSelected(m.pk)} className={cn('w-full rounded-md border p-2.5 text-left transition-colors', active ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:bg-zinc-50')}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className={cn('font-mono text-[10px]', active ? 'text-zinc-400' : 'text-zinc-500')}>{m.pk}</p><p className="mt-0.5 truncate text-xs font-medium">{m.title}</p></div><span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', eligible(m) ? 'bg-emerald-500' : 'bg-amber-500')} /></div>
                <p className={cn('mt-1 text-[10px]', active ? 'text-zinc-400' : 'text-zinc-500')}>{m.data.kind} · {acc}</p>
              </button>
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-mono text-[10px] text-zinc-500">{model.pk} · {model.data.version}</p><h2 className="mt-1 text-lg font-semibold text-zinc-900">{model.title}</h2><p className="mt-1 text-xs text-zinc-500">{model.data.developer} · {model.data.kind}</p></div>
              <Badge variant="outline" className={cn('text-xs', stateTone(accreditationOf(model)))}>{accreditationOf(model)}</Badge>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <VvaState label="Verification · 校核" value={String(model.data.verification ?? (model.data.vvaStatus === '已确认' ? '通过' : '校核中'))} icon={<FileCheck2 className="h-4 w-4" />} />
              <VvaState label="Validation · 验证" value={String(model.data.validation ?? (model.data.vvaStatus === '已确认' ? '通过' : '验证中'))} icon={<TestTubeDiagonal className="h-4 w-4" />} />
              <VvaState label="Accreditation · 认可" value={accreditationOf(model)} icon={<ShieldCheck className="h-4 w-4" />} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="预期用途 Intended Use" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}><p>{intendedUse}</p><p className="mt-2 text-[10px] text-zinc-500">认可必须绑定具体用途；同一模型换一种鉴定用途，需要重新判断已有 VV&A 证据是否仍充分。</p></InfoCard>
            <InfoCard title="验证域 Validation Domain" icon={<Cpu className="h-4 w-4 text-zinc-600" />}><p>{domain}</p><p className="mt-2 text-[10px] text-zinc-500">场景参数超出该域时，平台应自动把模型证据标记为“域外使用”。</p></InfoCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="实测验证锚点" icon={<TestTubeDiagonal className="h-4 w-4 text-zinc-600" />}>
              <div className="flex flex-wrap gap-1.5">{liveRefs.length ? liveRefs.map((ref: string) => <Badge key={ref} variant="secondary" className="font-mono text-[10px]">{ref}</Badge>) : <span className="text-amber-700">尚未登记</span>}</div>
            </InfoCard>
            <InfoCard title="已知局限与风险" icon={<CircleAlert className="h-4 w-4 text-amber-600" />}>
              <ul className="space-y-1.5">{limitations.map((x: string) => <li key={x} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /><span>{x}</span></li>)}</ul>
            </InfoCard>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900">应用事件与用途一致性</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {usedIn.map((eventId: string) => {
                const e = eventMap.get(eventId)
                return <div key={eventId} className="rounded-md border border-zinc-200 bg-zinc-50/40 p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-zinc-500">{eventId}</span><Badge variant="outline" className="text-[9px]">{eligible(model) ? '可用' : '需审查'}</Badge></div><p className="mt-1 text-xs font-medium text-zinc-800">{e?.title ?? '关联试验事件'}</p><p className="mt-1 text-[10px] text-zinc-500">{e?.data.phase ?? '—'} · {e?.data.type ?? '—'}</p></div>
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function VvaState({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3"><div className="flex items-center gap-2 text-xs text-zinc-600">{icon}<span>{label}</span></div><Badge variant="outline" className={cn('mt-2', stateTone(value))}>{value}</Badge></div>
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className="rounded-lg border border-zinc-200 bg-white p-4"><div className="mb-3 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold text-zinc-900">{title}</h3></div><div className="text-xs leading-relaxed text-zinc-600">{children}</div></div>
}
