'use client'

// 对象检索：本体对象集表格 + 筛选 + 详情侧板
import { useEffect, useState } from 'react'
import { api, ModuleKey, measureStatusBadge, severityColor, eventStatusBadge } from '@/lib/platform'
import { ModuleHeader, LoadingGrid, EmptyState, DataTable } from './shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Search, ChevronRight, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'

type ObjData = {
  objectType: { apiName: string; displayName: string; icon: string; description: string; objectCount: number }
  properties: { apiName: string; displayName: string; dataType: string; isDerived: boolean }[]
  objects: { id: string; pk: string; title: string; data: Record<string, unknown>; updatedAt: string }[]
}

const TYPE_TABS = ['TestEvent', 'Measure', 'Deficiency', 'Report', 'ModelAsset', 'SUT', 'TestProgram']
const TYPE_LABEL: Record<string, string> = {
  TestEvent: '试验事件', Measure: '鉴定指标', Deficiency: '试验缺陷', Report: '鉴定报告',
  ModelAsset: '数字模型', SUT: '被试系统', TestProgram: '试验任务',
}

// 状态类属性 → 徽标样式
function statusBadgeFor(apiName: string, v: unknown) {
  if (v == null || v === '') return null
  const s = String(v)
  if (measureStatusBadge[s]) return measureStatusBadge[s]
  if (severityColor[s]) return severityColor[s]
  if (eventStatusBadge[s]) return eventStatusBadge[s]
  if (s === '已闭环') return 'border-emerald-200 bg-emerald-50 text-emerald-600'
  if (s === '分析中' || s === '归零验证中' || s === '评审中' || s === '编制中') return 'border-amber-200 bg-amber-50 text-amber-600'
  if (s === '已批准' || s === '已提交' || s === '已确认') return 'border-emerald-200 bg-emerald-50 text-emerald-600'
  if (s === '待分派' || s === '暂停') return 'border-red-200 bg-red-50 text-red-600'
  return null
}

export function ObjectsModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [type, setType] = useState('TestEvent')
  const [q, setQ] = useState('')
  const [data, setData] = useState<ObjData | null>(null)
  const [selObj, setSelObj] = useState<ObjData['objects'][0] | null>(null)

  const switchType = (t: string) => {
    setType(t)
    setSelObj(null)
  }

  // 单一数据获取 effect（搜索防抖）
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      api<ObjData>(`/api/objects?type=${type}&q=${encodeURIComponent(q)}`).then((d) => {
        if (!cancelled) setData(d)
      })
    }, q ? 250 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [type, q])

  const loading = !data || data.objectType.apiName !== type

  const typeLabel = TYPE_LABEL[type] ?? type
  const displayProps = data?.properties.slice(0, 8) ?? []

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="对象检索"
        desc="查询试验本体中的对象集（试验任务/事件/指标/缺陷/报告/模型）。对象是评估分析与指挥操作的统一数据底座。"
        actions={
          <Button size="sm" variant="secondary" onClick={() => onNavigate('workshop')}>
            <Crosshair className="mr-1.5 h-3.5 w-3.5" />
            前往试验指挥台操作
          </Button>
        }
      />

      {/* 类型切换 */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => switchType(t)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              t === type ? 'border-zinc-900 bg-zinc-900 font-medium text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
            )}
          >
            {TYPE_LABEL[t]}
            <span className="ml-1.5 font-mono text-[10px] opacity-60">{t}</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingGrid />
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder={`搜索${typeLabel}对象（编号 / 名称 / 属性值）…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={`搜索${typeLabel}对象`}
              />
            </div>
            <p className="text-xs text-zinc-500">
              共 <span className="font-semibold text-zinc-700">{data.objects.length}</span> 个对象
            </p>
          </div>

          {data.objects.length === 0 ? (
            <EmptyState text="没有匹配的对象" />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white">
              <DataTable
                maxHeight="max-h-[520px]"
                columns={[
                  {
                    key: 'pk',
                    label: type === 'TestEvent' ? '事件编号' : type === 'Measure' ? '指标编号' : type === 'Deficiency' ? '缺陷编号' : type === 'Report' ? '报告编号' : '编号',
                    render: (r) => (
                      <button onClick={() => setSelObj(r)} className="font-mono text-xs font-medium text-emerald-700 hover:underline">
                        {r.pk}
                      </button>
                    ),
                  },
                  { key: 'title', label: typeLabel, render: (r) => <span className="text-xs">{r.title}</span> },
                  ...displayProps.slice(1, 7).map((p) => ({
                    key: p.apiName,
                    label: p.displayName,
                    render: (r: any) => {
                      const v = r.data[p.apiName]
                      if (Array.isArray(v)) {
                        return <span className="font-mono text-[10px] text-zinc-500">{v.join('、').slice(0, 24)}</span>
                      }
                      const badge = statusBadgeFor(p.apiName, v)
                      if (badge) {
                        return <Badge variant="outline" className={cn('text-[10px]', badge)}>{String(v)}</Badge>
                      }
                      if (typeof v === 'number') {
                        return (
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-700">{v}</span>
                          </span>
                        )
                      }
                      return <span className="text-xs text-zinc-600">{v == null || v === '' ? '—' : String(v)}</span>
                    },
                  })),
                  {
                    key: 'actions',
                    label: '',
                    render: (r) => (
                      <button onClick={() => setSelObj(r)} className="flex items-center gap-0.5 text-xs text-zinc-400 hover:text-zinc-700" aria-label={`查看 ${r.pk} 详情`}>
                        详情 <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ),
                  },
                ]}
                rows={data.objects}
              />
            </div>
          )}
        </>
      ) : null}

      {/* 对象详情侧板 */}
      <Sheet open={!!selObj} onOpenChange={(open) => !open && setSelObj(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selObj && data && (
            <>
              <SheetHeader className="px-1">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="font-mono text-sm">{selObj.pk}</span>
                  <span className="text-sm font-normal text-zinc-500">{selObj.title}</span>
                </SheetTitle>
                <SheetDescription>
                  {data.objectType.displayName}对象 · {TYPE_LABEL[type]} · 依据试验档案实时物化
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-2 px-1">
                {data.properties.map((p) => {
                  const v = (selObj.data as any)[p.apiName]
                  const badge = statusBadgeFor(p.apiName, v)
                  return (
                    <div key={p.apiName} className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700">{p.displayName}</p>
                        <p className="font-mono text-[10px] text-zinc-400">{p.apiName} : {p.dataType}</p>
                      </div>
                      {badge ? (
                        <Badge variant="outline" className={cn('max-w-[45%] text-[10px]', badge)}>{String(v)}</Badge>
                      ) : (
                        <p className="max-w-[45%] break-words text-right text-xs text-zinc-800">
                          {v == null || v === '' ? '—' : Array.isArray(v) ? v.join('、') : typeof v === 'number' ? v.toLocaleString() : String(v)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 px-1">
                <Button className="w-full" size="sm" onClick={() => { setSelObj(null); onNavigate('workshop') }}>
                  <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                  在试验指挥台对此对象执行动作
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
