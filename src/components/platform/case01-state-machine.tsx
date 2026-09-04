'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, post } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Check, CircleDot, FileCheck2, Gauge, LockKeyhole, PauseCircle, Play, PlayCircle, RefreshCw, RotateCcw, ShieldCheck, Square, TerminalSquare, RadioTower, ClipboardCheck, XCircle, CheckCircle2, Wrench, Gavel, UsersRound, Scale, MessageSquareWarning } from 'lucide-react'

type StepState = 'done' | 'current' | 'locked'
type Policy = {
  stepId: string
  initiatorRole: string
  approverRole?: string
  executorRole: string
  requiresApproval: boolean
  separationOfDuty: boolean
  rationale: string
}
type Step = { id: string; label: string; short: string; output: string; index: number; state: StepState; policy: Policy }
type Actor = { id: string; name: string; title: string; roleId: string; roleName: string }
type Log = { id: string; status: string; performedBy: string; createdAt: string; parameters: Record<string, any> }
type Approval = {
  code: string; stepId: string; status: string; requestedByName: string; requestedAt: string
  approvedByName?: string | null; approvedAt?: string | null; decision?: string | null
}
type Signature = {
  code: string; stepId: string; phase: string; signerName: string; signerRoleName: string; signedAt: string
  subjectDigest: string; signatureHash: string; assurance: string; integrityValid: boolean
}
type ReadinessCheck = { id: string; label: string; pass: boolean; severity: string; evidence: string }
type ReadinessReview = { code: string; status: string; attempt: number; reviewHash: string; checks: ReadinessCheck[]; hardFailures?: string[]; remediation?: string[] }
type Readiness = {
  required: boolean; passed: boolean; status: 'NOT_REQUIRED' | 'NOT_RUN' | 'BLOCKED' | 'READY'; attempt?: number
  executionMode?: string; requiredRole?: string; requiredRoleName?: string; allowed?: boolean; actionLabel?: string; note?: string
  blockers?: string[]; latestTestReview?: ReadinessReview | null; latestFederationReview?: ReadinessReview | null
}
type Governance = {
  policy: Policy & { initiatorRoleName: string; approverRoleName: string | null; executorRoleName: string }
  stage: 'awaiting-request' | 'awaiting-approval' | 'ready-execution'
  requiredRole: string
  requiredRoleName: string
  allowed: boolean
  approval: Approval | null
}
type RunHealth = { code: string; cycle: number; severity: 'GREEN' | 'AMBER' | 'RED'; observedAt: string; nodeHealth?: Array<{ id: string; status: string; heartbeatAgeMs: number }>; gatewayHealth?: Array<{ id: string; status: string; latencyMs: number; dropPct: number }>; timeSync?: { maxOffsetMs: number; toleranceMs: number; status: string }; topicHealth?: { requiredCount: number; activeCount: number; lossPct: number }; dataCapture?: { status: string; writeLagMs: number; gapCount: number }; stopConditionsTriggered?: Array<{ id: string; action?: string; note?: string; observed?: string; threshold?: string }> }
type RunControlAction = { code: string; action: string; performedAt: string; performedByName: string; signatureRef?: string | null; systemAttestationHash?: string | null }
type RunControl = {
  required: boolean; status: string; readyForFormalization: boolean; completed?: boolean; allowed?: boolean; requiredRole?: string; runRef?: string; executionMode?: string; attempt?: number; actionLabel?: string; note?: string; blockers?: string[]
  session?: Record<string, any>; latestHealth?: RunHealth | null; snapshots?: RunHealth[]; actions?: RunControlAction[]
}
type DataQualityCheck = { id: string; label: string; pass: boolean; severity: string; evidence: string }
type ReconstructedEvent = { eventId: string; sourceId: string; sourceType: string; eventType: string; semanticKey: string; alignedTimeMs: number; correlationId?: string }
type RunDataQuality = {
  required: boolean; status: string; readyForEvidence: boolean; allowed?: boolean; requiredRole?: string; runRef?: string; executionMode?: string; sessionRef?: string; actionLabel?: string; note?: string; blockers?: string[]
  latestReconstruction?: Record<string, any> | null; latestAssessment?: { code: string; decision: string; qualityScore: number; checks: DataQualityCheck[]; hardFailures?: string[]; assessmentHash: string } | null
  reconstructions?: Array<Record<string, any>>; assessments?: Array<Record<string, any>>; actions?: Array<Record<string, any>>
}
type AutomatedAdjudication = {
  required: boolean; status: string; readyForRunSignoff: boolean; allowed?: boolean; requiredRole?: string; runRef?: string; executionMode?: string; actionLabel?: string; note?: string; blockers?: string[]
  ruleSet?: Record<string, any> | null; latestDecision?: Record<string, any> | null; missionStepObservations?: Array<Record<string, any>>; measureObservations?: Array<Record<string, any>>; runMeasureResults?: Array<Record<string, any>>; actions?: Array<Record<string, any>>
}
type ExpertReview = {
  required: boolean; status: string; readyForFinalApproval: boolean; requiredRole?: string; requiredRoleName?: string; allowed?: boolean; actionLabel?: string | null; note?: string; blockers?: string[]
  panel?: Record<string, any> | null; opinions?: Array<Record<string, any>>; finalDecision?: Record<string, any> | null; memberIds?: string[]; quorumRequired?: number; submittedCount?: number
}
type SecuritySession = { authenticated: boolean; mode?: string; identity?: { subject: string; displayName: string; actorId?: string; roles?: string[]; assurance?: string }; error?: string }
type Machine = {
  caseId: string
  currentStep: number
  completed: boolean
  status: string
  finalGateDecision: string | null
  performanceDecision: string | null
  packageStatus: string
  packageHash: string | null
  strictPublishedHash: string | null
  steps: Step[]
  actors: Actor[]
  governance: Governance | null
  readiness: Readiness
  runControl: RunControl
  runDataQuality: RunDataQuality
  automatedAdjudication: AutomatedAdjudication
  expertReview: ExpertReview
  approvals: Approval[]
  signatures: Signature[]
  logs: Log[]
  prototypeDataNotice: string
}

