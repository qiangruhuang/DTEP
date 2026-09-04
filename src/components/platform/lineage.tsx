'use client'

// 证据链追溯：分层 DAG（试验任务 → 鉴定指标 → 试验事件 → 试验数据 → 鉴定报告）
// 对应美军 T&E 的需求-试验-证据追溯矩阵（RTM）与 DOT&E 报告证据体系
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Target, Gauge, CalendarClock, Database, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type LNode = { id: string; label: string; sub: string; layer: number; idx: number; kind: string; status?: string; health?: number }
type LEdge = { from: string; to: string }

const LAYER_LABELS = ['① 试验任务(TEMP)', '② 鉴定指标(MOP/MOE)', '③ 试验事件(DT/OT/LFT/数字)', '④ 试验数据(原始/判读)', '⑤ 鉴定报告']

const KIND_STYLE: Record<string, { icon: React.ReactNode; cls: string }> = {
  program: { icon: <Target className="h-3 w-3" />, cls: 'fill-violet-50 stroke-violet-400' },
  measure: { icon: <Gauge className="h-3 w-3" />, cls: 'fill-emerald-50 stroke-emerald-500' },
  event: { icon: <CalendarClock className="h-3 w-3" />, cls: 'fill-sky-50 stroke-sky-400' },
  data: { icon: <Database className="h-3 w-3" />, cls: 'fill-teal-50 stroke-teal-400' },
  report: { icon: <FileText className="h-3 w-3" />, cls: 'fill-amber-50 stroke-amber-500' },
}

const NODE_W = 168
const NODE_H = 46
const GAP_X = 64
const GAP_Y = 22

