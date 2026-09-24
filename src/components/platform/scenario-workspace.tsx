'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/platform'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Beaker, Boxes, Clock3, Fingerprint, GitCompare, Layers3, LockKeyhole, Network, Radio, Shield, Sparkles } from 'lucide-react'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Workspace = { scenarios: Entry[]; models: Entry[]; assemblies: Entry[]; environments: Entry[]; federations: Entry[]; baselines: Entry[]; artifacts: Entry[]; contracts: Entry[]; resources: Array<Record<string, any>> }

type Inputs = {
  threat: number
  ew: number
  forceRatio: number
  weather: string
  deception: number
}

function computeOutcome(input: Inputs) {
  const weatherPenalty = input.weather === '恶劣' ? 8 : input.weather === '复杂' ? 4 : 0
  const missionSuccess = Math.max(5, Math.min(98,
    96 - input.threat * 5.2 - input.ew * 0.16 - weatherPenalty - input.deception * 0.08 + (input.forceRatio - 1) * 14,
  ))
  const lossRate = Math.max(2, Math.min(85,
    8 + input.threat * 4.6 + input.ew * 0.11 + weatherPenalty * 0.8 + input.deception * 0.05 - (input.forceRatio - 1) * 7,
  ))
  const decisionLatency = Math.max(5, 8 + input.ew * 0.09 + input.deception * 0.06 + input.threat * 1.2 + weatherPenalty * 0.4)
  return {
    missionSuccess: Math.round(missionSuccess * 10) / 10,
    lossRate: Math.round(lossRate * 10) / 10,
    decisionLatency: Math.round(decisionLatency * 10) / 10,
  }
}

