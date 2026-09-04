'use client'

import { useEffect, useState } from 'react'
import { api, type ModuleKey } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { ModuleHeader, LoadingGrid } from './shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight, BadgeCheck, CheckCircle2, CircleAlert, Database, FileArchive,
  Fingerprint, GitBranch, Gavel, History, Network, RefreshCw, Route, ShieldCheck, UsersRound, MessageSquareWarning,
} from 'lucide-react'

type NodeKind = 'decision' | 'human-review' | 'expert-opinion' | 'gate' | 'rules' | 'package' | 'run' | 'adjudication' | 'observation' | 'model' | 'dataset' | 'scenario' | 'measure'
type Node = { id: string; kind: NodeKind; label: string; subtitle: string; status?: string; module: ModuleKey; details: Record<string, any>; stepRefs?: string[] }
type ChainStep = {
  index: number; id: string; label: string; output: string; completed: boolean
  policy: { requiresApproval: boolean; separationOfDuty: boolean }
  approval: any | null; signatures: any[]; actionLogs: any[]
}
type Data = {
  caseId: string; sourceMode: 'frozen-manifest' | 'live-draft'; finalFrozen: boolean
  decision: Node; activePackageId: string; ruleSetId: string
  evaluation: { decision: string; score: number; hardFailures: any[]; softFailures: any[] }
  evidenceColumns: Array<{ id: string; title: string; nodes: Node[] }>
  businessChain: ChainStep[]; approvals: any[]; signatures: any[]; logs: any[]
  integrity: {
    packageFrozen: boolean; packageHash: string | null; packageHashExpected: string | null; packageHashValid: boolean
    ruleSetPublishedHash: string | null; signaturesTotal: number; signaturesValid: number; approvalsTotal: number
    completedSteps: number; totalSteps: number
  }
  notice: string
}

const kindLabel: Record<NodeKind, string> = {
  decision: 'Decision', 'human-review': 'Human Final Adjudication', 'expert-opinion': 'Expert Opinion', gate: 'Gate Evaluation', rules: 'RuleSet', package: 'Evidence Package', run: 'TestRun',
  adjudication: 'Automated Adjudication', observation: 'Run Measure Result',
  model: 'Model / VV&A', dataset: 'Dataset', scenario: 'Scenario', measure: 'Measure',
}

const kindIcon: Record<NodeKind, any> = {
  decision: Gavel, 'human-review': UsersRound, 'expert-opinion': MessageSquareWarning, gate: ShieldCheck, rules: GitBranch, package: FileArchive, run: Route,
  adjudication: Gavel, observation: Fingerprint,
  model: BadgeCheck, dataset: Database, scenario: Network, measure: Fingerprint,
}

function tone(status?: string) {
  const value = String(status ?? '')
  if (value.includes('通过') || value.includes('完成') || value.includes('认可') || value.includes('冻结')) return 'border-emerald-200 bg-emerald-50/40'
  if (value.includes('阻塞') || value.includes('未达标') || value.includes('失败') || value.includes('异常')) return 'border-red-200 bg-red-50/40'
  if (value.includes('待') || value.includes('草稿') || value.includes('统计') || value.includes('条件')) return 'border-amber-200 bg-amber-50/40'
  return 'border-zinc-200 bg-white'
}

