'use client'

// 试验资源模块：靶场/测控/仿真节点等资源的接入、心跳与调度状态
import { useEffect, useState } from 'react'
import { api, patch, post, fmtNum, fmtTime, ModuleKey } from '@/lib/platform'
import { ModuleHeader, StatusDot, LoadingGrid, EmptyState } from './shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Radio, Plus, RefreshCw, Map, Radar, Antenna, Network, Waves, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type Resource = {
  id: string; code: string; name: string; kind: string; site: string; description: string
  status: string; utilization: number; lastHeartbeat: string | null; dataVolume: number
  heartbeatInterval: string; datasetCount: number
}

const KIND_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  range: { label: '试验场区', icon: <Map className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  tracking: { label: '测控装备', icon: <Radar className="h-5 w-5" />, color: 'text-sky-600 bg-sky-50 border-sky-100' },
  telemetry: { label: '遥测站', icon: <Antenna className="h-5 w-5" />, color: 'text-violet-600 bg-violet-50 border-violet-100' },
  sim: { label: '仿真节点', icon: <Network className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  threat: { label: '威胁模拟', icon: <Waves className="h-5 w-5" />, color: 'text-red-600 bg-red-50 border-red-100' },
  lab: { label: '实验室', icon: <FlaskConical className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50 border-teal-100' },
}

const STATUS_LABEL: Record<string, string> = {
  online: '在线', busy: '占用中', maintenance: '检修', offline: '离线',
}

export function ResourcesModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const { toast } = useToast()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pingingId, setPingingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', kind: 'range', site: '', description: '', heartbeatInterval: '每 30 秒' })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api<{ resources: Resource[] }>('/api/resources')
      setResources(d.resources)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const ping = async (r: Resource) => {
    setPingingId(r.id)
    try {
      await patch('/api/resources', { id: r.id, action: 'ping' })
      await load()
      toast({ title: '心跳检测完成', description: `「${r.name}」资源状态正常，数据通道畅通` })
    } catch (e) {
      toast({ title: '心跳检测失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setPingingId(null)
    }
  }

  const create = async () => {
    if (!form.name.trim()) {
      toast({ title: '请填写资源名称' })
      return
    }
    setCreating(true)
    try {
      await post('/api/resources', form)
      setDialogOpen(false)
      setForm({ name: '', kind: 'range', site: '', description: '', heartbeatInterval: '每 30 秒' })
      await load()
      toast({ title: '试验资源已接入', description: '资源心跳与数据采集通道已建立' })
    } catch (e) {
      toast({ title: '接入失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="试验资源"
        desc="试验资源池（参照美军 MRTFB 靶场与试验设施基地体系）：管理场区、测控、遥测、仿真节点与威胁模拟资源，支持分布式 LVC 联合试验组网。"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            接入新资源
          </Button>
        }
      />

      {loading ? (
        <LoadingGrid rows={4} />
      ) : resources.length === 0 ? (
        <EmptyState text="暂无试验资源" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {resources.map((r) => {
              const meta = KIND_META[r.kind] ?? KIND_META.range
              return (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex flex-col rounded-lg border bg-white p-4 shadow-xs transition-shadow hover:shadow-sm',
                    r.status === 'maintenance' || r.status === 'offline' ? 'border-red-200' : 'border-zinc-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md border', meta.color)}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-900">{r.name}</h3>
                        <p className="text-xs text-zinc-500">{meta.label} · <span className="font-mono">{r.code}</span></p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <StatusDot status={r.status} />
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-relaxed text-zinc-600">{r.description || '—'}</p>
                  <p className="mt-2 truncate font-mono text-[11px] text-zinc-400">{r.site}</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{fmtNum(r.dataVolume)}</p>
                      <p className="text-[10px] text-zinc-400">累计数据点</p>
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', r.utilization >= 75 ? 'text-amber-600' : 'text-zinc-800')}>{r.utilization}%</p>
                      <p className="text-[10px] text-zinc-400">利用率</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{fmtTime(r.lastHeartbeat)}</p>
                      <p className="text-[10px] text-zinc-400">最近心跳</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-400">{r.heartbeatInterval}</span>
                    <div className="flex gap-1.5">
                      {r.datasetCount > 0 && (
                        <Button size="sm" variant="secondary" className="h-7" onClick={() => onNavigate('datasets')}>
                          落数据集
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={pingingId === r.id}
                        onClick={() => ping(r)}
                      >
                        <RefreshCw className={cn('mr-1 h-3 w-3', pingingId === r.id && 'animate-spin')} />
                        心跳检测
                      </Button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>接入试验资源</DialogTitle>
            <DialogDescription>登记新的试验资源并建立心跳与数据采集通道，接入后即可在试验事件中调度。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>资源名称 *</Label>
              <Input placeholder="如：东南沿海试验场" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>资源类型</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>驻地名 / 台位</Label>
              <Input placeholder="如：场区 B · 阵地 3 号" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>心跳周期</Label>
              <Select value={form.heartbeatInterval} onValueChange={(v) => setForm({ ...form, heartbeatInterval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['实时流式', '每 5 秒', '每 30 秒', '每 6 小时', '手动'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea rows={2} placeholder="资源能力说明…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={create} disabled={creating}>
              {creating ? '接入中…' : '接入并建立通道'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