export function ScenarioWorkspaceModule() {
  const [data, setData] = useState<Workspace | null>(null)
  const [baseline, setBaseline] = useState<Inputs>({ threat: 3, ew: 45, forceRatio: 1, weather: '复杂', deception: 35 })
  const [candidate, setCandidate] = useState<Inputs>({ threat: 4, ew: 75, forceRatio: 0.85, weather: '恶劣', deception: 60 })

  useEffect(() => {
    api<Workspace>('/api/decision-workspace').then((d) => {
      setData(d)
      const base = d.scenarios.find((s) => s.data.kind === '基线') ?? d.scenarios[0]
      const alt = d.scenarios.find((s) => s.data.kind === '候选') ?? d.scenarios[1]
      if (base) setBaseline({ threat: Number(base.data.threatLevel ?? 3), ew: Number(base.data.ewIntensity ?? 45), forceRatio: Number(base.data.forceRatio ?? 1), weather: String(base.data.weather ?? '复杂'), deception: Number(base.data.deception ?? 35) })
      if (alt) setCandidate({ threat: Number(alt.data.threatLevel ?? 4), ew: Number(alt.data.ewIntensity ?? 75), forceRatio: Number(alt.data.forceRatio ?? 0.85), weather: String(alt.data.weather ?? '恶劣'), deception: Number(alt.data.deception ?? 60) })
    })
  }, [])

  const baseResult = useMemo(() => computeOutcome(baseline), [baseline])
  const candidateResult = useMemo(() => computeOutcome(candidate), [candidate])

  if (!data) return <div className="space-y-4"><ModuleHeader title="Scenario Workspace 场景沙箱" desc="加载中…" /><LoadingGrid rows={4} /></div>

  const accreditedModels = data.models.filter((m) => m.data.accreditation === '已认可' || m.data.vvaStatus === '已确认').length
  const modelReadiness = Math.round(accreditedModels / Math.max(1, data.models.length) * 100)
  const baseScenario = data.scenarios.find((s) => s.data.kind === '基线') ?? data.scenarios[0]
  const stressScenario = data.scenarios.find((s) => s.pk === 'SC-COA-01') ?? data.scenarios.find((s) => s.data.kind === '候选') ?? data.scenarios[1]
  const baseAssembly = data.assemblies.find((a) => a.pk === baseScenario?.data.testModelAssemblyRef)
  const stressAssembly = data.assemblies.find((a) => a.pk === stressScenario?.data.testModelAssemblyRef)
  const baseEnvironment = data.environments.find((a) => a.pk === baseScenario?.data.testEnvironmentAssemblyRef)
  const stressEnvironment = data.environments.find((a) => a.pk === stressScenario?.data.testEnvironmentAssemblyRef)
  const baseFederation = data.federations.find((a) => a.pk === baseEnvironment?.data.federationRef)
  const stressFederation = data.federations.find((a) => a.pk === stressEnvironment?.data.federationRef)

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Scenario Workspace · 场景沙箱"
        desc="在不改写主数据和正式试验基线的前提下，对威胁、环境、兵力、算法和模型版本进行 what-if 比较；批准后再转化为正式试验场景或数字化试验任务。"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold text-sky-900">隔离沙箱</p><p className="mt-1 text-xs leading-relaxed text-sky-700">当前编辑仅影响候选 Scenario，不修改正式 Ontology 状态。场景批准后应通过受控 Action 合并到试验计划。</p></div>
            <LockKeyhole className="h-6 w-6 shrink-0 text-sky-600" />
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">可用于当前场景的模型</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{accreditedModels}/{data.models.length}</p>
          <Progress value={modelReadiness} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">场景对象</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{Math.max(2, data.scenarios.length)}</p>
          <p className="mt-2 text-xs text-zinc-500">基线 + 候选对照</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ScenarioEditor title="基线场景" code="SC-BASE" tone="zinc" value={baseline} onChange={setBaseline} result={baseResult} />
        <ScenarioEditor title="候选高压场景" code="SC-COA-01" tone="amber" value={candidate} onChange={setCandidate} result={candidateResult} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">Test Model Assembly · 场景模型装配与3.0来源</h2></div><p className="mt-1 text-xs leading-5 text-zinc-500">Scenario 不再只保存模型名称；批准运行前必须绑定一个装配对象，明确数字样机3.0基地基线、ModelArtifact、接口契约和当时VV&A状态。Run 创建时冻结该装配快照。</p></div><Badge variant="outline" className="text-[9px]">v2.0-B provenance</Badge></div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <AssemblyCard title="SC-BASE 基线装配" scenario={baseScenario} assembly={baseAssembly} />
          <AssemblyCard title="SC-COA-01 高压装配" scenario={stressScenario} assembly={stressAssembly} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Network className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">Test Environment Assembly · LVC Federation Configuration</h2></div><p className="mt-1 text-xs leading-5 text-zinc-500">模型装配回答“用哪些模型”；环境装配继续冻结 Live / Virtual / Constructive 节点、HLA/DIS/TENA/DDS 网关、统一时统、IDL Topic Set、逻辑网络和场区资源。Run 创建时冻结对应执行 Profile 与联邦快照。</p></div><Badge variant="outline" className="text-[9px]">v2.0-C environment provenance</Badge></div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <EnvironmentCard title="SC-BASE 基线试验环境" scenario={baseScenario} environment={baseEnvironment} federation={baseFederation} />
          <EnvironmentCard title="SC-COA-01 高压试验环境" scenario={stressScenario} environment={stressEnvironment} federation={stressFederation} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2"><GitCompare className="h-4 w-4 text-zinc-700" /><div><h2 className="text-sm font-semibold text-zinc-900">场景对比与试验价值</h2><p className="text-xs text-zinc-500">以下结果为原型中的透明启发式计算，用于演示试验策划流程，不是正式作战模型。</p></div></div>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCompare label="任务成功率" unit="%" base={baseResult.missionSuccess} candidate={candidateResult.missionSuccess} higherBetter />
          <MetricCompare label="蓝方损失率" unit="%" base={baseResult.lossRate} candidate={candidateResult.lossRate} />
          <MetricCompare label="关键决策时延" unit="s" base={baseResult.decisionLatency} candidate={candidateResult.decisionLatency} />
        </div>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/40 p-3 text-xs leading-relaxed text-zinc-700">
          <span className="font-semibold text-zinc-900">建议：</span> 候选场景使任务成功率下降 {(baseResult.missionSuccess - candidateResult.missionSuccess).toFixed(1)} 个百分点。该差异主要由高强度电磁压制、欺骗和蓝方兵力劣势共同驱动，应将其转化为 TE-25-009 的数字化高压场景，并用 TE-25-004/006 的 LVC 与实装数据进行锚定验证。
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><Layers3 className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">场景对象应保存的正式元数据</h2></div>
          <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
            {['任务线程与任务目标', '红蓝兵力与威胁构型', '地理/气象/电磁环境', '关键假设、约束与限制', '使用的模型版本与认可适用域', '随机种子与运行批次', '关联试验事件与数据集', '审批人、版本与变更历史'].map((item) => <div key={item} className="rounded-md border border-zinc-200 bg-zinc-50/50 p-2.5">{item}</div>)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-800">与 Palantir Scenario 的映射</p></div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">保留“隔离修改—多场景并行比较—受控合并”的机制，但对象换成试验场景、威胁、模型、资源和试验事件；正式基线只能经审批 Action 更新。</p>
        </div>
      </section>
    </div>
  )
}