export function DecisionProvenanceModule({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Node | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const next = await api<Data>('/api/decision-provenance')
      setData(next)
      setSelected((old) => old ? next.evidenceColumns.flatMap((c) => c.nodes).find((n) => n.id === old.id) ?? next.decision : next.decision)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const current = selected ?? data?.decision ?? null

  return <div className="space-y-5">
    <ModuleHeader
      title="鉴定审计视图 / Decision Provenance"
      desc="以鉴定决策为根节点，反向展开 Human Final Adjudication、专家独立意见、Evidence Gate、证据包、Run、Event→Measure 自动判读、模型/VV&A、数据以及审批签署。"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />刷新审计</Button><Button size="sm" onClick={() => onNavigate('digitalCase')}>返回 CASE-01</Button></div>}
    />

    {loading && !data ? <LoadingGrid rows={4} /> : data ? <>
      <section className={cn('rounded-lg border p-4', data.finalFrozen ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">CASE-01</Badge><Badge variant="outline">{data.activePackageId}</Badge><Badge variant="outline">{data.ruleSetId}</Badge><Badge variant="outline" className={data.finalFrozen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{data.finalFrozen ? '正式结论已冻结' : '当前决策 / 未冻结'}</Badge></div>
            <h2 className="mt-3 text-lg font-semibold text-zinc-900">{data.decision.label}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{String(data.decision.details.conclusion ?? '—')}</p>
            <p className="mt-2 text-[10px] leading-4 text-zinc-500">{data.notice}</p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
            <Metric label="Gate" value={data.evaluation.decision} />
            <Metric label="规则得分" value={`${data.evaluation.score}%`} />
            <Metric label="审批记录" value={String(data.integrity.approvalsTotal)} />
            <Metric label="有效签署" value={`${data.integrity.signaturesValid}/${data.integrity.signaturesTotal}`} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-zinc-900">反向决策证据图</h3><p className="mt-1 text-[11px] text-zinc-500">从左向右反查：结论 → 专家合议/终审 → Gate/RuleSet → Evidence Package → Run → Event→Measure → 模型、场景、指标与原始/派生数据。</p></div>
          <Badge variant="outline" className={data.sourceMode === 'frozen-manifest' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{data.sourceMode === 'frozen-manifest' ? '读取冻结 Manifest' : '读取草稿当前态'}</Badge>
        </div>
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="grid min-w-[1760px] grid-cols-[210px_260px_240px_220px_250px_280px_300px] gap-4">
            {data.evidenceColumns.map((column, colIndex) => <div key={column.id} className="relative min-w-0">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{column.title}</p>
              <div className="space-y-2">{column.nodes.map((item) => <ProvenanceCard key={item.id} item={item} active={current?.id === item.id} onClick={() => setSelected(item)} />)}</div>
              {colIndex < data.evidenceColumns.length - 1 && <ArrowRight className="absolute -right-3 top-8 h-4 w-4 text-zinc-300" />}
            </div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-zinc-700" /><h3 className="text-sm font-semibold text-zinc-900">四链汇合 · 8 步鉴定治理矩阵</h3></div>
          <p className="mt-1 text-[11px] text-zinc-500">每一行同时展示 Business State、Approval、Signature、Action Log；执行签署有效后，该业务状态才被视为真正完成。</p>
          <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200">
            <table className="min-w-[920px] w-full text-[10px]">
              <thead className="bg-zinc-50 text-zinc-500"><tr><th className="px-3 py-2 text-left">业务状态</th><th className="px-3 py-2 text-left">审批链</th><th className="px-3 py-2 text-left">签署链</th><th className="px-3 py-2 text-left">Action Log</th><th className="px-3 py-2 text-left">状态</th></tr></thead>
              <tbody>{data.businessChain.map((step) => <tr key={step.id} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-2.5"><p className="font-mono text-zinc-400">{String(step.index + 1).padStart(2, '0')} · {step.id}</p><p className="mt-1 font-medium text-zinc-800">{step.label}</p><p className="mt-1 text-zinc-400">{step.output}</p></td>
                <td className="px-3 py-2.5">{step.policy.requiresApproval ? step.approval ? <><p className="text-zinc-700">发起：{step.approval.requestedByName}</p><p className="mt-1 text-zinc-500">批准：{step.approval.approvedByName ?? '待审批'}</p><p className="mt-1 font-mono text-zinc-400">{step.approval.code}</p></> : <span className="text-amber-700">尚未发起</span> : <span className="text-zinc-400">无需独立审批</span>}</td>
                <td className="px-3 py-2.5"><div className="space-y-1">{step.signatures.length ? step.signatures.map((sig: any) => <p key={sig.code} className={sig.integrityValid ? 'text-zinc-600' : 'text-red-700'}><span className="font-mono">{sig.phase}</span> · {sig.signerName} {sig.integrityValid ? '✓' : '✕'}</p>) : <span className="text-zinc-400">无签署</span>}</div></td>
                <td className="px-3 py-2.5">{step.actionLogs.length ? step.actionLogs.map((log: any) => <p key={log.id} className="text-zinc-600">{log.parameters.result ?? '状态迁移完成'}<br/><span className="text-zinc-400">{log.performedBy}</span></p>) : <span className="text-zinc-400">未执行</span>}</td>
                <td className="px-3 py-2.5">{step.completed ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />已完成</span> : <span className="inline-flex items-center gap-1 text-amber-700"><CircleAlert className="h-3.5 w-3.5" />未闭合</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-zinc-700" /><h3 className="text-sm font-semibold text-zinc-900">完整性锚点</h3></div><Badge variant="outline">{data.integrity.completedSteps}/{data.integrity.totalSteps} 步</Badge></div>
            <div className="mt-3 space-y-2 text-[10px] leading-4 text-zinc-500">
              <IntegrityRow label="Evidence Package" ok={data.integrity.packageFrozen ? data.integrity.packageHashValid : null} value={data.integrity.packageFrozen ? (data.integrity.packageHashValid ? '冻结哈希一致' : '冻结哈希异常') : '尚未冻结'} />
              <IntegrityRow label="RuleSet" ok={Boolean(data.integrity.ruleSetPublishedHash)} value={data.integrity.ruleSetPublishedHash ? '已发布版本有哈希' : '缺少发布哈希'} />
              <IntegrityRow label="Signatures" ok={data.integrity.signaturesTotal === data.integrity.signaturesValid} value={`${data.integrity.signaturesValid}/${data.integrity.signaturesTotal} 完整`} />
            </div>
            {data.integrity.packageHash && <p className="mt-3 break-all font-mono text-[9px] leading-4 text-zinc-400">Package: {data.integrity.packageHash}</p>}
            {data.integrity.ruleSetPublishedHash && <p className="mt-2 break-all font-mono text-[9px] leading-4 text-zinc-400">RuleSet: {data.integrity.ruleSetPublishedHash}</p>}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-zinc-900">选中对象</h3>{current && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onNavigate(current.module)}>打开源模块</Button>}</div>
            {current ? <><div className="mt-3 flex items-start gap-2">{(() => { const Icon = kindIcon[current.kind]; return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" /> })()}<div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{kindLabel[current.kind]}</p><p className="mt-0.5 text-xs font-semibold text-zinc-800">{current.label}</p><p className="mt-1 break-all font-mono text-[9px] text-zinc-400">{current.id}</p></div></div>{current.stepRefs?.length ? <div className="mt-3 rounded-md border border-sky-200 bg-sky-50/40 p-2.5"><p className="text-[9px] font-semibold text-sky-700">关联治理步骤</p>{data.businessChain.filter((step) => current.stepRefs?.includes(step.id)).map((step) => <div key={step.id} className="mt-1.5 text-[10px] leading-4 text-sky-900"><p><b>{step.index + 1}. {step.label}</b> · {step.completed ? '已完成' : '未闭合'}</p><p className="text-sky-700">审批 {step.approval ? '有' : '无'} · 签署 {step.signatures.length} · Action {step.actionLogs.length}</p></div>)}</div> : null}<DetailList details={current.details} /></> : null}
          </section>
        </div>
      </section>
    </> : null}
  </div>
}

function ProvenanceCard({ item, active, onClick }: { item: Node; active: boolean; onClick: () => void }) {
  const Icon = kindIcon[item.kind]
  return <button type="button" onClick={onClick} className={cn('w-full rounded-md border p-3 text-left transition-colors', tone(item.status), active && 'ring-2 ring-zinc-500 ring-offset-1')}>
    <div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{kindLabel[item.kind]}</p>{item.status && <Badge variant="outline" className="h-5 max-w-24 truncate text-[8px]">{item.status}</Badge>}</div><p className="mt-1 text-xs font-semibold leading-4 text-zinc-800">{item.label}</p><p className="mt-1 break-all font-mono text-[9px] leading-3.5 text-zinc-400">{item.subtitle}</p></div></div>
  </button>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-zinc-200 bg-white/80 p-2.5"><p className="text-[9px] text-zinc-400">{label}</p><p className="mt-1 text-sm font-semibold text-zinc-800">{value}</p></div> }

function IntegrityRow({ label, ok, value }: { label: string; ok: boolean | null; value: string }) {
  return <div className="flex items-center justify-between gap-2 rounded border border-zinc-100 bg-zinc-50/50 px-2.5 py-2"><span>{label}</span><span className={ok === true ? 'text-emerald-700' : ok === false ? 'text-red-700' : 'text-amber-700'}>{value}</span></div>
}

function DetailList({ details }: { details: Record<string, any> }) {
  const rows = Object.entries(details).filter(([, v]) => v !== null && v !== undefined).slice(0, 16)
  return <div className="mt-3 space-y-2">{rows.map(([key, value]) => <div key={key} className="border-t border-zinc-100 pt-2"><p className="text-[9px] font-semibold text-zinc-400">{key}</p><p className="mt-0.5 break-words text-[10px] leading-4 text-zinc-600">{typeof value === 'object' ? JSON.stringify(value, null, 0) : String(value)}</p></div>)}</div>
}