const stageLabel: Record<Governance['stage'], string> = {
  'awaiting-request': '待发起审批',
  'awaiting-approval': '待独立审批',
  'ready-execution': '已批准 / 待执行签署',
}

export function Case01StateMachine({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [actorId, setActorId] = useState('ACT-LIN')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [securitySession, setSecuritySession] = useState<SecuritySession | null>(null)

  const load = async (nextActorId = actorId) => {
    setError(null)
    setMachine(await api<Machine>(`/api/case01-state-machine?actorId=${encodeURIComponent(nextActorId)}`))
  }

  useEffect(() => {
    const init = async () => {
      let session: SecuritySession = { authenticated: false, mode: 'demo' }
      try { session = await api<SecuritySession>('/api/security/session') } catch (e) { session = { authenticated: false, mode: 'unavailable', error: e instanceof Error ? e.message : '身份会话读取失败' } }
      setSecuritySession(session)
      const initialActor = session.authenticated && session.identity?.actorId ? session.identity.actorId : actorId
      if (initialActor !== actorId) setActorId(initialActor)
      await load(initialActor)
    }
    init().catch((e) => setError(e instanceof Error ? e.message : '状态机读取失败'))
  }, [])

  const current = useMemo(() => machine?.steps.find((s) => s.state === 'current') ?? null, [machine])
  const actor = useMemo(() => machine?.actors.find((item) => item.id === actorId) ?? null, [machine, actorId])

  const changeActor = async (next: string) => {
    if (securitySession?.authenticated) { setError('OIDC工程模式禁止前端切换身份；请使用当前认证主体对应的DTEP角色。'); return }
    setActorId(next)
    setBusy(true)
    try { await load(next) } catch (e) { setError(e instanceof Error ? e.message : '身份切换失败') } finally { setBusy(false) }
  }

  const runGovernedAction = async () => {
    if (!current || !machine?.governance) return
    const readinessPending = machine.readiness?.required && !machine.readiness.passed
    if (!readinessPending && machine.governance.stage === 'ready-execution' && machine.runControl?.required && !machine.runControl.readyForFormalization) {
      setError('正式Run尚未完成Run Control / Live Federation Monitoring，不能执行最终签署。')
      return
    }
    if (!readinessPending && machine.governance.stage === 'ready-execution' && machine.runControl?.readyForFormalization && machine.runDataQuality?.required && !machine.runDataQuality.readyForEvidence) {
      setError('正式Run尚未完成 Time-Aligned Event Reconstruction / Run Data Quality，不能执行最终签署。')
      return
    }
    if (!readinessPending && machine.governance.stage === 'ready-execution' && machine.runDataQuality?.readyForEvidence && machine.automatedAdjudication?.required && !machine.automatedAdjudication.readyForRunSignoff) {
      setError('正式Run尚未完成 Event-to-Measure / Automated Adjudication，不能执行最终签署。')
      return
    }
    if (current.id === 'freeze-conclusion' && machine.expertReview?.required && !machine.expertReview.readyForFinalApproval) {
      setError('正式结论审批前必须完成鉴定专家合议与人类最终判定。')
      return
    }
    const operation = readinessPending
      ? 'run-readiness'
      : machine.governance.stage === 'awaiting-request'
        ? 'request-approval'
        : machine.governance.stage === 'awaiting-approval'
          ? 'approve'
          : 'execute'
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/case01-state-machine', { operation, stepId: current.id, actorId })
      setMachine(next)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '受控状态迁移失败')
    } finally { setBusy(false) }
  }

  const runControlOperation = async (operation: 'start' | 'monitor' | 'pause' | 'remediate' | 'resume' | 'prepare-complete' | 'abort') => {
    if (!current) return
    if (operation === 'abort' && typeof window !== 'undefined' && !window.confirm('中止当前Run Attempt？该Attempt将保留为ABORTED，不得进入正式证据；可随后启动新Attempt。')) return
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/run-control', { operation, stepId: current.id, actorId })
      setMachine(next)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run Control操作失败')
    } finally { setBusy(false) }
  }

  const runDataQualityOperation = async (operation: 'reconstruct' | 'remediate-reconstruct') => {
    if (!current) return
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/run-data-quality', { operation, stepId: current.id, actorId })
      setMachine(next)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '事件重建/数据质量操作失败')
    } finally { setBusy(false) }
  }

  const automatedAdjudicationOperation = async () => {
    if (!current) return
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/automated-adjudication', { operation: 'adjudicate', stepId: current.id, actorId })
      setMachine(next)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Event-to-Measure自动判读失败')
    } finally { setBusy(false) }
  }

  const expertReviewOperation = async (operation: 'open-panel' | 'submit-opinion' | 'finalize-panel', payload: Record<string, any> = {}) => {
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/expert-review', { operation, actorId, ...payload })
      setMachine(next)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '鉴定专家合议操作失败')
    } finally { setBusy(false) }
  }

  const reset = async () => {
    if (typeof window !== 'undefined' && !window.confirm('重置会删除本轮 DEMO/SYNTHETIC 补证、审批和签署记录，并恢复到 V0.3 = BLOCKED。继续？')) return
    setBusy(true); setError(null)
    try {
      const next = await post<Machine>('/api/case01-state-machine', { operation: 'reset' })
      setMachine(next)
      await load(actorId)
      await onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '重置失败')
    } finally { setBusy(false) }
  }

  if (!machine) return <div className="rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-500"><RefreshCw className="mr-2 inline h-3.5 w-3.5 animate-spin" />加载 CASE-01 状态机…</div>

  const governance = machine.governance
  const readinessPending = machine.readiness?.required && !machine.readiness.passed
  const expertReviewPending = current?.id === 'freeze-conclusion' && machine.expertReview?.required && !machine.expertReview.readyForFinalApproval
  const requiredRole = expertReviewPending ? machine.expertReview.requiredRole : readinessPending ? machine.readiness.requiredRole : governance?.requiredRole
  const requiredActor = requiredRole ? machine.actors.find((item) => item.roleId === requiredRole) ?? null : null
  const runControlPending = !readinessPending && governance?.stage === 'ready-execution' && machine.runControl?.required && !machine.runControl.readyForFormalization
  const runDataQualityPending = !readinessPending && governance?.stage === 'ready-execution' && machine.runControl?.readyForFormalization && machine.runDataQuality?.required && !machine.runDataQuality.readyForEvidence
  const automatedAdjudicationPending = !readinessPending && governance?.stage === 'ready-execution' && machine.runDataQuality?.readyForEvidence && machine.automatedAdjudication?.required && !machine.automatedAdjudication.readyForRunSignoff
  const actionText = expertReviewPending ? '先完成鉴定专家合议' : readinessPending
    ? (machine.readiness.actionLabel ?? '执行 Readiness Review')
    : governance?.stage === 'awaiting-request'
      ? '提交审批并签署'
      : governance?.stage === 'awaiting-approval'
        ? '批准并签署'
        : runControlPending ? '先完成 Run Control' : runDataQualityPending ? '先完成事件重建与数据质量' : automatedAdjudicationPending ? '先完成Event-to-Measure自动判读' : machine.runControl?.required ? '完成正式 Run 并签署' : '执行并签署'

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2"><Badge variant="outline" className={cn('text-[10px]', machine.completed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700')}>{machine.completed ? 'CLOSED' : machine.currentStep === 0 ? 'V0.3 · BLOCKED' : `STEP ${machine.currentStep}/8`}</Badge><span className="text-[10px] font-semibold tracking-wide text-zinc-500">CASE-01 GOVERNED STATE MACHINE · v2.1 FROZEN</span></div>
          <h2 className="mt-1.5 text-sm font-semibold text-zinc-900">角色、审批与签署约束下的证据闭环</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">业务步骤仍然只有8个；正式Run先形成可信事件与自动判读，STRICT-V1通过后再由3名专家独立评阅、合议主席形成Human Final Adjudication，最后才进入正式结论批准与冻结。</p>
        </div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => load().catch((e) => setError(e.message))} disabled={busy}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新</Button><Button size="sm" variant="outline" onClick={reset} disabled={busy}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />重置演示</Button></div>
      </div>

      <div className="p-4">
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50/50 p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr] md:items-center">
            <label className="text-[10px] font-semibold text-zinc-600">{securitySession?.authenticated ? '当前认证身份' : '当前演示身份'}
              <select value={actorId} onChange={(e) => changeActor(e.target.value)} disabled={busy || !!securitySession?.authenticated} className="mt-1 block h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500">
                {machine.actors.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.name} — {item.roleName}</option>)}
              </select>
            </label>
            <div className="text-[10px] leading-4 text-zinc-500">
              <p>当前角色：<b className="text-zinc-800">{actor?.roleName ?? '—'}</b></p>
              {securitySession?.authenticated ? (
                <>
                  <p>认证主体：<b className="text-emerald-700">{securitySession.identity?.displayName ?? securitySession.identity?.subject}</b> · actor <span className="font-mono">{securitySession.identity?.actorId ?? '未映射'}</span></p>
                  <p>身份保证：<b className="text-emerald-700">OIDC RS256 / JWKS VERIFIED</b> · {securitySession.identity?.assurance ?? 'OIDC'}；角色切换已禁用。</p>
                </>
              ) : (
                <p>身份保证：<b className="text-amber-700">DEMO ROLE SWITCH</b>；工程/生产部署应由可信 OIDC 会话或认证代理提供身份，签署使用独立 PKI/HSM/签名服务。</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {machine.steps.map((step) => <StepCard key={step.id} step={step} />)}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_360px]">
          <div className={cn('rounded-md border p-4', machine.completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50/40')}>
            {machine.completed ? (
              <div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold text-zinc-900">正式结论已冻结</p><p className="mt-1 text-xs leading-5 text-zinc-600">Evidence Gate：{machine.finalGateDecision ?? '—'}；性能结论：{machine.performanceDecision ?? '—'}。审批链与签署链均已形成。</p></div></div>
            ) : current && governance ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-semibold text-zinc-500">当前受控动作</p><Badge variant="outline" className="text-[9px]">{stageLabel[governance.stage]}</Badge></div>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{current.index + 1}. {current.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">预期产物：{current.output}</p>
                  </div>
                  <Button onClick={runGovernedAction} disabled={busy || expertReviewPending || runControlPending || runDataQualityPending || automatedAdjudicationPending || (readinessPending ? !machine.readiness.allowed : !governance.allowed)} className="shrink-0"><Play className="mr-1.5 h-4 w-4" />{busy ? '处理中…' : actionText}</Button>
                </div>

                {machine.readiness.required && <ReadinessPanel readiness={machine.readiness} />}
                {machine.runControl?.required && machine.readiness.passed && governance.stage === 'ready-execution' && <RunControlPanel control={machine.runControl} allowed={Boolean(governance.allowed)} busy={busy} onAction={runControlOperation} />}
                {machine.runDataQuality?.required && machine.runControl?.readyForFormalization && governance.stage === 'ready-execution' && <RunDataQualityPanel quality={machine.runDataQuality} allowed={Boolean(governance.allowed)} busy={busy} onAction={runDataQualityOperation} />}
                {machine.automatedAdjudication?.required && machine.runDataQuality?.readyForEvidence && governance.stage === 'ready-execution' && <AutomatedAdjudicationPanel adjudication={machine.automatedAdjudication} allowed={Boolean(governance.allowed)} busy={busy} onAction={automatedAdjudicationOperation} />}
                {current.id === 'freeze-conclusion' && machine.expertReview?.required && <ExpertReviewPanel review={machine.expertReview} actor={actor} actors={machine.actors} busy={busy} onAction={expertReviewOperation} />}

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <RoleBox label="发起" value={governance.policy.initiatorRoleName} active={!readinessPending && governance.stage === 'awaiting-request'} />
                  <RoleBox label="审批" value={governance.policy.approverRoleName ?? '无需审批'} active={!readinessPending && governance.stage === 'awaiting-approval'} />
                  <RoleBox label="执行/签署" value={governance.policy.executorRoleName} active={!readinessPending && governance.stage === 'ready-execution'} />
                </div>
                <p className="mt-2 text-[10px] leading-4 text-zinc-500">{governance.policy.rationale}</p>
                {(readinessPending ? !machine.readiness.allowed : !governance.allowed) && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-[10px] leading-4 text-amber-800">当前身份无权执行此阶段。需要角色：<b>{readinessPending ? machine.readiness.requiredRoleName : governance.requiredRoleName}</b>{!readinessPending && governance.stage === 'awaiting-approval' ? '；且批准人不得与发起人为同一人。' : '。'}</p>{requiredActor && !securitySession?.authenticated && <Button size="sm" variant="outline" className="h-7 bg-white text-[10px]" onClick={() => changeActor(requiredActor.id)} disabled={busy}>切换到 {requiredActor.title}</Button>}</div>}
                {governance.approval && <p className="mt-2 text-[10px] leading-4 text-zinc-500">审批单：<span className="font-mono">{governance.approval.code}</span> · 发起：{governance.approval.requestedByName}{governance.approval.approvedByName ? ` · 批准：${governance.approval.approvedByName}` : ''}</p>}
              </div>
            ) : null}
            {error && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-700">{error}</p>}
            <p className="mt-3 text-[10px] leading-4 text-zinc-400">{machine.prototypeDataNotice}</p>
          </div>

          <div className="rounded-md border border-zinc-200 p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">审计锚点</p></div>
            <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-zinc-500"><p>Case 状态：<b className="text-zinc-700">{machine.status}</b></p><p>V0.4：<b className="text-zinc-700">{machine.packageStatus}</b></p><p>审批记录：<b className="text-zinc-700">{machine.approvals.length}</b></p><p>签署记录：<b className="text-zinc-700">{machine.signatures.length}</b></p><p>当前 Readiness：<b className={machine.readiness.status === 'READY' ? 'text-emerald-700' : machine.readiness.status === 'BLOCKED' ? 'text-red-700' : 'text-zinc-700'}>{machine.readiness.status}</b></p><p>Run Control：<b className={machine.runControl?.status === 'READY_TO_COMPLETE' || machine.runControl?.status === 'COMPLETED' ? 'text-emerald-700' : machine.runControl?.status === 'PAUSED' ? 'text-red-700' : 'text-zinc-700'}>{machine.runControl?.status ?? 'NOT_REQUIRED'}</b></p><p>Run Data Quality：<b className={machine.runDataQuality?.status === 'READY_FOR_EVIDENCE' ? 'text-emerald-700' : machine.runDataQuality?.status === 'BLOCKED' ? 'text-red-700' : 'text-zinc-700'}>{machine.runDataQuality?.status ?? 'NOT_REQUIRED'}</b></p><p>Automated Adjudication：<b className={machine.automatedAdjudication?.status === 'READY_FOR_RUN_SIGNOFF' ? 'text-emerald-700' : machine.automatedAdjudication?.status === 'BLOCKED' ? 'text-red-700' : 'text-zinc-700'}>{machine.automatedAdjudication?.status ?? 'NOT_REQUIRED'}</b></p><p>Expert Review：<b className={machine.expertReview?.status === 'READY_FOR_FINAL_APPROVAL' ? 'text-emerald-700' : machine.expertReview?.status === 'RETURNED' ? 'text-red-700' : 'text-zinc-700'}>{machine.expertReview?.status ?? 'NOT_REQUIRED'}</b></p><p>STRICT-V1：<span className="break-all font-mono">{machine.strictPublishedHash?.slice(0, 30) ?? '—'}{machine.strictPublishedHash ? '…' : ''}</span></p><p>Package Hash：<span className="break-all font-mono">{machine.packageHash?.slice(0, 30) ?? '—'}{machine.packageHash ? '…' : ''}</span></p></div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <AuditPanel title="审批链" empty="尚无审批记录。">
            {machine.approvals.slice(0, 8).map((item) => <div key={item.code} className="rounded border border-zinc-100 bg-zinc-50/60 p-2.5 text-[10px] leading-4"><div className="flex justify-between gap-2"><span className="font-mono text-zinc-500">{item.stepId}</span><Badge variant="outline" className="text-[8px]">{item.status}</Badge></div><p className="mt-1 text-zinc-700">发起：{item.requestedByName}</p><p className="text-zinc-500">审批：{item.approvedByName ?? '待审批'}</p></div>)}
          </AuditPanel>
          <AuditPanel title="签署链" empty="尚无签署记录。">
            {machine.signatures.slice(0, 10).map((item) => <div key={item.code} className="rounded border border-zinc-100 bg-zinc-50/60 p-2.5 text-[10px] leading-4"><div className="flex justify-between gap-2"><span className="font-mono text-zinc-500">{item.stepId}/{item.phase}</span><span className="text-zinc-400">{new Date(item.signedAt).toLocaleString('zh-CN')}</span></div><p className="mt-1 text-zinc-700">{item.signerName} · {item.signerRoleName} <span className={item.integrityValid ? 'text-emerald-700' : 'text-red-700'}>{item.integrityValid ? '✓ 完整' : '✕ 校验失败'}</span></p><p className="mt-1 break-all font-mono text-[9px] text-zinc-400">{item.signatureHash.slice(0, 42)}…</p></div>)}
          </AuditPanel>
        </div>

        <div className="mt-3 rounded-md border border-zinc-200 p-4">
          <div className="flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">Action Log · 已执行状态迁移</p></div>
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {machine.logs.length ? machine.logs.map((log) => (
              <div key={log.id} className="rounded border border-zinc-100 bg-zinc-50/60 p-2.5 text-[10px] leading-4">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-zinc-500">{String(log.parameters.step ?? 'action')}</span><span className="text-zinc-400">{new Date(log.createdAt).toLocaleString('zh-CN')}</span></div>
                <p className="mt-1 font-medium text-zinc-700">{log.parameters.result ?? log.parameters.label ?? '状态迁移完成'}</p>
                <p className="mt-1 text-zinc-400">执行者：{log.performedBy}</p>
              </div>
            )) : <p className="text-[10px] text-zinc-400">尚无状态迁移动作。</p>}
          </div>
        </div>
      </div>
    </div>
  )
}


function RunControlPanel({ control, allowed, busy, onAction }: { control: RunControl; allowed: boolean; busy: boolean; onAction: (op: 'start' | 'monitor' | 'pause' | 'remediate' | 'resume' | 'prepare-complete' | 'abort') => void | Promise<void> }) {
  const health = control.latestHealth
  const statusClass = control.status === 'READY_TO_COMPLETE' || control.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50/40' : control.status === 'PAUSED' ? 'border-red-200 bg-red-50/40' : control.status === 'RECOVERY_READY' ? 'border-amber-200 bg-amber-50/40' : 'border-sky-200 bg-sky-50/40'
  const severityClass = health?.severity === 'GREEN' ? 'text-emerald-700' : health?.severity === 'RED' ? 'text-red-700' : 'text-amber-700'
  const can = allowed && !busy
  return <div className={cn('mt-3 rounded-md border p-3', statusClass)}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">Run Control / Live Federation Monitoring</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{control.note}</p></div><Badge variant="outline" className="text-[9px]">{control.status}{control.attempt ? ` · A${control.attempt}` : ''}</Badge></div>
    {health && <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6"><Metric label="Health" value={health.severity} cls={severityClass} /><Metric label="Nodes" value={`${(health.nodeHealth ?? []).filter((x) => x.status === 'ONLINE').length}/${health.nodeHealth?.length ?? 0} online`} /><Metric label="Gateways" value={`${(health.gatewayHealth ?? []).filter((x) => x.status === 'UP').length}/${health.gatewayHealth?.length ?? 0} up`} /><Metric label="Time Offset" value={`${health.timeSync?.maxOffsetMs ?? '—'} / ${health.timeSync?.toleranceMs ?? '—'} ms`} /><Metric label="Topic Loss" value={`${health.topicHealth?.lossPct ?? '—'}%`} /><Metric label="Data Capture" value={`${health.dataCapture?.status ?? '—'} · gap ${health.dataCapture?.gapCount ?? '—'}`} /></div>}
    {health?.stopConditionsTriggered?.length ? <div className="mt-2 rounded border border-red-200 bg-white/70 px-2.5 py-2 text-[10px] leading-4 text-red-700">{health.stopConditionsTriggered.map((x) => <p key={x.id}>• {x.id} → {x.action ?? 'PAUSE'} · {x.observed ?? ''} {x.threshold ? `(阈值 ${x.threshold})` : ''} · {x.note ?? ''}</p>)}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      {(control.status === 'NOT_STARTED' || control.status === 'ABORTED') && <Button size="sm" onClick={() => onAction('start')} disabled={!can}><PlayCircle className="mr-1.5 h-3.5 w-3.5" />启动 Run</Button>}
      {control.status === 'RUNNING' && <><Button size="sm" onClick={() => onAction('monitor')} disabled={!can}><Gauge className="mr-1.5 h-3.5 w-3.5" />采集监控帧</Button><Button size="sm" variant="outline" onClick={() => onAction('pause')} disabled={!can}><PauseCircle className="mr-1.5 h-3.5 w-3.5" />人工暂停</Button><Button size="sm" variant="outline" onClick={() => onAction('prepare-complete')} disabled={!can}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />完成前确认</Button><Button size="sm" variant="outline" onClick={() => onAction('abort')} disabled={!can}><Square className="mr-1.5 h-3.5 w-3.5" />中止</Button></>}
      {control.status === 'PAUSED' && <><Button size="sm" onClick={() => onAction('remediate')} disabled={!can}><Wrench className="mr-1.5 h-3.5 w-3.5" />故障处置并复核</Button><Button size="sm" variant="outline" onClick={() => onAction('abort')} disabled={!can}><Square className="mr-1.5 h-3.5 w-3.5" />中止 Attempt</Button></>}
      {control.status === 'RECOVERY_READY' && <><Button size="sm" onClick={() => onAction('resume')} disabled={!can}><PlayCircle className="mr-1.5 h-3.5 w-3.5" />恢复 Run</Button><Button size="sm" variant="outline" onClick={() => onAction('abort')} disabled={!can}><Square className="mr-1.5 h-3.5 w-3.5" />中止 Attempt</Button></>}
      {control.status === 'READY_TO_COMPLETE' && <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />运行健康与控制历史已冻结，可执行上方“完成正式 Run 并签署”。</div>}
    </div>
    {(control.snapshots?.length || control.actions?.length) ? <div className="mt-3 grid gap-2 lg:grid-cols-2"><div className="rounded border border-zinc-200 bg-white p-2.5"><p className="text-[10px] font-semibold text-zinc-700">Health Timeline · {control.snapshots?.length ?? 0}</p><div className="mt-2 space-y-1">{(control.snapshots ?? []).slice(-5).map((x) => <div key={x.code} className="flex items-center justify-between gap-2 text-[9px]"><span className="font-mono text-zinc-500">C{x.cycle} · {x.code}</span><span className={x.severity === 'GREEN' ? 'text-emerald-700' : x.severity === 'RED' ? 'text-red-700' : 'text-amber-700'}>{x.severity} · Δt {x.timeSync?.maxOffsetMs ?? '—'}ms</span></div>)}</div></div><div className="rounded border border-zinc-200 bg-white p-2.5"><p className="text-[10px] font-semibold text-zinc-700">Control Actions · {control.actions?.length ?? 0}</p><div className="mt-2 space-y-1">{(control.actions ?? []).slice(-6).map((x) => <div key={x.code} className="flex items-center justify-between gap-2 text-[9px]"><span className="font-mono text-zinc-500">{x.action}</span><span className="text-zinc-500">{x.performedByName}{x.signatureRef ? ' · signed' : ' · system'}</span></div>)}</div></div></div> : null}
    {!allowed && <p className="mt-2 text-[10px] text-amber-700">当前身份不是本Run执行岗位，不能进行运行控制。</p>}
  </div>
}

function Metric({ label, value, cls }: { label: string; value: string; cls?: string }) { return <div className="rounded border border-zinc-200 bg-white px-2.5 py-2"><p className="text-[9px] text-zinc-400">{label}</p><p className={cn('mt-0.5 text-[11px] font-semibold text-zinc-700', cls)}>{value}</p></div> }


function RunDataQualityPanel({ quality, allowed, busy, onAction }: { quality: RunDataQuality; allowed: boolean; busy: boolean; onAction: (operation: 'reconstruct' | 'remediate-reconstruct') => void }) {
  const assessment = quality.latestAssessment
  const reconstruction = quality.latestReconstruction
  const events = (reconstruction?.canonicalTimeline ?? []) as ReconstructedEvent[]
  const statusClass = quality.status === 'READY_FOR_EVIDENCE' ? 'border-emerald-200 bg-emerald-50/40' : quality.status === 'BLOCKED' ? 'border-red-200 bg-red-50/40' : 'border-violet-200 bg-violet-50/30'
  const can = allowed && !busy
  return <div className={cn('mt-3 rounded-md border p-3', statusClass)}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">Run Data Quality / Time-Aligned Event Reconstruction</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{quality.note}</p></div><Badge variant="outline" className="text-[9px]">{quality.status}{assessment ? ` · ${assessment.qualityScore}` : ''}</Badge></div>
    {assessment && <div className="mt-3 grid gap-2 sm:grid-cols-4"><Metric label="Decision" value={assessment.decision} cls={assessment.decision === 'READY_FOR_EVIDENCE' ? 'text-emerald-700' : 'text-red-700'} /><Metric label="Quality Score" value={`${assessment.qualityScore}/100`} /><Metric label="Raw → Canonical" value={`${reconstruction?.rawEventStats?.sampleRows ?? '—'} → ${reconstruction?.canonicalEventStats?.sampleRows ?? '—'}`} /><Metric label="Clock Residual" value={`${reconstruction?.canonicalEventStats?.maxClockResidualMs ?? '—'} ms`} /></div>}
    {assessment?.checks?.length ? <div className="mt-3 grid gap-2 lg:grid-cols-2">{assessment.checks.map((check) => <div key={check.id} className="flex items-start gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-[9px] leading-4">{check.pass ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />}<div><p className="font-medium text-zinc-700">{check.label}</p><p className="text-zinc-400">{check.evidence}</p></div></div>)}</div> : null}
    {events.length ? <div className="mt-3 rounded border border-zinc-200 bg-white p-2.5"><p className="text-[10px] font-semibold text-zinc-700">Critical Event Timeline · Run Epoch</p><div className="mt-2 space-y-1">{events.slice(0, 12).map((event) => <div key={event.eventId} className="grid grid-cols-[72px_100px_1fr] gap-2 text-[9px] leading-4"><span className="font-mono text-zinc-400">+{event.alignedTimeMs} ms</span><span className="text-zinc-500">{event.sourceType}</span><span className="min-w-0 truncate text-zinc-700">{event.eventType} · {event.semanticKey}</span></div>)}</div></div> : null}
    {quality.status === 'BLOCKED' && <div className="mt-2 rounded border border-red-200 bg-white/70 px-2.5 py-2 text-[10px] leading-4 text-red-700">{(quality.blockers ?? []).map((x) => <p key={x}>• {x}</p>)}</div>}
    <div className="mt-3 flex flex-wrap gap-2">
      {quality.status === 'NOT_RECONSTRUCTED' && <Button size="sm" onClick={() => onAction('reconstruct')} disabled={!can}><Gauge className="mr-1.5 h-3.5 w-3.5" />重建时间线并评估</Button>}
      {quality.status === 'BLOCKED' && <Button size="sm" onClick={() => onAction('remediate-reconstruct')} disabled={!can}><Wrench className="mr-1.5 h-3.5 w-3.5" />校时/去重并重建</Button>}
      {quality.status === 'READY_FOR_EVIDENCE' && <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />事件账本与数据质量报告已冻结；下一步执行Event-to-Measure自动判读。</div>}
    </div>
    {!allowed && <p className="mt-2 text-[10px] text-amber-700">当前身份不是本Run执行岗位，不能执行数据重建/质量处置。</p>}
  </div>
}


function AutomatedAdjudicationPanel({ adjudication, allowed, busy, onAction }: { adjudication: AutomatedAdjudication; allowed: boolean; busy: boolean; onAction: () => void }) {
  const decision = adjudication.latestDecision
  const results = adjudication.runMeasureResults ?? []
  const mission = adjudication.missionStepObservations ?? []
  const ready = adjudication.status === 'READY_FOR_RUN_SIGNOFF'
  const statusClass = ready ? 'border-emerald-200 bg-emerald-50/40' : adjudication.status === 'BLOCKED' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/30'
  return <div className={cn('mt-3 rounded-md border p-3', statusClass)}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><Gavel className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">Event-to-Measure / Automated Adjudication</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{adjudication.note}</p></div><Badge variant="outline" className="text-[9px]">{adjudication.status}</Badge></div>
    {adjudication.ruleSet && <div className="mt-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-[9px] leading-4"><span className="font-semibold text-zinc-700">Frozen RuleSet:</span> <span className="font-mono text-zinc-500">{adjudication.ruleSet.code}</span><span className="ml-2 text-zinc-400">{String(adjudication.ruleSet.publishedHash ?? '').slice(0, 36)}…</span></div>}
    {mission.length > 0 && <div className="mt-3"><p className="text-[10px] font-semibold text-zinc-700">Mission Thread Observations</p><div className="mt-1.5 flex flex-wrap gap-1.5">{mission.map((x: any) => <Badge key={x.code} variant="outline" className="bg-white text-[9px]">{x.missionStepRef} · {x.missionStepLabel} · {x.eventRefs?.length ?? 0} event</Badge>)}</div></div>}
    {results.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{results.map((x: any) => <div key={x.code} className="rounded border border-zinc-200 bg-white p-2.5"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold text-zinc-800">{x.measureRef} · {x.measureName}</p><p className="mt-1 font-mono text-[9px] text-zinc-400">{x.value}{x.unit} · threshold {x.direction} {x.thresholdSnapshot}{x.unit}</p></div><Badge variant="outline" className={cn('text-[9px]', x.performanceMet ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700')}>{x.performanceDecision}</Badge></div><p className="mt-1.5 text-[9px] leading-4 text-zinc-500">{x.note}</p></div>)}</div>}
    {decision?.performanceSummary?.length ? <p className="mt-2 text-[10px] leading-4 text-zinc-500">技术状态：<b className={ready ? 'text-emerald-700' : 'text-red-700'}>{decision.decision}</b>。注意：某个Measure“未达标”不会把自动判读标记为失败；只要规则、事件与计算链完整，试验事实仍可进入Evidence。</p> : null}
    {adjudication.blockers?.length ? <div className="mt-2 rounded border border-red-200 bg-white/70 px-2.5 py-2 text-[10px] leading-4 text-red-700">{adjudication.blockers.map((x) => <p key={x}>• {x}</p>)}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">{!ready && <Button size="sm" onClick={onAction} disabled={!allowed || busy}><Gavel className="mr-1.5 h-3.5 w-3.5" />{adjudication.actionLabel ?? '执行自动判读'}</Button>}{ready && <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Event→Mission Step→Measure→Rule→Result链已冻结，可执行最终Run签署。</div>}</div>
    {!allowed && <p className="mt-2 text-[10px] text-amber-700">当前身份不是本Run执行岗位，不能触发正式自动判读。</p>}
  </div>
}


function ExpertReviewPanel({ review, actor, actors, busy, onAction }: { review: ExpertReview; actor: Actor | null; actors: Actor[]; busy: boolean; onAction: (operation: 'open-panel' | 'submit-opinion' | 'finalize-panel', payload?: Record<string, any>) => void }) {
  const [disposition, setDisposition] = useState('CONCUR_WITH_QUALIFICATION')
  const [challengeType, setChallengeType] = useState('INTERPRETATION_CHALLENGE')
  const [reason, setReason] = useState('机器计算与冻结规则执行正确；同意M-13未达标事实，但最终结论应严格限定在冻结的Threat=4、EW=75%、兵力比0.85场景内。')
  const opinions = review.opinions ?? []
  const ready = review.status === 'READY_FOR_FINAL_APPROVAL'
  const mine = opinions.find((x: any) => x.reviewerId === actor?.id)
  const canOpen = review.status === 'NOT_OPEN' && actor?.roleId === 'evaluation-authority'
  const canSubmit = review.status === 'INDEPENDENT_REVIEW' && actor?.roleId === 'expert-reviewer' && !mine
  const canFinalize = review.status === 'DELIBERATION_READY' && actor?.roleId === 'evaluation-authority'
  return <div className={cn('mt-3 rounded-md border p-3', ready ? 'border-emerald-200 bg-emerald-50/40' : review.status === 'RETURNED' ? 'border-red-200 bg-red-50/40' : 'border-violet-200 bg-violet-50/30')}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-zinc-700"/><p className="text-xs font-semibold text-zinc-900">Expert Review Board / Human Final Adjudication</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{review.note}</p></div><Badge variant="outline" className="text-[9px]">{review.status}</Badge></div>
    {review.panel && <div className="mt-2 grid gap-2 sm:grid-cols-3"><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-[9px] text-zinc-400">Review Mode</p><p className="mt-1 text-[10px] font-medium text-zinc-700">独立盲审 → 统一解盲 → 合议</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-[9px] text-zinc-400">Quorum</p><p className="mt-1 text-[10px] font-medium text-zinc-700">{review.submittedCount ?? 0}/{review.quorumRequired ?? 3}</p></div><div className="rounded border border-zinc-200 bg-white p-2"><p className="text-[9px] text-zinc-400">Machine Fact</p><p className="mt-1 text-[10px] font-medium text-red-700">M-13 83.2% &lt; 85% · 未达标</p></div></div>}
    {review.panel && <div className="mt-3"><p className="text-[10px] font-semibold text-zinc-700">专家成员</p><div className="mt-1.5 grid gap-2 sm:grid-cols-3">{(review.memberIds ?? []).map((id) => { const member=actors.find((x)=>x.id===id); const op=opinions.find((x:any)=>x.reviewerId===id); return <div key={id} className="rounded border border-zinc-200 bg-white p-2"><p className="text-[10px] font-medium text-zinc-700">{member ? `${member.title} · ${member.name}` : id}</p><p className="mt-1 text-[9px] text-zinc-400">{op ? op.blinded ? '已提交 · 盲态隐藏' : `${op.disposition}${op.challengeType && op.challengeType!=='NONE' ? ` · ${op.challengeType}` : ''}` : '待独立提交'}</p>{op && !op.blinded && <p className="mt-1 text-[9px] leading-4 text-zinc-500">{op.reason}</p>}</div> })}</div></div>}
    {canSubmit && <div className="mt-3 grid gap-2 rounded border border-violet-200 bg-white p-2.5 md:grid-cols-[190px_220px_1fr]"><label className="text-[9px] font-semibold text-zinc-500">独立意见<select value={disposition} onChange={(e)=>setDisposition(e.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-300 bg-white px-2 text-[10px]"><option value="CONCUR">CONCUR</option><option value="CONCUR_WITH_QUALIFICATION">CONCUR_WITH_QUALIFICATION</option><option value="DISSENT">DISSENT</option><option value="REQUEST_MORE_EVIDENCE">REQUEST_MORE_EVIDENCE</option></select></label><label className="text-[9px] font-semibold text-zinc-500">异议类型<select value={challengeType} onChange={(e)=>setChallengeType(e.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-300 bg-white px-2 text-[10px]"><option value="NONE">NONE</option><option value="DATA_CHALLENGE">DATA_CHALLENGE</option><option value="RULE_CHALLENGE">RULE_CHALLENGE</option><option value="MODEL_CHALLENGE">MODEL_CHALLENGE</option><option value="SCENARIO_CHALLENGE">SCENARIO_CHALLENGE</option><option value="INTERPRETATION_CHALLENGE">INTERPRETATION_CHALLENGE</option></select></label><label className="text-[9px] font-semibold text-zinc-500">理由<input value={reason} onChange={(e)=>setReason(e.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-300 px-2 text-[10px]"/></label></div>}
    {review.finalDecision && <div className="mt-3 rounded border border-emerald-200 bg-white p-2.5"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-emerald-700"/><p className="text-[10px] font-semibold text-zinc-800">Human Final Adjudication · {review.finalDecision.panelDisposition}</p></div><p className="mt-1.5 text-[10px] leading-4 text-zinc-600">{review.finalDecision.finalFinding}</p><p className="mt-1 break-all font-mono text-[9px] text-zinc-400">{review.finalDecision.humanReviewHash}</p></div>}
    {review.blockers?.length ? <div className="mt-2 rounded border border-red-200 bg-white p-2 text-[10px] text-red-700">{review.blockers.map((x)=><p key={x}>• {x}</p>)}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">{canOpen && <Button size="sm" onClick={()=>onAction('open-panel')} disabled={busy}><UsersRound className="mr-1.5 h-3.5 w-3.5"/>组建合议组</Button>}{canSubmit && <Button size="sm" onClick={()=>onAction('submit-opinion',{disposition,challengeType,reason})} disabled={busy || reason.trim().length<8}><MessageSquareWarning className="mr-1.5 h-3.5 w-3.5"/>提交独立意见并签署</Button>}{canFinalize && <Button size="sm" onClick={()=>onAction('finalize-panel')} disabled={busy}><Scale className="mr-1.5 h-3.5 w-3.5"/>形成合议最终处置并签署</Button>}{ready && <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4"/>人类最终判定已冻结，可提交正式结论审批。</div>}</div>
    {!review.allowed && !ready && !canSubmit && !canOpen && !canFinalize && <p className="mt-2 text-[10px] text-amber-700">请切换到当前合议所需岗位；专家意见在法定人数达到前保持盲态。</p>}
  </div>
}


function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  const testChecks = readiness.latestTestReview?.checks ?? []
  const federationChecks = readiness.latestFederationReview?.checks ?? []
  return <div className={cn('mt-3 rounded-md border p-3', readiness.status === 'READY' ? 'border-emerald-200 bg-emerald-50/40' : readiness.status === 'BLOCKED' ? 'border-red-200 bg-red-50/40' : 'border-sky-200 bg-sky-50/40')}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">Test Readiness{readiness.executionMode === 'LVC' ? ' / Federation Readiness Review' : ' Review'}</p></div><p className="mt-1 text-[10px] leading-4 text-zinc-500">{readiness.note}</p></div><Badge variant="outline" className={cn('text-[9px]', readiness.status === 'READY' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : readiness.status === 'BLOCKED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-700')}>{readiness.status}{readiness.attempt ? ` · A${readiness.attempt}` : ''}</Badge></div>
    {(testChecks.length > 0 || federationChecks.length > 0) && <div className="mt-3 grid gap-2 lg:grid-cols-2">
      <CheckGroup title="Test Readiness" icon={<ClipboardCheck className="h-3.5 w-3.5" />} checks={testChecks} />
      {readiness.executionMode === 'LVC' && <CheckGroup title="Federation Readiness" icon={<RadioTower className="h-3.5 w-3.5" />} checks={federationChecks} />}
    </div>}
    {readiness.blockers?.length ? <div className="mt-2 rounded border border-red-100 bg-white/70 px-2.5 py-2 text-[10px] leading-4 text-red-700">{readiness.blockers.map((x) => <p key={x}>• {x}</p>)}</div> : readiness.status === 'READY' ? <p className="mt-2 text-[10px] text-emerald-700">Readiness 已冻结为 READY；现在才允许进入本步骤的申请—审批—执行签署。</p> : null}
  </div>
}

function CheckGroup({ title, icon, checks }: { title: string; icon: ReactNode; checks: ReadinessCheck[] }) {
  return <div className="rounded border border-zinc-200 bg-white p-2.5"><div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700">{icon}{title}</div><div className="mt-2 space-y-1.5">{checks.map((c) => <div key={c.id} className="flex items-start gap-2 text-[9px] leading-4">{c.pass ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-600" />}<div className="min-w-0"><p className="font-medium text-zinc-700">{c.label}</p><p className="break-words text-zinc-400">{c.evidence}</p></div></div>)}</div></div>
}

function RoleBox({ label, value, active }: { label: string; value: string; active: boolean }) {
  return <div className={cn('rounded border px-2.5 py-2', active ? 'border-zinc-400 bg-white' : 'border-zinc-200 bg-zinc-50/60')}><p className="text-[9px] font-semibold text-zinc-400">{label}</p><p className="mt-0.5 text-[10px] font-medium leading-4 text-zinc-700">{value}</p></div>
}

function AuditPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  return <div className="rounded-md border border-zinc-200 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-zinc-700" /><p className="text-xs font-semibold text-zinc-900">{title}</p></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{hasChildren ? children : <p className="text-[10px] text-zinc-400">{empty}</p>}</div></div>
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.state === 'done' ? Check : step.state === 'current' ? CircleDot : LockKeyhole
  const rolePath = step.policy.requiresApproval ? '发起→审批→执行' : '编制→签署'
  return <div className={cn('min-w-0 rounded-md border p-2.5', step.state === 'done' ? 'border-emerald-200 bg-emerald-50/50' : step.state === 'current' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-zinc-50/30 opacity-65')}><div className="flex items-center justify-between gap-1"><span className="font-mono text-[9px] text-zinc-400">{String(step.index + 1).padStart(2, '0')}</span><Icon className={cn('h-3.5 w-3.5', step.state === 'done' ? 'text-emerald-600' : step.state === 'current' ? 'text-zinc-800' : 'text-zinc-400')} /></div><p className="mt-1 text-[10px] font-semibold leading-4 text-zinc-700">{step.short}</p><p className="mt-1 text-[8px] font-medium text-zinc-400">{rolePath}</p><p className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-zinc-400">{step.output}</p></div>
}
