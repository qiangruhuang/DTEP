'use client'

// 应用外壳：左侧深色导航 + 顶栏 + 内容区（响应式：移动端抽屉）
import { ReactNode, useState } from 'react'
import { MODULES, ModuleKey } from '@/lib/platform'
import { cn } from '@/lib/utils'
import {
  Gauge, Radio, Table, GitBranch, Boxes, Search, AppWindow, BarChart3, Zap, Activity, Bot, Workflow,
  Target, Menu, X, ChevronRight, Bell, ClipboardCheck, Route, Layers3, ShieldCheck, Gavel, Waypoints, Fingerprint, PackageCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

const ICONS: Record<string, ReactNode> = {
  'package-check': <PackageCheck className="h-4 w-4" />,
  waypoints: <Waypoints className="h-4 w-4" />,
  gauge: <Gauge className="h-4 w-4" />,
  'clipboard-check': <ClipboardCheck className="h-4 w-4" />,
  route: <Route className="h-4 w-4" />,
  'layers-3': <Layers3 className="h-4 w-4" />,
  'shield-check': <ShieldCheck className="h-4 w-4" />,
  gavel: <Gavel className="h-4 w-4" />,
  fingerprint: <Fingerprint className="h-4 w-4" />,
  plug: <Radio className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  'git-branch': <GitBranch className="h-4 w-4" />,
  boxes: <Boxes className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  'app-window': <AppWindow className="h-4 w-4" />,
  'bar-chart-3': <BarChart3 className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  bot: <Bot className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
}

const GROUPS = [...new Set(MODULES.map((m) => m.group))]

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-zinc-800 px-4 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-zinc-950">
        <Target className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-zinc-50">天衡 DTEP</p>
        <p className="text-[10px] text-zinc-500">数字化试验鉴定平台 · 原型</p>
      </div>
    </div>
  )
}

function NavList({ current, onPick }: { current: ModuleKey; onPick: (m: ModuleKey) => void }) {
  return (
    <nav aria-label="平台模块导航" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g}>
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{g}</p>
          <ul className="space-y-0.5">
            {MODULES.filter((m) => m.group === g).map((m) => {
              const active = m.key === current
              return (
                <li key={m.key}>
                  <button
                    onClick={() => onPick(m.key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-zinc-800 font-medium text-zinc-50'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={cn('flex h-5 w-5 items-center justify-center', active ? 'text-emerald-400' : 'text-zinc-500')}>
                      {ICONS[m.icon]}
                    </span>
                    <span className="truncate">{m.label}</span>
                    {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-600" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell({
  current,
  onNavigate,
  children,
}: {
  current: ModuleKey
  onNavigate: (m: ModuleKey) => void
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100/60 text-zinc-900">
      <div className="flex flex-1">
        {/* 桌面侧栏 */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-zinc-900 lg:flex">
          <Brand />
          <NavList current={current} onPick={onNavigate} />
          <div className="border-t border-zinc-800 px-4 py-3">
            <p className="text-[10px] leading-relaxed text-zinc-600">
              以中国装备试验鉴定全寿命流程为业务主线
              <br />
              吸收 Ontology · Action · Decision Lineage 方法，贯通数字样机→试验→状态鉴定→作战试验→列装定型→在役考核
            </p>
          </div>
        </aside>

        {/* 主区 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
              {/* 移动端菜单 */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label="打开导航">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-60 border-zinc-800 bg-zinc-900 p-0 [&>button]:text-zinc-400">
                  <SheetTitle className="sr-only">导航菜单</SheetTitle>
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between pr-3">
                      <Brand />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="关闭导航">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <NavList
                      current={current}
                      onPick={(m) => {
                        onNavigate(m)
                        setMobileOpen(false)
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm font-medium text-zinc-900">
                  {MODULES.find((m) => m.key === current)?.label}
                </span>
                <span className="text-[10px] text-zinc-500">{MODULES.find((m) => m.key === current)?.group}</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 md:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  试验资源在线
                </span>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="通知">
                  <Bell className="h-4 w-4 text-zinc-500" />
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                </Button>
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 py-0.5 pl-0.5 pr-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-100">
                    衡
                  </span>
                  <span className="hidden text-xs text-zinc-600 sm:inline">试验总师 · 周衡</span>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          <footer className="mt-auto border-t border-zinc-200 bg-white/70 px-4 py-3 text-xs text-zinc-500 sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span>天衡 DTEP 数字化试验鉴定平台原型 — 以中国试验鉴定业务为主线，融合数字样机、M&S/LVC、VV&A、证据治理与决策血缘</span>
              <span className="text-zinc-400">对象 · 关系 · 动作 · 证据 · 审查 · 决策</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
