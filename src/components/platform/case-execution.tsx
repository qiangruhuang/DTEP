'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, patch } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Boxes, CheckCircle2, CircleAlert, Clock3, FileArchive, Fingerprint, Network, PlayCircle, Radio, RefreshCw, ShieldCheck, SlidersHorizontal, XCircle, ClipboardCheck, RadioTower, Gavel } from 'lucide-react'
import { Case01StateMachine } from './case01-state-machine'

type Entry = { pk: string; title: string; data: Record<string, any> }
type Workspace = { runs: Entry[]; packages: Entry[]; ruleSets: Entry[] }
type GateCheck = { id: string; label: string; pass: boolean; applicable: boolean; severity: 'hard' | 'soft'; note: string }
type GateEvaluation = { decision: '通过' | '有条件通过' | '阻塞'; score: number; checks: GateCheck[]; hardFailures: GateCheck[]; softFailures: GateCheck[]; evaluatedAt: string; packageId: string; ruleSetId: string; assessmentMode: '正式准入评估' | '对比/探索评估'; committed?: boolean; recordedAt?: string }

const decisionClass: Record<string, string> = {
  通过: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  有条件通过: 'border-amber-200 bg-amber-50 text-amber-700',
  阻塞: 'border-red-200 bg-red-50 text-red-700',
}

