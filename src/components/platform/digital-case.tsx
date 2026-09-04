'use client'

import { ReactNode, useEffect, useState } from 'react'
import { api, ModuleKey, eventStatusBadge, measureStatusBadge } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { ModuleHeader, LoadingGrid } from './shared'
import { CaseExecutionPanel } from './case-execution'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  FlaskConical,
  Gavel,
  GitBranch,
  Layers3,
  Network,
  Play,
  RefreshCw,
  Route,
  ShieldCheck,
  Target,
  Waypoints,
  XCircle,
} from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Resource = { code: string; name: string; kind: string; site: string; status: string; utilization: number }
type Dataset = { path: string; name: string; description: string; domain: string; origin: string; qualityScore: number; rowCount: number }

type CaseData = {
  case: Entry | null
  program: Entry | null
  missionThread: Entry | null
  scenarios: Entry[]
  events: Entry[]
  measures: Entry[]
  models: Entry[]
  evidenceGates: Entry[]
  deficiencies: Entry[]
  reports: Entry[]
  resources: Resource[]
  datasets: Dataset[]
  demo: {
    currentConclusion: string
    candidateResult: { missionSuccess: number; threshold: number; twinNrmse: number; highStressNrmse: number }
    closurePlan: string[]
  }
}

type Stage = {
  id: number
  short: string
  title: string
  object: string
  module: ModuleKey
  icon: ReactNode
  input: string
  output: string
}

const STAGES: Stage[] = [
  { id: 0, short: '任务问题', title: '提出任务级鉴定问题', object: 'CASE-01 / MT-01', module: 'missionThread', icon: <Target className="h-4 w-4" />, input: '作战使用要求、任务目标、关键威胁', output: '端到端 Mission Thread + 待回答鉴定问题' },
  { id: 1, short: '证据缺口', title: '识别任务线程证据缺口', object: 'MT-01 · S3/S4', module: 'campaign', icon: <Route className="h-4 w-4" />, input: '任务步骤、已有试验、缺陷与指标覆盖', output: '强干扰数据链与任务恢复证据缺口' },
  { id: 2, short: '场景设计', title: '构造基线与高压候选场景', object: 'SC-BASE → SC-COA-01', module: 'scenarioWorkspace', icon: <Layers3 className="h-4 w-4" />, input: '威胁、电磁、兵力、天气、欺骗条件', output: '场景 + Test Model Assembly + 3.0基线来源' },
  { id: 3, short: '试验设计', title: '形成 Live + LVC + Digital 组合试验设计', object: 'TE-25-002 / 004 / 009', module: 'campaign', icon: <FlaskConical className="h-4 w-4" />, input: '场景覆盖缺口、指标、成本与风险约束', output: '实测锚点 + LVC 扩展 + 数字压力试验' },
  { id: 4, short: 'LVC编排', title: '编排分布式试验资源与配置基线', object: 'R-01 / R-05 / R-06 / R-09', module: 'resources', icon: <Network className="h-4 w-4" />, input: '试验事件、L/V/C实体、Test Model Assembly与接口契约', output: '可执行联合任务环境 + 装配/资源配置基线' },
  { id: 5, short: '执行与数据', title: '实例化 Run 并冻结执行配置/数据血缘', object: 'TestRun → Dataset → Pipeline', module: 'workshop', icon: <Play className="h-4 w-4" />, input: '冻结场景、Assembly Snapshot、3.0 ModelBaseline、资源与试验脚本', output: '可重放Run配置 + 原始数据 + 运行日志 + 统计结果' },
  { id: 6, short: 'VV&A', title: '检查数字模型是否可用于当前鉴定用途', object: 'MD-02 / MD-07 / MD-08', module: 'vva', icon: <ShieldCheck className="h-4 w-4" />, input: 'Intended Use、Validation Domain、实测锚点', output: '可用 / 条件可用 / 禁止进入正式证据' },
  { id: 7, short: '证据融合', title: '融合实测、LVC 与纯数字证据', object: 'M-03 / M-05 / M-07 / M-13', module: 'contour', icon: <BarChart3 className="h-4 w-4" />, input: '数据质量、模型可信度、统计结果、血缘', output: '性能判定 + 不确定性 + 证据充分性' },
  { id: 8, short: '门控结论', title: 'Evidence Package 经规则服务形成可审计鉴定决策', object: 'EvidencePackage → GateRuleSet → EvidenceGate', module: 'evidenceGate', icon: <Gavel className="h-4 w-4" />, input: '指标结果 + 证据包 + VV&A + 场景适用域', output: '正式结论 / 条件结论 / 阻塞与补试动作' },
]