function AssemblyCard({ title, scenario, assembly }: { title: string; scenario?: Entry; assembly?: Entry }) {
  if (!scenario) return <div className="rounded-md border border-zinc-200 p-3 text-xs text-zinc-400">Scenario 不存在</div>
  if (!assembly) return <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3"><p className="text-xs font-semibold text-amber-900">{title}</p><p className="mt-2 text-[10px] leading-5 text-amber-800">尚未绑定 TestModelAssembly。需要先完成数字样机3.0 G0/G1、冻结基地 ModelBaseline，并完成 G2-ENTRY 移交。</p></div>
  const direct = Array.isArray(assembly.data.directArtifactRefs) ? assembly.data.directArtifactRefs : []
  const contracts = Array.isArray(assembly.data.contractRefs) ? assembly.data.contractRefs : []
  const bindings = Array.isArray(assembly.data.modelBindings) ? assembly.data.modelBindings : []
  return <div className="rounded-md border border-zinc-200 bg-zinc-50/30 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[9px] text-zinc-400">{assembly.pk}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{title}</p></div><Badge variant="outline" className="text-[9px]">{assembly.data.revision}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">3.0基地基线</p><p className="mt-1 font-mono text-zinc-700">{assembly.data.prototypeBaselineRef}</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">模型绑定</p><p className="mt-1 font-semibold text-zinc-700">{bindings.length} 个</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">直接3.0 Artifact</p><p className="mt-1 font-semibold text-zinc-700">{direct.length} 个</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">接口契约</p><p className="mt-1 font-semibold text-zinc-700">{contracts.length} 个</p></div></div><div className="mt-2 space-y-1">{bindings.map((b: any) => <div key={b.modelRef} className="flex items-start gap-2 rounded border border-zinc-200 bg-white p-2 text-[10px] leading-4"><Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" /><span><b>{b.modelRef}@{b.modelVersion}</b> · {b.sourceKind}{b.sourceArtifactRef ? ` · ${b.sourceArtifactRef}` : ' · 外部陪试/环境模型'} · Accreditation {b.vvaSnapshot?.accreditation ?? '—'}</span></div>)}</div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-zinc-400">Assembly hash: {assembly.data.assemblyHash}</p></div>
}


function EnvironmentCard({ title, scenario, environment, federation }: { title: string; scenario?: Entry; environment?: Entry; federation?: Entry }) {
  if (!scenario) return <div className="rounded-md border border-zinc-200 p-3 text-xs text-zinc-400">Scenario 不存在</div>
  if (!environment) return <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3"><p className="text-xs font-semibold text-amber-900">{title}</p><p className="mt-2 text-[10px] leading-5 text-amber-800">尚未绑定 TestEnvironmentAssembly。完成数字样机3.0 G2-ENTRY 后，系统才会基于 TestModelAssembly 生成可运行试验环境和 LVC 联邦配置。</p></div>
  const resources = Array.isArray(environment.data.resourceSnapshots) ? environment.data.resourceSnapshots : []
  const gateways = Array.isArray(federation?.data.gateways) ? federation!.data.gateways : []
  const topics = Array.isArray(federation?.data.topicSet?.topics) ? federation!.data.topicSet.topics : []
  const live = Array.isArray(federation?.data.liveNodes) ? federation!.data.liveNodes : []
  const virtual = Array.isArray(federation?.data.virtualNodes) ? federation!.data.virtualNodes : []
  const constructive = Array.isArray(federation?.data.constructiveNodes) ? federation!.data.constructiveNodes : []
  return <div className="rounded-md border border-zinc-200 bg-zinc-50/30 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[9px] text-zinc-400">{environment.pk}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{title}</p></div><Badge variant="outline" className={environment.data.readiness === 'READY' ? 'border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700' : 'border-amber-200 bg-amber-50 text-[9px] text-amber-700'}>{environment.data.readiness}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">Model Assembly</p><p className="mt-1 font-mono text-zinc-700">{environment.data.modelAssemblyRef}</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">LVC Federation</p><p className="mt-1 font-mono text-zinc-700">{environment.data.federationRef}</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">L / V / C 节点</p><p className="mt-1 font-semibold text-zinc-700">{live.length} / {virtual.length} / {constructive.length}</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-zinc-400">资源 / Topic</p><p className="mt-1 font-semibold text-zinc-700">{resources.length} / {topics.length}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5">{gateways.map((g: any) => <Badge key={g.id} variant="outline" className="text-[9px]"><Radio className="mr-1 h-3 w-3" />{g.protocol}</Badge>)}</div><div className="mt-3 flex items-start gap-2 rounded border border-zinc-200 bg-white p-2 text-[10px] leading-4 text-zinc-600"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b>时统：</b>{federation?.data.timeService?.authority ?? '—'} · {federation?.data.timeService?.logicalTimeMode ?? '—'} · Topic Set {federation?.data.topicSet?.schema ?? '—'}</span></div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-zinc-400">Environment hash: {environment.data.environmentHash}</p></div>
}

function ScenarioEditor({ title, code, tone, value, onChange, result }: { title: string; code: string; tone: 'zinc' | 'amber'; value: Inputs; onChange: (v: Inputs) => void; result: ReturnType<typeof computeOutcome> }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${tone === 'amber' ? 'border-amber-200' : 'border-zinc-200'}`}>
      <div className="mb-4 flex items-start justify-between">
        <div><p className="font-mono text-[10px] text-zinc-500">{code}</p><h2 className="mt-1 text-sm font-semibold text-zinc-900">{title}</h2></div>
        <Badge variant="outline">Scenario</Badge>
      </div>
      <div className="space-y-4">
        <SliderRow label="威胁等级" value={value.threat} min={1} max={5} step={1} suffix="/5" onValue={(x) => onChange({ ...value, threat: x })} />
        <SliderRow label="电磁压制强度" value={value.ew} min={0} max={100} step={5} suffix="%" onValue={(x) => onChange({ ...value, ew: x })} />
        <SliderRow label="蓝红兵力比" value={value.forceRatio} min={0.5} max={1.5} step={0.05} suffix="" onValue={(x) => onChange({ ...value, forceRatio: x })} />
        <SliderRow label="欺骗/诱饵强度" value={value.deception} min={0} max={100} step={5} suffix="%" onValue={(x) => onChange({ ...value, deception: x })} />
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-zinc-600">气象与能见度</span><Select value={value.weather} onValueChange={(weather) => onChange({ ...value, weather })}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="良好">良好</SelectItem><SelectItem value="复杂">复杂</SelectItem><SelectItem value="恶劣">恶劣</SelectItem></SelectContent></Select></div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-md bg-zinc-50 p-3 text-center">
        <div><p className="text-[10px] text-zinc-500">任务成功率</p><p className="mt-1 font-mono text-sm font-semibold text-zinc-900">{result.missionSuccess}%</p></div>
        <div><p className="text-[10px] text-zinc-500">损失率</p><p className="mt-1 font-mono text-sm font-semibold text-zinc-900">{result.lossRate}%</p></div>
        <div><p className="text-[10px] text-zinc-500">决策时延</p><p className="mt-1 font-mono text-sm font-semibold text-zinc-900">{result.decisionLatency}s</p></div>
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, suffix, onValue }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onValue: (v: number) => void }) {
  return <div><div className="mb-2 flex items-center justify-between text-xs"><span className="text-zinc-600">{label}</span><span className="font-mono font-medium text-zinc-900">{value}{suffix}</span></div><Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onValue(v[0])} /></div>
}

function MetricCompare({ label, unit, base, candidate, higherBetter = false }: { label: string; unit: string; base: number; candidate: number; higherBetter?: boolean }) {
  const delta = candidate - base
  const worse = higherBetter ? delta < 0 : delta > 0
  return <div className={`rounded-md border p-3 ${worse ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}><p className="text-xs font-medium text-zinc-800">{label}</p><div className="mt-3 flex items-end justify-between"><div><p className="text-[10px] text-zinc-500">基线</p><p className="font-mono text-lg font-semibold text-zinc-900">{base}{unit}</p></div><div className="text-right"><p className="text-[10px] text-zinc-500">候选</p><p className="font-mono text-lg font-semibold text-zinc-900">{candidate}{unit}</p></div></div><p className={`mt-2 text-xs ${worse ? 'text-amber-700' : 'text-emerald-700'}`}>变化 {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit}</p></div>
}