export function CaseExecutionPanel({ onCaseChanged }: { onCaseChanged?: () => void | Promise<void> } = {}) {
  const [data, setData] = useState<Workspace | null>(null)
  const [selectedRun, setSelectedRun] = useState('RUN-DOT-S-01')
  const [selectedPackage, setSelectedPackage] = useState('EP-CASE01-M13-V0.3')
  const [selectedRuleSet, setSelectedRuleSet] = useState('GRS-CASE01-STRICT-V1')
  const [evaluation, setEvaluation] = useState<GateEvaluation | null>(null)
  const [loading, setLoading] = useState(false)
  const [qualityDraft, setQualityDraft] = useState('90')

  const load = async () => {
    setLoading(true)
    try {
      const next = await api<Workspace>('/api/case-execution')
      setData(next)
      if (!next.runs.some((r) => r.pk === selectedRun) && next.runs[0]) setSelectedRun(next.runs[0].pk)
      if (!next.packages.some((p) => p.pk === selectedPackage) && next.packages[0]) setSelectedPackage(next.packages[0].pk)
      if (!next.ruleSets.some((r) => r.pk === selectedRuleSet) && next.ruleSets[0]) setSelectedRuleSet(next.ruleSets[0].pk)
    } finally {
      setLoading(false)
    }
  }

  const evaluate = async (packageId = selectedPackage, ruleSetId = selectedRuleSet) => {
    try {
      setEvaluation(await api<GateEvaluation>(`/api/evidence-gate-service?packageId=${encodeURIComponent(packageId)}&ruleSetId=${encodeURIComponent(ruleSetId)}`))
    } catch {
      setEvaluation(null)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (data) evaluate() }, [data, selectedPackage, selectedRuleSet])

  const run = data?.runs.find((x) => x.pk === selectedRun)
  const pkg = data?.packages.find((x) => x.pk === selectedPackage)
  const ruleSet = data?.ruleSets.find((x) => x.pk === selectedRuleSet)
  const rules = useMemo(() => Array.isArray(ruleSet?.data.rules) ? ruleSet?.data.rules : [], [ruleSet])
  const ruleSetEditable = String(ruleSet?.data.status ?? '').startsWith('草案')
  const packageFrozen = String(pkg?.data.status ?? '').startsWith('已冻结')

  useEffect(() => {
    const q = rules.find((r: any) => r.type === 'datasetQuality')
    if (q?.params?.minQuality != null) setQualityDraft(String(q.params.minQuality))
  }, [selectedRuleSet, data])

  const updateRule = async (ruleId: string, body: Record<string, unknown>) => {
    await patch('/api/evidence-gate-service', { operation: 'updateRule', ruleSetId: selectedRuleSet, ruleId, ...body })
    await load()
  }

  const cloneRuleSet = async () => {
    const result = await patch<{ ruleSetId: string }>('/api/evidence-gate-service', { operation: 'cloneDraft', ruleSetId: selectedRuleSet, performedBy: '试验鉴定规则管理员' })
    await load()
    setSelectedRuleSet(result.ruleSetId)
  }

  const publishRuleSet = async () => {
    await patch('/api/evidence-gate-service', { operation: 'publishDraft', ruleSetId: selectedRuleSet, performedBy: '鉴定规则委员会 · 孙立' })
    await load()
  }



  if (!data) {
    return <section className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center gap-2 text-sm text-zinc-600"><RefreshCw className="h-4 w-4 animate-spin" />加载 Run / Evidence Package / Gate Rule Service…</div></section>
  }

  return (
    <>
    <Case01StateMachine onChanged={async () => { await load(); await onCaseChanged?.() }} />
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-700"><PlayCircle className="h-4 w-4" /><span className="text-xs font-semibold">CASE-01 EXECUTION CORE · v2.1 FROZEN</span></div>
          <h2 className="mt-1 text-base font-semibold text-zinc-900">Run 实例 → Evidence Package → Evidence Gate Rule Service</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">把“跑过什么”“哪些结果进入哪一版证据”“依据哪套规则形成准入判断”拆成三个可追溯对象，并通过受控 Action 写回。</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />刷新对象状态</Button>
      </div>

      <Tabs defaultValue="runs" className="mt-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[620px]">
          <TabsTrigger value="runs">1. Run 实例</TabsTrigger>
          <TabsTrigger value="packages">2. Evidence Package</TabsTrigger>
          <TabsTrigger value="rules">3. Gate Rule Service</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <div className="grid gap-2 lg:grid-cols-3">
            {data.runs.map((r) => (
              <button key={r.pk} onClick={() => setSelectedRun(r.pk)} className={cn('rounded-md border p-3 text-left transition-colors', selectedRun === r.pk ? 'border-emerald-300 bg-emerald-50/50' : 'border-zinc-200 hover:bg-zinc-50')}>
                <div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-zinc-400">{r.pk}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{r.title}</p></div><Badge variant="outline" className="text-[9px]">{r.data.status}</Badge></div>
                <p className="mt-2 text-[10px] text-zinc-500">{r.data.executionMode} · {r.data.eventId} · {r.data.scenarioId}</p>
                <p className="mt-1 text-[10px] text-zinc-500">基线 {r.data.configurationBaseline} · 重复 {r.data.replications ?? 1}</p>
                <p className="mt-2 text-[10px] font-medium text-zinc-700">证据用途：{r.data.formalEvidenceClass}</p>
              </button>
            ))}
          </div>

          {run && <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
            <div className="rounded-md border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-zinc-400">{run.pk}</p><h3 className="text-sm font-semibold text-zinc-900">{run.title}</h3></div><Badge variant="outline">{run.data.formalEvidenceClass}</Badge></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[
                ['事件', run.data.eventId], ['场景', run.data.scenarioId], ['执行模式', run.data.executionMode], ['状态', run.data.status],
                ['配置基线', run.data.configurationBaseline], ['Test Model Assembly', run.data.testModelAssemblyRef ?? '未绑定'], ['Test Environment Assembly', run.data.testEnvironmentAssemblyRef ?? '未绑定'], ['LVC Federation', run.data.lvcFederationConfigRef ?? '未绑定'], ['3.0基地基线', run.data.prototypeBaselineRef ?? '未绑定'], ['重复次数', String(run.data.replications ?? 1)], ['随机种子', run.data.randomSeedPolicy ?? '—'], ['操作席', run.data.operator ?? '—'],
              ].map(([k, v]) => <div key={k} className="rounded border border-zinc-200 bg-zinc-50/60 p-2.5"><p className="text-[9px] text-zinc-400">{k}</p><p className="mt-0.5 break-words text-[11px] font-medium text-zinc-700">{v}</p></div>)}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ListBox title="冻结模型快照" values={run.data.modelSnapshot} />
                <ListBox title="冻结资源快照" values={run.data.resourceSnapshot} />
                <ListBox title="输入数据" values={run.data.inputDatasetRefs} />
                <ListBox title="输出数据" values={run.data.outputDatasetRefs} />
                <ListBox title="3.0 ModelArtifact 来源" values={run.data.artifactProvenanceRefs} />
                <ListBox title="FMI / SAL / IDL 契约" values={run.data.interfaceContractRefs} />
                <ListBox title="环境资源快照" values={(run.data.environmentResourceSnapshots ?? []).map((x: any) => `${x.code} · ${x.name}`)} />
                <ListBox title="LVC Federation 网关" values={run.data.federationGatewayRefs} />
              </div>
              <div className="mt-3 rounded-md border border-sky-200 bg-sky-50/30 p-3"><div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-sky-700" /><p className="text-xs font-semibold text-sky-900">冻结的 Test Model Assembly Snapshot</p></div>{run.data.assemblySnapshot ? <><p className="mt-2 text-[10px] text-sky-800">{run.data.assemblySnapshot.pk} · revision {run.data.assemblySnapshot.revision} · baseline {run.data.assemblySnapshot.prototypeBaselineVersion}</p><div className="mt-2 space-y-1">{(run.data.modelBindingSnapshots ?? []).map((b: any) => <p key={b.modelRef} className="break-all font-mono text-[9px] leading-4 text-sky-800">• {b.modelRef}@{b.modelVersion} ← {b.sourceArtifactRef ?? 'DTEP Model Library'} · {b.sourceBaselineRef ?? 'external'} · Accreditation {b.vvaSnapshot?.accreditation ?? '—'}</p>)}</div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-sky-700">Provenance hash: {run.data.modelProvenanceHash}</p></> : <p className="mt-2 text-[10px] leading-5 text-amber-800">该 Run 属于 v2.0-B 前的历史/预置对象，未冻结 3.0 ModelBaseline + Artifact 来源；不能通过后补字段把历史运行追溯性升级为完整 provenance。</p>}</div>
              <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/30 p-3"><div className="flex items-center gap-2"><Network className="h-4 w-4 text-violet-700" /><p className="text-xs font-semibold text-violet-900">冻结的 Test Environment Assembly / LVC Federation</p></div>{run.data.environmentAssemblySnapshot ? <><p className="mt-2 text-[10px] text-violet-800">{run.data.environmentAssemblySnapshot.pk} · revision {run.data.testEnvironmentAssemblyRevision} · profile {run.data.environmentProfileSnapshot?.profile}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="rounded border border-violet-100 bg-white p-2 text-[10px] text-violet-800"><div className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /><b>统一时统</b></div><p className="mt-1">{run.data.timeServiceSnapshot?.authority ?? '—'} · {run.data.timeServiceSnapshot?.logicalTimeMode ?? '—'}</p></div><div className="rounded border border-violet-100 bg-white p-2 text-[10px] text-violet-800"><div className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /><b>Topic / Gateway</b></div><p className="mt-1">{run.data.idlTopicSetSnapshot?.schema ?? '—'} · {(run.data.federationGatewayRefs ?? []).join(', ') || '—'}</p></div></div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-violet-700">Environment hash: {run.data.testEnvironmentAssemblyHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-violet-700">Federation hash: {run.data.lvcFederationConfigHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-violet-700">Environment provenance: {run.data.environmentProvenanceHash}</p></> : <p className="mt-2 text-[10px] leading-5 text-amber-800">该 Run 尚未冻结 v2.0-C 试验环境来源。完成 3.0 G2 后新产生的正式 Live/LVC/Digital Run 才能获得 Environment Assembly + Federation 快照。</p>}</div>
            </div>
            <div className="space-y-3">
              {run.data.testReadinessReviewSnapshot && <div className="rounded-md border border-emerald-200 bg-emerald-50/30 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-700" /><p className="text-xs font-semibold text-emerald-900">冻结的 Test Readiness / Federation Readiness</p></div><Badge variant="outline" className="border-emerald-200 bg-white text-[9px] text-emerald-700">{run.data.testReadinessReviewSnapshot.status}</Badge></div><p className="mt-2 text-[10px] text-emerald-800">{run.data.testReadinessReviewSnapshot.code} · A{run.data.testReadinessReviewSnapshot.attempt}</p>{run.data.federationReadinessReviewSnapshot && <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800"><RadioTower className="h-3 w-3" />{run.data.federationReadinessReviewSnapshot.code} · {run.data.federationReadinessReviewSnapshot.status}</p>}<p className="mt-2 text-[10px] leading-4 text-emerald-800">审批：{run.data.readinessApprovalSnapshot?.requestedByName ?? '—'} → {run.data.readinessApprovalSnapshot?.approvedByName ?? '—'}；执行签署：{run.data.readinessExecutionSignatureSnapshot?.signerName ?? '—'}</p><p className="mt-2 break-all font-mono text-[9px] leading-4 text-emerald-700">Review hash: {run.data.readinessReviewHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-emerald-700">Governance hash: {run.data.readinessGovernanceHash ?? '待执行签署完成'}</p></div>}
              {run.data.runControlSessionSnapshot && <div className="rounded-md border border-cyan-200 bg-cyan-50/30 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Radio className="h-4 w-4 text-cyan-700" /><p className="text-xs font-semibold text-cyan-900">冻结的 Run Control / Live Federation Monitoring</p></div><Badge variant="outline" className="border-cyan-200 bg-white text-[9px] text-cyan-700">{run.data.runControlSessionSnapshot.status}</Badge></div><p className="mt-2 text-[10px] text-cyan-800">{run.data.runControlSessionRef} · health snapshots {(run.data.runHealthSnapshots ?? []).length} · control actions {(run.data.runControlActions ?? []).length}</p><div className="mt-2 space-y-1">{(run.data.runHealthSnapshots ?? []).map((x: any) => <p key={x.code} className="font-mono text-[9px] leading-4 text-cyan-800">• C{x.cycle} {x.severity} · Δt {x.timeSync?.maxOffsetMs ?? '—'}ms · topic loss {x.topicHealth?.lossPct ?? '—'}%{(x.stopConditionsTriggered ?? []).length ? ` · ${x.stopConditionsTriggered.map((s: any) => s.id).join(', ')}` : ''}</p>)}</div><div className="mt-2 space-y-1">{(run.data.runControlActions ?? []).map((x: any) => <p key={x.code} className="text-[9px] leading-4 text-cyan-800">{x.action} · {x.performedByName} · {x.signatureRef ? 'signed' : 'system-attested'}</p>)}</div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-cyan-700">Control hash: {run.data.runControlHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-cyan-700">Final hash: {run.data.runControlFinalHash ?? '—'}</p></div>}
              {run.data.eventReconstructionSnapshot && <div className="rounded-md border border-violet-200 bg-violet-50/30 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-700" /><p className="text-xs font-semibold text-violet-900">Time-Aligned Event Reconstruction / Run Data Quality</p></div><Badge variant="outline" className="border-violet-200 bg-white text-[9px] text-violet-700">{run.data.dataQualityAssessmentSnapshot?.decision ?? '—'} · {run.data.dataQualityAssessmentSnapshot?.qualityScore ?? '—'}</Badge></div><p className="mt-2 text-[10px] text-violet-800">{run.data.eventReconstructionRef} · {run.data.eventReconstructionSnapshot.sourceCatalog?.length ?? 0} sources · canonical sample {run.data.eventReconstructionSnapshot.canonicalEventStats?.sampleRows ?? '—'}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{(run.data.dataQualityAssessmentSnapshot?.checks ?? []).map((x: any) => <div key={x.id} className="flex items-start gap-2 rounded border border-violet-100 bg-white/70 px-2 py-1.5 text-[9px] leading-4">{x.pass ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-600" />}<span><b>{x.label}</b> · {x.evidence}</span></div>)}</div><div className="mt-2 space-y-1">{(run.data.eventReconstructionSnapshot.canonicalTimeline ?? []).slice(0, 10).map((x: any) => <p key={x.eventId} className="font-mono text-[9px] leading-4 text-violet-800">+{x.alignedTimeMs}ms · {x.sourceType} · {x.eventType} · {x.semanticKey}</p>)}</div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-violet-700">Reconstruction: {run.data.eventReconstructionHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-violet-700">DQ final: {run.data.runDataQualityFinalHash ?? '—'}</p></div>}
              {run.data.runAdjudicationDecisionSnapshot && <div className="rounded-md border border-amber-200 bg-amber-50/30 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-amber-700" /><p className="text-xs font-semibold text-amber-900">Event-to-Measure / Automated Adjudication</p></div><Badge variant="outline" className="border-amber-200 bg-white text-[9px] text-amber-700">{run.data.runAdjudicationDecisionSnapshot.decision}</Badge></div><p className="mt-2 text-[10px] text-amber-800">RuleSet {run.data.adjudicationRuleSetRef} · Mission observations {(run.data.missionStepObservationRefs ?? []).length} · Measure results {(run.data.runMeasureResultRefs ?? []).length}</p><div className="mt-2 space-y-1.5">{(run.data.runMeasureResultSnapshots ?? []).map((x: any) => <div key={x.code} className="flex items-start justify-between gap-2 rounded border border-amber-100 bg-white/70 px-2.5 py-2 text-[9px] leading-4"><div><p className="font-semibold text-zinc-700">{x.measureRef} · {x.measureName}</p><p className="text-zinc-500">{x.value}{x.unit} · {x.direction} {x.thresholdSnapshot}{x.unit} · {x.observationRef}</p></div><Badge variant="outline" className={x.performanceMet ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}>{x.performanceDecision}</Badge></div>)}</div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-amber-700">Adjudication: {run.data.automatedAdjudicationHash}</p><p className="mt-1 break-all font-mono text-[9px] leading-4 text-amber-700">Final: {run.data.automatedAdjudicationFinalHash ?? '—'}</p></div>}
              <div className="rounded-md border border-zinc-200 bg-zinc-50/50 p-4"><p className="text-xs font-semibold text-zinc-800">Run 结果摘要</p><p className="mt-2 text-xs leading-5 text-zinc-600">{run.data.resultSummary ?? '尚无结果'}</p></div>
              <div className="rounded-md border border-zinc-200 p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-800">可重放执行指纹</p></div><Badge variant="outline" className={cn('text-[9px]', run.data.audit?.configurationComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>{run.data.audit?.configurationComplete ? '配置完整' : '配置未就绪'}</Badge></div><p className="mt-2 break-all font-mono text-[9px] leading-4 text-zinc-500">{run.data.audit?.configurationHash ?? '—'}</p>{run.data.audit?.blockers?.length ? <div className="mt-2 space-y-1 text-[10px] leading-4 text-amber-800">{run.data.audit.blockers.map((x: string) => <p key={x}>• {x}</p>)}</div> : <p className="mt-2 text-[10px] text-emerald-700">场景、模型、资源、输入和随机策略已形成可重算配置指纹。</p>}</div>
              <div className="rounded-md border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-800">模型-场景适用域检查</p><div className="mt-2 space-y-2">{(Array.isArray(run.data.modelDomainChecks) ? run.data.modelDomainChecks : []).map((c: any) => <div key={`${c.model}-${c.reason}`} className="flex items-start gap-2 text-[10px] leading-4">{c.inDomain ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />}<span><b>{c.model}</b> · {c.reason}</span></div>)}</div></div>
            </div>
          </div>}
        </TabsContent>

        <TabsContent value="packages" className="mt-4 space-y-3">
          <div className="grid gap-2 lg:grid-cols-3">
            {data.packages.map((p) => (
              <button key={p.pk} onClick={() => setSelectedPackage(p.pk)} className={cn('rounded-md border p-3 text-left', selectedPackage === p.pk ? 'border-sky-300 bg-sky-50/50' : 'border-zinc-200 hover:bg-zinc-50')}>
                <div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-zinc-400">{p.pk}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{p.title}</p></div><Badge variant="outline" className="text-[9px]">{p.data.status}</Badge></div>
                <p className="mt-2 text-[10px] text-zinc-500">{p.data.scope}</p><p className="mt-1 text-[10px] text-zinc-500">Run {p.data.runRefs?.length ?? 0} · Dataset {p.data.datasetRefs?.length ?? 0} · Model {p.data.modelRefs?.length ?? 0}</p>
              </button>
            ))}
          </div>

          {pkg && <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
            <div className="rounded-md border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-zinc-400">{pkg.pk} · {pkg.data.version}</p><h3 className="text-sm font-semibold text-zinc-900">{pkg.title}</h3><p className="mt-1 text-xs text-zinc-500">{pkg.data.scope}</p></div><div className="flex gap-2"><Badge variant="outline">{pkg.data.status}</Badge>{pkg.pk === 'EP-CASE01-M13-V0.4' && !String(pkg.data.status).startsWith('已冻结') && <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[9px] text-zinc-500">由状态机冻结</Badge>}</div></div>
              <div className="mt-4 grid gap-3 md:grid-cols-2"><ListBox title="Run Manifest" values={pkg.data.runRefs} /><ListBox title="Dataset Manifest" values={pkg.data.datasetRefs} /><ListBox title="Model / VV&A Manifest" values={pkg.data.modelRefs} /><ListBox title="Scenario + Measure" values={[...(pkg.data.scenarioRefs ?? []), ...(pkg.data.measureRefs ?? [])]} /></div>
              <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3"><p className="text-[10px] font-semibold text-zinc-600">结论候选与适用边界</p><p className="mt-1 text-xs leading-5 text-zinc-700">{pkg.data.conclusionCandidate}</p>{pkg.data.limitations?.length ? <div className="mt-2 text-[10px] leading-4 text-zinc-500">{pkg.data.limitations.map((x: string) => <p key={x}>• {x}</p>)}</div> : null}</div>
            </div>
            <div className="space-y-3">
              <div className="rounded-md border border-zinc-200 p-4"><div className="flex items-center gap-2"><FileArchive className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-800">不可变性与版本</p></div><p className="mt-2 break-all font-mono text-[10px] leading-4 text-zinc-500">{pkg.data.packageHash ?? '尚未冻结：没有 packageHash'}</p><p className="mt-2 text-[10px] text-zinc-500">Supersedes: {pkg.data.supersedes ?? '—'}</p><p className="mt-1 text-[10px] text-zinc-500">Frozen by: {pkg.data.frozenBy ?? '—'}</p><p className="mt-1 text-[10px] text-zinc-500">Gate decision: {pkg.data.gateDecision ?? '尚未记录正式门控'}</p>{pkg.data.manifest && <p className="mt-2 text-[10px] leading-4 text-zinc-500">Manifest 已冻结：Run {pkg.data.manifest.runRefs?.length ?? 0} · Dataset {pkg.data.manifest.datasetRefs?.length ?? 0} · Model {pkg.data.manifest.modelRefs?.length ?? 0} · RuleSet {pkg.data.manifest.ruleSetRef ?? pkg.data.ruleSetRef}</p>}</div>
              <div className="rounded-md border border-sky-200 bg-sky-50/40 p-4"><p className="text-xs font-semibold text-sky-900">冻结 ≠ 门控通过</p><p className="mt-2 text-[10px] leading-5 text-sky-800">冻结只证明“这一版证据清单和运行快照以后不再悄悄变化”。模型超验证域、未认可或缺少实测锚点时，冻结后的证据包仍可被 Evidence Gate 阻塞。</p></div>
            </div>
          </div>}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
            <div className="rounded-md border border-zinc-200 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-semibold text-zinc-900">可配置门控规则集</p><p className="mt-1 text-[10px] text-zinc-500">已发布版本不可原地改写；必须复制为草案、评审后再发布。所有变更写入 Action Log。</p></div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"><div className="w-full sm:w-80"><Select value={selectedRuleSet} onValueChange={setSelectedRuleSet}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{data.ruleSets.map((r) => <SelectItem key={r.pk} value={r.pk}>{r.title}</SelectItem>)}</SelectContent></Select></div>{ruleSetEditable ? <Button size="sm" onClick={publishRuleSet}>发布草案</Button> : <Button size="sm" variant="outline" onClick={cloneRuleSet}>复制为新草案</Button>}</div>
              </div>
              <div className="mt-3 space-y-2">{rules.map((r: any) => <div key={r.id} className="rounded-md border border-zinc-200 bg-zinc-50/40 p-3"><div className="flex flex-wrap items-center gap-3"><Switch disabled={!ruleSetEditable} checked={r.enabled !== false} onCheckedChange={(checked) => updateRule(r.id, { enabled: checked })} /><div className="min-w-[180px] flex-1"><p className="text-xs font-medium text-zinc-800">{r.label}</p><p className="text-[9px] text-zinc-400">{r.type}</p></div><Select disabled={!ruleSetEditable} value={r.severity} onValueChange={(value) => updateRule(r.id, { severity: value })}><SelectTrigger className="h-8 w-28 text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hard">硬阻塞</SelectItem><SelectItem value="soft">软条件</SelectItem></SelectContent></Select>{r.type === 'datasetQuality' && <div className="flex items-center gap-1"><Input disabled={!ruleSetEditable} value={qualityDraft} onChange={(e) => setQualityDraft(e.target.value)} className="h-8 w-16 text-xs" /><Button disabled={!ruleSetEditable} size="sm" variant="outline" className="h-8" onClick={() => updateRule(r.id, { minQuality: Number(qualityDraft) })}>质量门槛</Button></div>}</div>{r.rationale && <p className="mt-2 text-[10px] leading-4 text-zinc-500">{r.rationale}</p>}</div>)}</div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-zinc-200 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">当前评估</p></div>{evaluation && <Badge variant="outline" className={cn('text-[10px]', decisionClass[evaluation.decision])}>{evaluation.decision}</Badge>}</div><p className="mt-2 text-[10px] text-zinc-500">Package: {selectedPackage}</p><p className="mt-1 text-[10px] text-zinc-500">Rule Set: {selectedRuleSet}</p>{evaluation && <p className="mt-1 text-[10px] font-medium text-zinc-600">模式：{evaluation.assessmentMode}</p>}{evaluation && <div className="mt-3 grid grid-cols-3 gap-2 text-center"><MiniMetric label="得分" value={`${evaluation.score}%`} /><MiniMetric label="硬阻塞" value={String(evaluation.hardFailures.length)} /><MiniMetric label="软缺口" value={String(evaluation.softFailures.length)} /></div>}{evaluation?.assessmentMode === '正式准入评估' && packageFrozen && selectedPackage === 'EP-CASE01-M13-V0.4' && <p className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-4 text-zinc-600">正式写回由顶部状态机的“运行 STRICT-V1”动作控制，防止越序绕过。</p>}{evaluation?.assessmentMode === '对比/探索评估' && <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-800">当前规则集不是该证据包绑定的已发布版本，因此只能做对比/探索评估，不能写回正式判定。</p>}</div>
              <div className="rounded-md border border-zinc-200 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">规则执行明细</p></div><div className="mt-2 space-y-2">{evaluation?.checks.map((c) => <div key={c.id} className="flex items-start gap-2 text-[10px] leading-4">{!c.applicable ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" /> : c.pass ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />}<div><p className="font-medium text-zinc-700">{c.label} <span className="font-normal text-zinc-400">· {c.severity === 'hard' ? '硬规则' : '软规则'}</span></p><p className="text-zinc-500">{c.note}</p></div></div>)}</div></div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
    </>
  )
}

function ListBox({ title, values }: { title: string; values: unknown }) {
  const list = Array.isArray(values) ? values : values ? [values] : []
  return <div className="rounded-md border border-zinc-200 p-3"><p className="text-[10px] font-semibold text-zinc-600">{title}</p><div className="mt-1.5 space-y-1">{list.length ? list.map((x, i) => <p key={`${String(x)}-${i}`} className="break-all font-mono text-[10px] leading-4 text-zinc-500">• {typeof x === 'string' ? x : JSON.stringify(x)}</p>) : <p className="text-[10px] text-zinc-400">—</p>}</div></div>
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-zinc-200 bg-zinc-50/50 p-2"><p className="text-[9px] text-zinc-400">{label}</p><p className="mt-0.5 text-lg font-semibold text-zinc-800">{value}</p></div>
}