export function DigitalCaseModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      setData(await api<CaseData>('/api/digital-case'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const current = STAGES[stage]
  const scenarioBase = data?.scenarios.find((x) => x.pk === 'SC-BASE')
  const scenarioStress = data?.scenarios.find((x) => x.pk === 'SC-COA-01')
  const gateM03 = data?.evidenceGates.find((x) => x.pk === 'EG-M03')
  const gateM13 = data?.evidenceGates.find((x) => x.pk === 'EG-M13')

  const completion = Math.round(((stage + 1) / STAGES.length) * 100)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="数字化试验鉴定 Case · 强电磁压制下察打一体任务效能"
        desc="一条可点击演示的端到端业务链：从任务级鉴定问题出发，经场景、试验设计、LVC、数字试验、VV&A 和证据融合，最终形成 Evidence Gate 鉴定决策。"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setStage(0); load() }} disabled={loading}><RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />刷新 Case</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate('decisionProvenance')}>鉴定审计视图</Button>
            <Button size="sm" onClick={() => onNavigate(current.module)}>进入对应工作台<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
          </div>
        }
      />

      {loading && !data ? <LoadingGrid rows={4} /> : data ? (
        <>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">CASE-01</Badge>
                  <Badge variant="outline">TP-25-01 · X9A 试验鉴定</Badge>
                  <Badge variant="outline" className={cn(data.case?.data.status === '正式结论已冻结' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>当前：{data.case?.data.status ?? '证据闭环中'}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-zinc-900">鉴定问题：X9A 在强电磁压制、高威胁条件下，能否完成远程搜索—识别—分发—决策—突防—交战—毁伤评估任务闭环？</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">这个 Case 不以“模型跑出一个任务成功率”为终点，而以“什么证据、在什么适用域、以多大不确定性，足以支撑什么级别的鉴定结论”为终点。</p>
              </div>
              <div className="min-w-[220px] rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between text-xs text-zinc-500"><span>演示流程</span><span>{stage + 1}/{STAGES.length}</span></div>
                <Progress value={completion} className="mt-2 h-2" />
                <p className="mt-2 text-xs font-medium text-zinc-800">{current.short} · {current.title}</p>
              </div>
            </div>
          </section>

          <CaseExecutionPanel onCaseChanged={load} />

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="overflow-x-auto p-3">
              <div className="flex min-w-[1040px] items-center gap-1">
                {STAGES.map((item, index) => (
                  <div key={item.id} className="flex flex-1 items-center">
                    <button
                      onClick={() => setStage(index)}
                      className={cn(
                        'min-w-0 flex-1 rounded-md border px-2 py-2 text-left transition-colors',
                        index === stage ? 'border-emerald-300 bg-emerald-50' : index < stage ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white hover:bg-zinc-50',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', index === stage ? 'bg-emerald-600 text-white' : index < stage ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500')}>{index < stage ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.icon}</span>
                        <span className="truncate text-[11px] font-medium text-zinc-800">{item.short}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[9px] text-zinc-400">{item.object}</p>
                    </button>
                    {index < STAGES.length - 1 && <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700">{current.icon}<span className="text-xs font-semibold">STEP {stage + 1}</span></div>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">{current.title}</h2>
                  <p className="mt-1 font-mono text-[10px] text-zinc-400">{current.object}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate(current.module)}>打开业务模块</Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FlowBox label="本步输入" text={current.input} icon={<Database className="h-4 w-4" />} />
                <FlowBox label="本步输出" text={current.output} icon={<GitBranch className="h-4 w-4" />} />
              </div>

              <div className="mt-4">
                <StageContent stage={stage} data={data} base={scenarioBase} stress={scenarioStress} gateM03={gateM03} gateM13={gateM13} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                <Button variant="outline" size="sm" disabled={stage === 0} onClick={() => setStage((s) => Math.max(0, s - 1))}><ChevronLeft className="mr-1 h-3.5 w-3.5" />上一步</Button>
                <span className="text-[11px] text-zinc-400">所有阶段引用同一 Case 对象和同一证据链，不复制业务事实。</span>
                <Button size="sm" disabled={stage === STAGES.length - 1} onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))}>下一步<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-zinc-100">
                <div className="flex items-center gap-2"><Waypoints className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-semibold">Case 当前判断</h3></div>
                <p className="mt-3 text-xs leading-6 text-zinc-300">{data.demo.currentConclusion}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-900"><AlertTriangle className="h-4 w-4" /><h3 className="text-sm font-semibold">证据闭环状态迁移</h3></div>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-emerald-900/80">
                  <li>• V0.3：STRICT-V1 阻塞，高压 Run 仅能作为探索证据。</li>
                  <li>• 补证：Live 复试 + 正式 LVC 锚点 + MD-02/07/08 扩域再认可。</li>
                  <li>• V0.4：冻结 5,000 次正式高压 Run 和完整 Evidence Package。</li>
                  <li>• STRICT-V1 不变重新评估：Evidence Gate 通过；性能结果 83.2% 仍低于 85%，因此正式结论为“未达到要求”。</li>
                </ul>
              </div>
            </aside>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="text-sm font-semibold text-zinc-900">Case 证据闭环动作包</h2><p className="mt-1 text-xs text-zinc-500">不是继续“多做仿真”，而是精准补齐阻塞正式鉴定结论的证据。</p></div>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">5 组业务动作 / 8 步状态机</Badge>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-5">
              {data.demo.closurePlan.map((item, index) => (
                <div key={item} className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
                  <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">{index + 1}</span><span className="text-[10px] font-medium text-zinc-500">ACTION</span></div>
                  <p className="mt-2 text-xs leading-5 text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

function FlowBox({ label, text, icon }: { label: string; text: string; icon: ReactNode }) {
  return <div className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3"><div className="flex items-center gap-2 text-zinc-500">{icon}<span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-1.5 text-xs leading-5 text-zinc-700">{text}</p></div>
}

function StageContent({ stage, data, base, stress, gateM03, gateM13 }: { stage: number; data: CaseData; base?: Entry; stress?: Entry; gateM03?: Entry; gateM13?: Entry }) {
  const event = (id: string) => data.events.find((x) => x.pk === id)
  const measure = (id: string) => data.measures.find((x) => x.pk === id)
  const model = (id: string) => data.models.find((x) => x.pk === id)

  if (stage === 0) {
    const steps = Array.isArray(data.missionThread?.data.steps) ? data.missionThread?.data.steps : []
    return <div className="space-y-3"><p className="text-sm leading-6 text-zinc-700">{data.missionThread?.data.missionObjective}</p><div className="grid gap-2 md:grid-cols-3">{steps.map((s: any) => <div key={s.id} className="rounded-md border border-zinc-200 p-3"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-zinc-400">{s.id}</span><StepState state={s.status} /></div><p className="mt-1 text-xs font-medium text-zinc-800">{s.label}</p><p className="mt-1 text-[10px] text-zinc-500">{s.actor} → {s.effect}</p></div>)}</div></div>
  }

  if (stage === 1) {
    const def = data.deficiencies[0]
    return <div className="grid gap-3 md:grid-cols-2"><InfoCard title="任务线程缺口" badge="S3 · 情报分发" tone="amber"><p>强干扰条件下数据链失锁会直接打断“识别结果 → 指挥决策”的任务链。单独证明最大通信距离不足以证明任务线程可恢复。</p></InfoCard><InfoCard title="触发缺陷" badge={def?.pk ?? 'DF-25-01'} tone="red"><p>{def?.title}</p><p className="mt-1 text-zinc-500">{def?.data.rootCause}</p></InfoCard></div>
  }

  if (stage === 2) {
    return <div className="grid gap-3 lg:grid-cols-2"><ScenarioCard title="正式基线" scenario={base} /><ScenarioCard title="候选压力场景" scenario={stress} stress /></div>
  }

  if (stage === 3) {
    return <div className="grid gap-2 lg:grid-cols-3"><EventCard event={event('TE-25-002')} evidence="Live Anchor" note={event('TE-25-002')?.data.status === '已完成' ? '强干扰故障归零后已完成正式复试，形成 Live Anchor。' : '当前仍为补证阻塞项；状态机第 1 步将创建正式复试 Run。'} /><EventCard event={event('TE-25-004')} evidence="LVC Expansion" note={event('TE-25-004')?.data.status === '已完成' ? '36 个正式 LVC Run 已完成，形成 S3/S4 多节点任务线程锚点。' : '正式 LVC 任务线程锚点尚未完成。'} /><EventCard event={event('TE-25-009')} evidence="Digital Stress" note={event('TE-25-009')?.data.status === '已完成' ? '验证域扩展并认可后完成 5,000 次正式 Monte Carlo 高压 Run。' : '已有探索性高压结果；正式 5,000 Run 必须等待 VV&A 扩域认可。'} /></div>
  }

  if (stage === 4) {
    return <div className="overflow-hidden rounded-md border border-zinc-200"><table className="w-full text-xs"><thead className="bg-zinc-50"><tr>{['资源', '位置/角色', '状态', '利用率'].map((h) => <th key={h} className="border-b border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">{h}</th>)}</tr></thead><tbody>{data.resources.map((r) => <tr key={r.code}><td className="border-b border-zinc-100 px-3 py-2"><p className="font-mono text-[10px] text-zinc-400">{r.code}</p><p className="font-medium text-zinc-800">{r.name}</p></td><td className="border-b border-zinc-100 px-3 py-2 text-zinc-600">{r.site}</td><td className="border-b border-zinc-100 px-3 py-2"><Badge variant="outline" className="text-[9px]">{r.status}</Badge></td><td className="border-b border-zinc-100 px-3 py-2"><div className="flex items-center gap-2"><Progress value={r.utilization} className="h-1.5 w-20" /><span>{r.utilization}%</span></div></td></tr>)}</tbody></table></div>
  }

  if (stage === 5) {
    return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><MetricBox label="正式高压数字 Run" value={measure('M-13')?.data.status === '未达标' ? '5,000 次已完成' : '5,000 次待执行'} sub={measure('M-13')?.data.status === '未达标' ? '已进入正式统计判读' : '当前仅有探索性候选结果'} /><MetricBox label="当前任务成功率" value={`${data.demo.candidateResult.missionSuccess}%`} sub={`阈值 ${data.demo.candidateResult.threshold}%`} bad /><MetricBox label="孪生一致性 NRMSE" value={`${data.demo.candidateResult.highStressNrmse}%`} sub="正式高压批次；门槛 8%" /></div><div className="grid gap-2 md:grid-cols-2">{data.datasets.map((d) => <div key={d.path} className="rounded-md border border-zinc-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-zinc-400">{d.path}</p><p className="mt-0.5 text-xs font-medium text-zinc-800">{d.description}</p></div><Badge variant="outline" className={cn('text-[9px]', d.qualityScore >= 95 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>Q {d.qualityScore}</Badge></div></div>)}</div></div>
  }

  if (stage === 6) {
    return <div className="grid gap-2 lg:grid-cols-3">{['MD-02', 'MD-07', 'MD-08'].map((id) => <ModelCard key={id} model={model(id)} />)}</div>
  }

  if (stage === 7) {
    return <div className="space-y-3"><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">{['M-03', 'M-05', 'M-07', 'M-13'].map((id) => <MeasureCard key={id} measure={measure(id)} />)}</div><div className="rounded-md border border-sky-200 bg-sky-50/50 p-3 text-xs leading-5 text-sky-900">融合原则：实测负责锚定现实，LVC 负责端到端交互与可重复扩展，纯数字试验负责覆盖稀有/危险/高成本区域；数字证据权重受模型 Intended Use、Validation Domain、Accreditation 和不确定性约束。</div></div>
  }

  const finalFrozen = data.case?.data.status === '正式结论已冻结'
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><GateCard gate={gateM03} /><GateCard gate={gateM13} /></div><div className={cn('rounded-md border p-4', finalFrozen ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40')}><div className={cn('flex items-center gap-2', finalFrozen ? 'text-emerald-800' : 'text-red-800')}>{finalFrozen ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}<h3 className="text-sm font-semibold">{finalFrozen ? '当前 Case 正式鉴定结论已冻结' : '当前仍处于 V0.3 证据阻塞/补证阶段'}</h3></div><p className={cn('mt-2 text-sm leading-6', finalFrozen ? 'text-emerald-900/80' : 'text-red-900/80')}>{data.demo.currentConclusion}</p><p className="mt-2 text-[10px] leading-4 text-zinc-500">Evidence Gate 判断证据充分性；性能是否达标由指标结果独立判定。DEMO/SYNTHETIC 数值仅用于演示。</p></div></div>
}

function InfoCard({ title, badge, tone, children }: { title: string; badge: string; tone: 'amber' | 'red'; children: ReactNode }) {
  const cls = tone === 'red' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40'
  return <div className={cn('rounded-md border p-4', cls)}><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-zinc-900">{title}</h3><Badge variant="outline" className="text-[10px]">{badge}</Badge></div><div className="mt-2 text-xs leading-5 text-zinc-700">{children}</div></div>
}

function ScenarioCard({ title, scenario, stress = false }: { title: string; scenario?: Entry; stress?: boolean }) {
  if (!scenario) return null
  const d = scenario.data
  return <div className={cn('rounded-md border p-4', stress ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200 bg-zinc-50/40')}><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] text-zinc-400">{scenario.pk}</p><h3 className="text-sm font-semibold text-zinc-900">{title}</h3></div><Badge variant="outline" className="text-[10px]">{d.status}</Badge></div><div className="mt-3 grid grid-cols-5 gap-2 text-center">{[['威胁', d.threatLevel], ['EW', `${d.ewIntensity}%`], ['兵力比', d.forceRatio], ['天气', d.weather], ['欺骗', `${d.deception}%`]].map(([k, v]) => <div key={String(k)} className="rounded border border-zinc-200 bg-white px-1 py-2"><p className="text-[9px] text-zinc-400">{k}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{v}</p></div>)}</div>{stress && <p className="mt-3 text-[10px] leading-4 text-amber-800">{String(d.status).includes('已批准') ? '补证后：Threat=4、EW=75%、兵力比0.85 已纳入 MD-02/07/08 当前认可适用域；超出该冻结范围仍需重新 VV&A。' : '当前高压候选场景仍包含验证域外使用；需完成 Live/LVC 锚点与 VV&A 扩域认可后才能转为正式鉴定场景。'}</p>}</div>
}

function EventCard({ event, evidence, note }: { event?: Entry; evidence: string; note: string }) {
  if (!event) return null
  return <div className="rounded-md border border-zinc-200 p-3"><div className="flex items-center justify-between"><Badge variant="outline" className="text-[9px]">{evidence}</Badge><Badge variant="outline" className={cn('text-[9px]', eventStatusBadge[event.data.status] ?? '')}>{event.data.status}</Badge></div><p className="mt-2 font-mono text-[10px] text-zinc-400">{event.pk}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{event.title}</p><p className="mt-2 text-[10px] leading-4 text-zinc-500">{note}</p><p className="mt-2 text-[10px] text-zinc-400">L {event.data.liveCount} · V {event.data.virtualCount} · C {event.data.constructiveCount}</p></div>
}

function MetricBox({ label, value, sub, bad = false }: { label: string; value: string; sub: string; bad?: boolean }) {
  return <div className={cn('rounded-md border p-3', bad ? 'border-red-200 bg-red-50/40' : 'border-zinc-200 bg-zinc-50/50')}><p className="text-[10px] text-zinc-500">{label}</p><p className={cn('mt-1 text-xl font-semibold', bad ? 'text-red-700' : 'text-zinc-900')}>{value}</p><p className="mt-1 text-[10px] text-zinc-500">{sub}</p></div>
}

function ModelCard({ model }: { model?: Entry }) {
  if (!model) return null
  const accredited = String(model.data.accreditation).includes('认可') && !String(model.data.accreditation).includes('待')
  return <div className="rounded-md border border-zinc-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-zinc-400">{model.pk}</p><p className="text-xs font-semibold text-zinc-800">{model.title}</p></div>{accredited ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}</div><div className="mt-2 space-y-1 text-[10px] text-zinc-600"><p>V: {model.data.verification} · Val: {model.data.validation}</p><p>Accreditation: <span className="font-medium">{model.data.accreditation}</span></p><p className="line-clamp-3 leading-4">Domain: {model.data.validationDomain}</p></div></div>
}

function MeasureCard({ measure }: { measure?: Entry }) {
  if (!measure) return null
  return <div className="rounded-md border border-zinc-200 p-3"><div className="flex items-center justify-between"><p className="font-mono text-[10px] text-zinc-400">{measure.pk}</p><Badge variant="outline" className={cn('text-[9px]', measureStatusBadge[measure.data.status] ?? '')}>{measure.data.status}</Badge></div><p className="mt-1 text-xs font-medium text-zinc-800">{measure.title}</p><p className="mt-2 text-[10px] text-zinc-500">阈值 {measure.data.threshold}{measure.data.unit ?? ''} · 当前 {measure.data.measured ?? '—'}{measure.data.unit ?? ''}</p></div>
}

function GateCard({ gate }: { gate?: Entry }) {
  if (!gate) return null
  const blocked = gate.data.decision === '阻塞'
  const conditional = gate.data.decision === '有条件通过'
  return <div className={cn('rounded-md border p-4', blocked ? 'border-red-200 bg-red-50/30' : conditional ? 'border-amber-200 bg-amber-50/30' : 'border-emerald-200 bg-emerald-50/30')}><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] text-zinc-400">{gate.pk}</p><p className="text-xs font-semibold text-zinc-800">{gate.title}</p></div><Badge variant="outline" className="text-[10px]">{gate.data.decision}</Badge></div><div className="mt-2 text-[10px] leading-4 text-zinc-600">{Array.isArray(gate.data.blockers) && gate.data.blockers.length ? gate.data.blockers.map((x: string) => <p key={x}>• {x}</p>) : <p>无硬性阻塞项，可进入结论编制。</p>}</div></div>
}

function StepState({ state }: { state: string }) {
  if (state === 'covered') return <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700"><CheckCircle2 className="h-3 w-3" />已覆盖</span>
  if (state === 'partial') return <span className="inline-flex items-center gap-1 text-[9px] text-amber-700"><CircleDot className="h-3 w-3" />部分</span>
  return <span className="inline-flex items-center gap-1 text-[9px] text-red-700"><XCircle className="h-3 w-3" />缺口</span>
}
