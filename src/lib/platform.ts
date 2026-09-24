// 平台共享类型与工具（数字化试验鉴定平台）
export type ModuleKey =
  | 'prototypeIntake'
  | 'digitalCase'
  | 'overview'
  | 'campaign'
  | 'missionThread'
  | 'scenarioWorkspace'
  | 'vva'
  | 'evidenceGate'
  | 'decisionProvenance'
  | 'governance'
  | 'resources'
  | 'datasets'
  | 'pipelines'
  | 'ontology'
  | 'objects'
  | 'workshop'
  | 'contour'
  | 'automate'
  | 'timeseries'
  | 'lineage'
  | 'aip'

export const MODULES: { key: ModuleKey; label: string; icon: string; group: string }[] = [
  { key: 'prototypeIntake', label: '数字样机3.0接收与资格', icon: 'package-check', group: '数字样机3.0' },
  { key: 'digitalCase', label: '数字化试验鉴定 Case', icon: 'waypoints', group: '总览' },
  { key: 'overview', label: '试验总览', icon: 'gauge', group: '总览' },
  { key: 'campaign', label: '试验策划与证据矩阵', icon: 'clipboard-check', group: '任务策划' },
  { key: 'missionThread', label: 'Mission Thread 任务线程', icon: 'route', group: '任务策划' },
  { key: 'ontology', label: '试验对象与关系', icon: 'boxes', group: '任务策划' },
  { key: 'objects', label: '试验对象检索', icon: 'search', group: '任务策划' },
  { key: 'resources', label: '试验资源', icon: 'plug', group: '试验准备' },
  { key: 'datasets', label: '试验数据', icon: 'table', group: '试验准备' },
  { key: 'pipelines', label: '判读管道', icon: 'git-branch', group: '试验准备' },
  { key: 'scenarioWorkspace', label: 'Scenario 场景沙箱', icon: 'layers-3', group: '数字试验' },
  { key: 'vva', label: 'Model VV&A', icon: 'shield-check', group: '数字试验' },
  { key: 'workshop', label: '试验指挥台', icon: 'app-window', group: '试验实施' },
  { key: 'contour', label: '评估分析', icon: 'bar-chart-3', group: '试验实施' },
  { key: 'automate', label: '试验自动化', icon: 'zap', group: '试验实施' },
  { key: 'timeseries', label: '遥测时序', icon: 'activity', group: '试验实施' },
  { key: 'evidenceGate', label: 'Evidence Gate 证据门控', icon: 'gavel', group: '鉴定与智能' },
  { key: 'governance', label: '试验鉴定治理工作台', icon: 'clipboard-check', group: '鉴定与智能' },
  { key: 'decisionProvenance', label: '鉴定审计 / Decision Provenance', icon: 'fingerprint', group: '鉴定与智能' },
  { key: 'lineage', label: '证据链追溯', icon: 'workflow', group: '鉴定与智能' },
  { key: 'aip', label: '鉴定助手', icon: 'bot', group: '鉴定与智能' },
]

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error ?? `请求失败 ${res.status}`)
  return data as T
}

export function post<T>(path: string, body: unknown): Promise<T> {
  let payload = body
  if (path === '/api/actions' && body && typeof body === 'object' && !Array.isArray(body)) {
    const { performedBy: _legacyPerformedBy, ...rest } = body as Record<string, unknown>
    payload = rest
  }
  return api<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}
export function patch<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + ' 万'
  return n.toLocaleString()
}

export function fmtTime(t: string | Date | null | undefined): string {
  if (!t) return '—'
  const d = typeof t === 'string' ? new Date(t) : t
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export function fmtDateTime(t: string | Date | null | undefined): string {
  if (!t) return '—'
  const d = typeof t === 'string' ? new Date(t) : t
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 数据质量分 → 颜色
export function healthColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 80) return 'text-amber-600'
  return 'text-red-600'
}

// 试验事件状态徽标
export const eventStatusBadge: Record<string, string> = {
  '待执行': 'border-zinc-200 bg-zinc-50 text-zinc-600',
  '执行中': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  '数据分析中': 'border-sky-200 bg-sky-50 text-sky-600',
  '已完成': 'border-zinc-200 bg-zinc-50 text-zinc-500',
  '暂停': 'border-red-200 bg-red-50 text-red-600',
}

// 指标评估状态
export const measureStatusBadge: Record<string, string> = {
  '达标': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  '未达标': 'border-red-200 bg-red-50 text-red-700',
  '统计中': 'border-amber-200 bg-amber-50 text-amber-600',
}

// 缺陷等级
export const severityColor: Record<string, string> = {
  'I类': 'bg-red-100 text-red-700 border-red-200',
  'II类': 'bg-amber-100 text-amber-700 border-amber-200',
  'III类': 'bg-sky-100 text-sky-700 border-sky-200',
}

export const statusColor: Record<string, string> = {
  // 资源
  online: 'bg-emerald-500',
  busy: 'bg-amber-400',
  maintenance: 'bg-red-500',
  offline: 'bg-zinc-400',
  syncing: 'bg-amber-400 animate-pulse',
  // 管道/构建
  running: 'bg-amber-400 animate-pulse',
  succeeded: 'bg-emerald-500',
  failed: 'bg-red-500',
  cancelled: 'bg-zinc-400',
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-400',
  failing: 'bg-red-500',
  // 数据集
  ready: 'bg-emerald-500',
  building: 'bg-amber-400 animate-pulse',
  error: 'bg-red-500',
  paused: 'bg-zinc-400',
  // 告警
  open: 'bg-red-500',
  acknowledged: 'bg-amber-400',
  resolved: 'bg-emerald-500',
}

export const alertSeverityBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
}