export function LineageModule() {
  const [data, setData] = useState<{ nodes: LNode[]; edges: LEdge[] } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [sel, setSel] = useState<string | null>(null)

  useEffect(() => {
    api<{ nodes: LNode[]; edges: LEdge[] }>('/api/lineage').then(setData)
  }, [])

  // 布局：按层分列，按 idx 排行
  const layout = useMemo(() => {
    if (!data) return null
    const byLayer: Record<number, LNode[]> = {}
    for (const n of data.nodes) {
      if (!byLayer[n.layer]) byLayer[n.layer] = []
      byLayer[n.layer].push(n)
    }
    const pos: Record<string, { x: number; y: number; node: LNode }> = {}
    const maxCount = Math.max(...Object.values(byLayer).map((v) => v.length))
    const canvasH = Math.max(maxCount * (NODE_H + GAP_Y) + 60, 420)
    for (const [layerStr, nodes] of Object.entries(byLayer)) {
      const layer = Number(layerStr)
      const col = layer * (NODE_W + GAP_X)
      const totalH = nodes.length * NODE_H + (nodes.length - 1) * GAP_Y
      const startY = Math.max(30, (canvasH - totalH) / 2)
      nodes.forEach((n, i) => {
        pos[n.id] = { x: col, y: startY + i * (NODE_H + GAP_Y), node: n }
      })
    }
    const canvasW = Object.keys(byLayer).length * (NODE_W + GAP_X)
    return { pos, canvasW, canvasH }
  }, [data])

  // 高亮传播：节点 + 直接关联边
  const related = useMemo(() => {
    if (!data || !hover) return null
    const nodeIds = new Set([hover])
    for (const e of data.edges) {
      if (e.from === hover) nodeIds.add(e.to)
      if (e.to === hover) nodeIds.add(e.from)
    }
    return nodeIds
  }, [data, hover])

  const selectedNode = data?.nodes.find((n) => n.id === sel)

  if (!data || !layout) {
    return (
      <div className="space-y-4">
        <ModuleHeader title="证据链追溯" desc="加载中…" />
        <LoadingGrid />
      </div>
    )
  }

  const edgePath = (fromId: string, toId: string) => {
    const a = layout.pos[fromId]
    const b = layout.pos[toId]
    if (!a || !b) return ''
    const x1 = a.x + NODE_W
    const y1 = a.y + NODE_H / 2
    const x2 = b.x
    const y2 = b.y + NODE_H / 2
    const mid = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="证据链追溯"
        desc="鉴定证据链（对应美军 RTM 需求-试验-证据追溯）：试验任务 → 鉴定指标 → 试验事件 → 试验数据 → 鉴定报告，逐级支撑鉴定结论，可追踪任一环节的覆盖与缺口。"
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {LAYER_LABELS.map((label, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{label}</Badge>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400">悬停节点查看上下游 · 点击查看详情</p>
        </div>

        <div className="overflow-x-auto p-4">
          <svg
            width={Math.max(layout.canvasW, 760)}
            height={layout.canvasH + 20}
            role="img"
            aria-label="鉴定证据链追溯图"
            className="max-w-none"
          >
            <defs>
              <marker id="larrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" className="fill-zinc-300" />
              </marker>
            </defs>

            {/* 层标题 */}
            {LAYER_LABELS.map((label, i) => (
              <text
                key={label}
                x={i * (NODE_W + GAP_X) + NODE_W / 2}
                y={14}
                textAnchor="middle"
                className="fill-zinc-400 text-[11px] font-medium"
              >
                {label}
              </text>
            ))}

            {/* 边 */}
            {data.edges.map((e, i) => {
              const isRelated = hover && (e.from === hover || e.to === hover)
              const dim = hover && !isRelated
              return (
                <path
                  key={i}
                  d={edgePath(e.from, e.to)}
                  fill="none"
                  strokeWidth={isRelated ? 2 : 1.2}
                  markerEnd="url(#larrow)"
                  className={cn(
                    'transition-all',
                    dim ? 'stroke-zinc-100 opacity-40' : isRelated ? 'stroke-emerald-500' : 'stroke-zinc-300',
                  )}
                />
              )
            })}

            {/* 节点 */}
            {data.nodes.map((n) => {
              const p = layout.pos[n.id]
              if (!p) return null
              const ks = KIND_STYLE[n.kind] ?? KIND_STYLE.data
              const isHover = hover === n.id
              const isRelated = related?.has(n.id) ?? false
              const dim = hover && !isRelated
              const isSel = sel === n.id
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSel(isSel ? null : n.id)}
                  className="cursor-pointer"
                  opacity={dim ? 0.35 : 1}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={7}
                    className={cn(
                      'transition-all',
                      ks.cls,
                      isHover || isSel ? 'stroke-[2]' : 'stroke-[1.2]',
                      isSel && 'stroke-zinc-900',
                    )}
                    stroke={n.kind === 'measure' && n.status === '未达标' ? '#ef4444' : n.kind === 'event' && n.status === '暂停' ? '#ef4444' : undefined}
                  />
                  <text x={10} y={19} className="fill-zinc-800 text-[11px] font-medium">
                    {n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}
                  </text>
                  <text x={10} y={35} className="fill-zinc-400 text-[9px]">
                    {n.sub.length > 22 ? n.sub.slice(0, 21) + '…' : n.sub}
                  </text>
                  {(n.kind === 'measure' && n.status === '未达标') || (n.kind === 'event' && n.status === '暂停') ? (
                    <circle cx={NODE_W - 12} cy={12} r={4} className="fill-red-500" />
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* 选中节点详情 + 上下游分析 */}
      {selectedNode && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            {KIND_STYLE[selectedNode.kind]?.icon}
            {selectedNode.label}
            <Badge variant="secondary" className="text-[10px]">{LAYER_LABELS[selectedNode.layer]}</Badge>
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{selectedNode.sub}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">上游支撑（{data.edges.filter((e) => e.to === selectedNode.id).length}）</p>
              <ul className="mt-1.5 space-y-1">
                {data.edges.filter((e) => e.to === selectedNode.id).map((e, i) => {
                  const up = data.nodes.find((n) => n.id === e.from)
                  return up ? <li key={i} className="font-mono text-xs text-zinc-700">← {up.label}</li> : null
                })}
                {data.edges.filter((e) => e.to === selectedNode.id).length === 0 && <li className="text-xs text-zinc-400">（源头节点：试验任务）</li>}
              </ul>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">下游支撑（{data.edges.filter((e) => e.from === selectedNode.id).length}）</p>
              <ul className="mt-1.5 space-y-1">
                {data.edges.filter((e) => e.from === selectedNode.id).map((e, i) => {
                  const down = data.nodes.find((n) => n.id === e.to)
                  return down ? <li key={i} className="font-mono text-xs text-zinc-700">→ {down.label}</li> : null
                })}
                {data.edges.filter((e) => e.from === selectedNode.id).length === 0 && <li className="text-xs text-zinc-400">（末端节点：鉴定报告）</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
