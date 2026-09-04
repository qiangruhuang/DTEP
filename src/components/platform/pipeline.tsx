'use client'

// 判读管道构建器：可视化 DAG + 节点配置 + 判读运行历史/日志
import { useEffect, useMemo, useState } from 'react'
import { api, post, fmtNum, fmtTime, fmtDateTime, statusColor } from '@/lib/platform'
import { ModuleHeader, StatusPill, LoadingGrid, EmptyState } from './shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Play, Database, Clock, Layers, GitMerge, Calculator, Sigma, Save, Filter,
  ChevronRight, CheckCircle2, XCircle, Loader2, Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PNode = { id: string; type: string; label: string; config: Record<string, unknown>; x: number; y: number; order: number }
type PBuild = { id: string; status: string; startedAt: string; finishedAt: string | null; rowsProcessed: number; durationSec: number; logs: { t: string; level: string; msg: string }[] }
type Pipeline = {
  id: string; name: string; description: string; status: string; schedule: string
  lastBuildStatus: string; lastBuildAt: string | null
  nodes: PNode[]; builds: PBuild[]
}

const NODE_W = 196
const NODE_H = 56

const NODE_META: Record<string, { label: string; icon: React.ReactNode; color: string; border: string; header: string }> = {
  source: { label: '数据源', icon: <Database className="h-4 w-4" />, color: 'text-zinc-600 bg-zinc-100 border-zinc-300', border: 'stroke-zinc-300', header: 'SOURCE' },
  timeAlign: { label: '时统校正', icon: <Clock className="h-4 w-4" />, color: 'text-sky-600 bg-sky-50 border-sky-300', border: 'stroke-sky-300', header: 'TIME-ALIGN' },
  extract: { label: '参数提取', icon: <Layers className="h-4 w-4" />, color: 'text-teal-600 bg-teal-50 border-teal-300', border: 'stroke-teal-300', header: 'EXTRACT' },
  join: { label: '融合', icon: <GitMerge className="h-4 w-4" />, color: 'text-violet-600 bg-violet-50 border-violet-300', border: 'stroke-violet-300', header: 'FUSION' },
  expression: { label: '解算', icon: <Calculator className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-300', border: 'stroke-emerald-300', header: 'SOLVE' },
  aggregate: { label: '统计', icon: <Sigma className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50 border-orange-300', border: 'stroke-orange-300', header: 'AGGREGATE' },
  filter: { label: '过滤', icon: <Filter className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50 border-amber-300', border: 'stroke-amber-300', header: 'FILTER' },
  output: { label: '输出', icon: <Save className="h-4 w-4" />, color: 'text-zinc-700 bg-zinc-800 border-zinc-800', border: 'stroke-zinc-700', header: 'OUTPUT' },
}

// 依据节点顺序推断边（source→后续节点，其余线性传递）
function inferEdges(nodes: PNode[]): { from: PNode; to: PNode }[] {
  const sorted = [...nodes].sort((a, b) => a.order - b.order)
  const edges: { from: PNode; to: PNode }[] = []
  const sources = sorted.filter((n) => n.type === 'source')
  const nonSources = sorted.filter((n) => n.type !== 'source')

  sources.forEach((s, i) => {
    if (i === 0) {
      const target = nonSources[0]
      if (target) edges.push({ from: s, to: target })
    } else {
      const join = nonSources.find((n) => n.type === 'join') ?? nonSources[0]
      if (join) edges.push({ from: s, to: join })
    }
  })
  for (let i = 0; i < nonSources.length - 1; i++) {
    edges.push({ from: nonSources[i], to: nonSources[i + 1] })
  }
  return edges
}

function edgePath(a: PNode, b: PNode): string {
  const x1 = a.x + NODE_W
  const y1 = a.y + NODE_H / 2
  const x2 = b.x
  const y2 = b.y + NODE_H / 2
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}

export function PipelineModule() {
  const { toast } = useToast()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState<string | null>(null)
  const [selNodeId, setSelNodeId] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [activeBuild, setActiveBuild] = useState<PBuild | null>(null)
  const [buildOpen, setBuildOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const d = await api<{ pipelines: Pipeline[] }>('/api/pipelines')
        setPipelines(d.pipelines)
        setSelId(d.pipelines[0]?.id ?? null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const pipeline = pipelines.find((p) => p.id === selId) ?? null
  const edges = useMemo(() => (pipeline ? inferEdges(pipeline.nodes) : []), [pipeline])
  const selNode = pipeline?.nodes.find((n) => n.id === selNodeId) ?? null

  const canvasW = pipeline ? Math.max(...pipeline.nodes.map((n) => n.x)) + NODE_W + 40 : 800
  const canvasH = pipeline ? Math.max(...pipeline.nodes.map((n) => n.y)) + NODE_H + 40 : 400

  const runBuild = async () => {
    if (!pipeline) return
    setBuilding(true)
    setActiveBuild(null)
    try {
      await new Promise((r) => setTimeout(r, 600))
      const d = await post<{ build: PBuild }>('/api/pipelines', { pipelineId: pipeline.id })
      setActiveBuild({ ...d.build, startedAt: new Date().toISOString() })
      setBuildOpen(true)
      toast({ title: '判读运行成功', description: `${d.build.rowsProcessed.toLocaleString()} 点已解算并写入评估结果集（${d.build.durationSec}s）` })
      const fresh = await api<{ pipelines: Pipeline[] }>('/api/pipelines')
      setPipelines(fresh.pipelines)
    } catch (e) {
      toast({ title: '判读运行失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="判读管道" desc="加载中…" />
        <LoadingGrid />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="判读管道"
        desc="低代码试验数据判读流水线：时统校正 → 参数提取 → 多源融合 → 偏差解算 → 指标统计，数据就绪自动触发，亦可手动运行。"
        actions={
          <div className="flex items-center gap-2">
            <Select onValueChange={setSelId} value={selId ?? ''}>
              <SelectTrigger className="h-8 w-56 text-xs" aria-label="选择管道">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StatusPill status={pipeline?.status ?? 'healthy'} />
            <Button size="sm" onClick={runBuild} disabled={building || !pipeline}>
              {building ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              {building ? '判读中…' : '运行判读'}
            </Button>
          </div>
        }
      />

      {!pipeline ? (
        <EmptyState text="暂无判读管道" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,320px]">
          {/* DAG 画布 */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Workflow className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate text-sm font-medium text-zinc-800">{pipeline.name}</span>
                <Badge variant="secondary" className="text-[10px]">{pipeline.schedule}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Clock className="h-3 w-3" />
                上次运行 {fmtTime(pipeline.lastBuildAt)}
              </div>
            </div>

            <ScrollArea className="overflow-x-auto">
              <div className="min-w-fit p-4">
                <svg width={canvasW} height={canvasH} role="img" aria-label="判读数据流图" className="max-w-none">
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M 0 0 L 8 4 L 0 8 z" className="fill-zinc-400" />
                    </marker>
                  </defs>
                  {/* 网格背景 */}
                  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.8" className="fill-zinc-200" />
                  </pattern>
                  <rect width={canvasW} height={canvasH} fill="url(#grid)" rx="4" />

                  {/* 边 */}
                  {edges.map((e, i) => (
                    <path key={i} d={edgePath(e.from, e.to)} fill="none" strokeWidth={1.8} markerEnd="url(#arrow)" className="stroke-zinc-400" />
                  ))}

                  {/* 节点 */}
                  {pipeline.nodes.map((n) => {
                    const meta = NODE_META[n.type] ?? NODE_META.source
                    const active = n.id === selNodeId
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${n.x}, ${n.y})`}
                        onClick={() => setSelNodeId(n.id)}
                        className="cursor-pointer"
                        role="button"
                        aria-label={`${meta.label}节点：${n.label}`}
                      >
                        <rect
                          width={NODE_W}
                          height={NODE_H}
                          rx={8}
                          className={cn(
                            'transition-all',
                            active ? 'stroke-zinc-900 stroke-[1.6]' : 'stroke-2 hover:stroke-zinc-500',
                            meta.border,
                          )}
                          fill="white"
                        />
                        <rect width={NODE_W} height={20} rx={8} className={meta.color} fillOpacity={0.6} />
                        <rect y={12} width={NODE_W} height={8} className="fill-white" />
                        <text x={8} y={14} className="fill-zinc-600 text-[9px] font-semibold tracking-wide">
                          {meta.header}
                        </text>
                        <g transform="translate(8, 26)">{meta.icon}</g>
                        <text x={28} y={32} className="fill-zinc-800 text-[11px] font-medium">
                          {n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label}
                        </text>
                        <text x={28} y={46} className="fill-zinc-400 text-[9px]">
                          {String(Object.values(n.config)[0] ?? '').slice(0, 26)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </ScrollArea>

            {/* 图例 */}
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 px-4 py-2 text-[10px] text-zinc-500">
              {Object.entries(NODE_META).map(([k, m]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border', m.color)}>{m.icon}</span>
                  {m.label}
                </span>
              ))}
              <span className="ml-auto">点击节点查看配置 →</span>
            </div>
          </div>

          {/* 右侧：节点配置 / 判读历史 */}
          <div className="space-y-4">
            {selNode ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-md border', (NODE_META[selNode.type] ?? NODE_META.source).color)}>
                    {(NODE_META[selNode.type] ?? NODE_META.source).icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{selNode.label}</p>
                    <p className="text-[10px] text-zinc-400">{(NODE_META[selNode.type] ?? NODE_META.source).label} 节点 · 第 {selNode.order + 1} 步</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {Object.entries(selNode.config).map(([k, v]) => (
                    <div key={k} className="rounded-md bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{k}</p>
                      <p className="mt-0.5 break-words font-mono text-xs text-zinc-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="选择画布中的节点查看配置" />
            )}

            {/* 判读运行历史 */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                判读运行历史
              </h3>
              {activeBuild && (
                <button
                  onClick={() => setBuildOpen(true)}
                  className="mb-2 flex w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-800">本次运行：{fmtNum(activeBuild.rowsProcessed)} 点 · {activeBuild.durationSec}s</p>
                    <p className="text-[10px] text-emerald-600">点击查看判读日志</p>
                  </div>
                </button>
              )}
              <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {pipeline.builds.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => { setActiveBuild(b); setBuildOpen(true) }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-zinc-50"
                    >
                      {b.status === 'succeeded' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : b.status === 'failed' ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-700">
                          {fmtDateTime(b.startedAt)} · {fmtNum(b.rowsProcessed)} 点 · {b.durationSec}s
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 判读日志对话框 */}
      {buildOpen && activeBuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBuildOpen(false)} role="dialog" aria-modal="true" aria-label="判读运行日志">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', statusColor[activeBuild.status])} />
                <h3 className="text-sm font-semibold text-zinc-900">判读运行日志</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {fmtNum(activeBuild.rowsProcessed)} 点 · {activeBuild.durationSec}s
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setBuildOpen(false)}>关闭</Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto bg-zinc-950 p-4 font-mono text-xs leading-relaxed">
              {activeBuild.logs.map((l, i) => (
                <p key={i} className={cn(
                  'flex gap-2 py-0.5',
                  l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-400' : 'text-zinc-300',
                )}>
                  <span className="text-zinc-600">[{l.t}]</span>
                  <span className="uppercase">{l.level}</span>
                  <span>{l.msg}</span>
                </p>
              ))}
              <p className="mt-2 text-emerald-400">✓ 判读完成（指标统计已提交，证据链已更新）</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
