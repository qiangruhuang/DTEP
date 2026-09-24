'use client'

// 共享小组件：状态点、统计卡、区块标题、加载态
import { ReactNode } from 'react'
import { statusColor } from '@/lib/platform'
import { Skeleton } from '@/components/ui/skeleton'

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor[status] ?? 'bg-zinc-400'}`}
      aria-label={`状态：${status}`}
    />
  )
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
      <StatusDot status={status} />
      {label ?? status}
    </span>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'emerald',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  accent?: 'emerald' | 'amber' | 'red' | 'zinc'
}) {
  const accents = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    zinc: 'text-zinc-600 bg-zinc-50 border-zinc-100',
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${accents[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function ModuleHeader({ title, desc, actions }: { title: string; desc: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{desc}</p>
      </div>
      {actions}
    </div>
  )
}

export function LoadingGrid({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">
      {text}
    </div>
  )
}

// 通用数据表格（用于预览/对象集）
export function DataTable({
  columns,
  rows,
  maxHeight = 'max-h-80',
}: {
  columns: { key: string; label?: string; render?: (row: any) => ReactNode; width?: string }[]
  rows: any[]
  maxHeight?: string
}) {
  return (
    <div className={`overflow-auto rounded-md border border-zinc-200 ${maxHeight}`}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`border-b border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600 whitespace-nowrap ${c.width ?? ''}`}>
                {c.label ?? c.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-zinc-50/50 hover:bg-emerald-50/40">
              {columns.map((c) => (
                <td key={c.key} className="border-b border-zinc-100 px-3 py-2 text-zinc-700 whitespace-nowrap">
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
