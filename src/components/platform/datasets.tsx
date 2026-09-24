'use client'

// 试验数据模块：数据集列表（左）+ Schema/预览（右）
import { useEffect, useState } from 'react'
import { api, fmtNum, fmtTime, healthColor, ModuleKey } from '@/lib/platform'
import { ModuleHeader, StatusPill, LoadingGrid, DataTable, EmptyState } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, GitBranch, Table2, FileSearch, ChevronRight, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

type Field = { name: string; type: string; description: string }
type Dataset = {
  id: string; name: string; path: string; description: string; domain: string; origin: string; status: string
  rowCount: number; sizeMb: number; qualityScore: number; lastBuiltAt: string | null
  testResource: { name: string; kind: string } | null
  schema: Field[]; preview: Record<string, unknown>[]
}

const DOMAIN_LABEL: Record<string, string> = {
  telemetry: '遥测', optical: '光测', radar: '雷测', simulation: '仿真', evaluation: '判读结果', environment: '环境', livefire: '实弹',
}

export function DatasetsModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const d = await api<{ datasets: Dataset[] }>('/api/datasets')
        setDatasets(d.datasets)
        setSelectedId(d.datasets[0]?.id ?? null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selected = datasets.find((d) => d.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="试验数据"
        desc="试验数据湖：原始层落地遥测/光测/雷测/实弹/仿真等采集数据，派生层由判读管道生成融合结果与指标统计。支持数据质量核查与样本预览。"
        actions={
          <Button size="sm" variant="secondary" onClick={() => onNavigate('pipelines')}>
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
            前往判读管道
          </Button>
        }
      />

      {loading ? (
        <LoadingGrid rows={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
          {/* 左：数据集列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-zinc-500">{datasets.length} 个数据集</p>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {datasets.filter((d) => d.origin === 'raw').length} 原始层
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {datasets.filter((d) => d.origin === 'derived').length} 判读层
                </Badge>
              </div>
            </div>
            <ScrollArea className="h-[560px] rounded-lg border border-zinc-200 bg-white p-2">
              <ul className="space-y-1">
                {datasets.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                        d.id === selectedId
                          ? 'border-emerald-300 bg-emerald-50/60'
                          : 'border-transparent hover:border-zinc-200 hover:bg-zinc-50',
                      )}
                      aria-current={d.id === selectedId ? 'true' : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <Database className={cn('h-3.5 w-3.5 shrink-0', d.origin === 'raw' ? 'text-zinc-500' : 'text-emerald-600')} />
                        <span className="truncate font-mono text-xs font-medium text-zinc-800">{d.name}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">{fmtNum(d.rowCount)} 行</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 pl-5.5">
                        <span className="text-[10px] text-zinc-400">{d.path}</span>
                        <span className="rounded bg-zinc-100 px-1 py-px text-[9px] text-zinc-600">{DOMAIN_LABEL[d.domain] ?? d.domain}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 pl-5.5">
                        <StatusPill status={d.status} label={d.status === 'ready' ? '就绪' : '构建中'} />
                        <span className={cn('text-[10px] font-medium', healthColor(d.qualityScore))}>质量 {d.qualityScore}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          {/* 右：详情 */}
          {selected ? (
            <div className="rounded-lg border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-mono text-sm font-semibold text-zinc-900">{selected.name}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">{selected.description}</p>
                  </div>
                  <StatusPill status={selected.status} label="就绪" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: '行数', value: fmtNum(selected.rowCount) },
                    { label: '存储', value: selected.sizeMb >= 1024 ? (selected.sizeMb / 1024).toFixed(1) + ' GB' : selected.sizeMb + ' MB' },
                    { label: 'Schema 字段', value: selected.schema.length },
                    { label: '质量分', value: selected.qualityScore },
                    { label: '最近构建', value: fmtTime(selected.lastBuiltAt) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] text-zinc-400">{s.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-800">{s.value}</p>
                    </div>
                  ))}
                </div>
                {selected.testResource && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Radio className="h-3 w-3" />
                    采集资源：{selected.testResource.name}
                    <ChevronRight className="h-3 w-3 text-zinc-300" />
                    <button className="text-emerald-700 hover:underline" onClick={() => onNavigate('resources')}>
                      查看资源
                    </button>
                  </p>
                )}
              </div>

              <div className="p-4">
                <Tabs defaultValue="preview">
                  <TabsList className="h-8">
                    <TabsTrigger value="preview" className="text-xs">
                      <Table2 className="mr-1 h-3.5 w-3.5" />
                      数据预览
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="text-xs">
                      <FileSearch className="mr-1 h-3.5 w-3.5" />
                      Schema
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-3">
                    {selected.preview.length > 0 ? (
                      <DataTable
                        columns={Object.keys(selected.preview[0]).map((k) => ({ key: k, label: k }))}
                        rows={selected.preview}
                      />
                    ) : (
                      <EmptyState text="暂无预览数据" />
                    )}
                    <p className="mt-2 text-[11px] text-zinc-400">
                      显示前 {selected.preview.length} 行（共 {fmtNum(selected.rowCount)} 行）· 采集时统 IRIG-B
                    </p>
                  </TabsContent>
                  <TabsContent value="schema" className="mt-3">
                    <DataTable
                      columns={[
                        { key: 'name', label: '字段名', render: (r) => <span className="font-mono text-xs">{r.name}</span> },
                        { key: 'type', label: '类型', render: (r) => (
                          <Badge variant="outline" className="text-[10px] font-mono">{r.type}</Badge>
                        ) },
                        { key: 'description', label: '说明' },
                      ]}
                      rows={selected.schema}
                      maxHeight="max-h-96"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <EmptyState text="请选择一个数据集" />
          )}
        </div>
      )}
    </div>
  )
}
