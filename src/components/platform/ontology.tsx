'use client'

// 试验本体：对象类型 / 链接类型 / 动作类型 + 动作执行日志
import { useEffect, useState } from 'react'
import { api, fmtTime, ModuleKey } from '@/lib/platform'
import { ModuleHeader, LoadingGrid, EmptyState } from './shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Plane, CalendarClock, Gauge, ShieldAlert, FileText, Cpu, ArrowRight, Zap, Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

type Prop = { apiName: string; displayName: string; dataType: string; description: string; isDerived: boolean }
type OType = { id: string; apiName: string; displayName: string; description: string; icon: string; objectCount: number; properties: Prop[] }
type LType = { id: string; apiName: string; displayName: string; cardinality: string; source: string; target: string }
type AType = { id: string; apiName: string; displayName: string; appliesTo: string; parameters: { name: string; type: string; required: boolean; label: string; options?: string[] }[]; description: string; status: string }
type ALog = { id: string; actionType: string; objectPk: string; parameters: Record<string, string>; status: string; performedBy: string; createdAt: string }

const ICONS: Record<string, React.ReactNode> = {
  target: <Target className="h-4 w-4" />,
  plane: <Plane className="h-4 w-4" />,
  calendar: <CalendarClock className="h-4 w-4" />,
  gauge: <Gauge className="h-4 w-4" />,
  'shield-alert': <ShieldAlert className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  box: <Boxes className="h-4 w-4" />,
}

const TYPE_COLORS = ['border-emerald-200 bg-emerald-50 text-emerald-700', 'border-amber-200 bg-amber-50 text-amber-700', 'border-violet-200 bg-violet-50 text-violet-700', 'border-teal-200 bg-teal-50 text-teal-700', 'border-orange-200 bg-orange-50 text-orange-700', 'border-sky-200 bg-sky-50 text-sky-700', 'border-red-200 bg-red-50 text-red-700']

export function OntologyModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [data, setData] = useState<{ objectTypes: OType[]; linkTypes: LType[]; actionTypes: AType[]; actionLogs: ALog[] } | null>(null)
  const [selType, setSelType] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const d = await api<{ objectTypes: OType[]; linkTypes: LType[]; actionTypes: AType[]; actionLogs: ALog[] }>('/api/ontology')
      setData(d)
      setSelType(d.objectTypes[0]?.apiName ?? null)
    })()
  }, [])

  if (!data) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="试验本体" desc="加载中…" />
        <LoadingGrid />
      </div>
    )
  }

  const selected = data.objectTypes.find((t) => t.apiName === selType) ?? null

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="试验本体"
        desc="试验鉴定的领域数字孪生：对象类型建模任务/被试系统/事件/指标/缺陷/报告/模型，链接类型建模证据关系，动作类型将指挥决策写回试验档案。"
        actions={
          <Button size="sm" variant="secondary" onClick={() => onNavigate('objects')}>
            <Boxes className="mr-1.5 h-3.5 w-3.5" />
            打开对象检索
          </Button>
        }
      />

      <Tabs defaultValue="objects">
        <TabsList className="h-9">
          <TabsTrigger value="objects" className="text-xs">对象类型（{data.objectTypes.length}）</TabsTrigger>
          <TabsTrigger value="links" className="text-xs">链接类型（{data.linkTypes.length}）</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">动作类型（{data.actionTypes.length}）</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">动作日志（{data.actionLogs.length}）</TabsTrigger>
        </TabsList>

        <TabsContent value="objects" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px,1fr]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {data.objectTypes.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setSelType(t.apiName)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                    t.apiName === selType ? 'border-zinc-900 shadow-sm' : 'border-zinc-200',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md border', TYPE_COLORS[i % TYPE_COLORS.length])}>
                    {ICONS[t.icon] ?? ICONS.box}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{t.displayName}</p>
                    <p className="truncate font-mono text-[10px] text-zinc-400">{t.apiName}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{t.objectCount}</Badge>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="rounded-lg border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
                      {ICONS[selected.icon] ?? ICONS.box}
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">
                        {selected.displayName}
                        <span className="ml-2 font-mono text-xs font-normal text-zinc-400">{selected.apiName}</span>
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500">{selected.description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500">属性（{selected.properties.length}）</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selected.properties.map((p) => (
                      <div key={p.apiName} className="rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-zinc-800">{p.displayName}</span>
                          {p.isDerived && (
                            <span className="rounded bg-violet-50 px-1 py-px text-[9px] text-violet-600">派生</span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                          {selected.apiName}.{p.apiName} : {p.dataType}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="选择左侧对象类型" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.linkTypes.map((l) => (
              <div key={l.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900">{l.displayName}</p>
                  <Badge variant="secondary" className="text-[10px]">{l.cardinality}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{l.apiName}</p>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2.5">
                  <span className="font-mono text-xs font-medium text-zinc-700">{l.source}</span>
                  <span className="flex flex-col items-center">
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                    <span className="text-[9px] text-zinc-400">{l.displayName}</span>
                  </span>
                  <span className="font-mono text-xs font-medium text-zinc-700">{l.target}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.actionTypes.map((a) => (
              <div key={a.id} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600">
                      <Zap className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{a.displayName}</p>
                      <p className="font-mono text-[10px] text-zinc-400">{a.appliesTo}.{a.apiName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-600">启用</Badge>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-600">{a.description}</p>
                <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">参数</p>
                  {a.parameters.map((p) => (
                    <div key={p.name} className="flex items-center justify-between rounded bg-zinc-50 px-2 py-1.5">
                      <span className="font-mono text-[11px] text-zinc-700">{p.name}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">{p.type}</span>
                        {p.required && <span className="rounded bg-red-50 px-1 text-[9px] text-red-500">必填</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="secondary" className="mt-3 h-7" onClick={() => onNavigate('workshop')}>
                  在试验指挥台执行 →
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {['时间', '动作', '目标对象', '参数', '执行者', '状态'].map((h) => (
                    <th key={h} className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.actionLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-400">暂无动作执行记录（可在试验指挥台执行动作）</td>
                  </tr>
                )}
                {data.actionLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50/60">
                    <td className="border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-500">{fmtTime(l.createdAt)}</td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 text-xs font-medium text-zinc-800">{l.actionType}</td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 font-mono text-xs text-zinc-600">{l.objectPk}</td>
                    <td className="max-w-64 border-b border-zinc-100 px-3 py-2.5 font-mono text-[10px] text-zinc-500">
                      <span className="line-clamp-1">{JSON.stringify(l.parameters)}</span>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-600">{l.performedBy}</td>
                    <td className="border-b border-zinc-100 px-3 py-2.5">
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-600">成功</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
