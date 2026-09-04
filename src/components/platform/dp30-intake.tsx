'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, post, type ModuleKey } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Archive, ArrowRight, BadgeCheck, Boxes, Braces, Check, CircleDot, FileCheck2, FileCog,
  Fingerprint, FlaskConical, LockKeyhole, PackageCheck, Play, RefreshCw, RotateCcw, ShieldCheck,
  TriangleAlert, Waypoints,
} from 'lucide-react'

type Actor = { id: string; name: string; title: string; roleId: string; roleName: string }
type Approval = { code: string; stepId: string; status: string; requestedByName: string; approvedByName?: string | null }
type Signature = { code: string; stepId: string; phase: string; signerName: string; signerRoleName: string; signedAt: string; signatureHash: string; integrityValid: boolean }
type Governance = {
  policy: { initiatorRoleName: string; approverRoleName: string; executorRoleName: string; rationale: string }
  stage: 'awaiting-request' | 'awaiting-approval' | 'ready-execution'
  requiredRole: string; requiredRoleName: string; allowed: boolean; approval: Approval | null
}
type Step = { id: string; label: string; short: string; output: string; gate: string; index: number; state: 'done' | 'current' | 'locked' }
type Gate = { pk: string; title: string; gate: string; status: string; decision: string | null; blockers: string[]; summary?: string; note?: string }
type Artifact = { pk: string; title: string; category: string; element: string; runtimeClass: string; format: string; deliveryVersion: string; route: string; interfaceProfile: string; status: string; conformanceStatus: string; remediation?: string[] | null; promotedModelRef?: string | null }
type Contract = { pk: string; title: string; kind: string; version: string; artifactRefs: string[]; requirements: string[]; conformanceStatus: string; status: string }
type Test = { pk: string; title: string; kind: string; status: string; latestResultRef?: string | null }
type Result = { pk: string; title: string; testRef: string; attempt: number; decision: 'PASS' | 'FAIL'; checks: Array<{ name: string; status: string; detail?: string }>; blockers: string[]; resultHash: string }
type SecuritySession = { authenticated: boolean; mode?: string; identity?: { subject: string; displayName: string; actorId?: string; roles?: string[]; assurance?: string }; error?: string }
type Machine = {
  caseId: string; currentStep: number; completed: boolean; actors: Actor[]; governance: Governance | null; steps: Step[]
  delivery: any; prototype: any; manifest: any; gates: Gate[]; artifacts: Artifact[]; contracts: Contract[]; tests: Test[]; results: Result[]; baseline: any
  approvals: Approval[]; signatures: Signature[]; logs: Array<{ id: string; performedBy: string; createdAt: string; parameters: Record<string, any> }>; prototypeDataNotice: string
}

const stageLabel: Record<Governance['stage'], string> = {
  'awaiting-request': '待发起审批', 'awaiting-approval': '待独立审批', 'ready-execution': '已批准 / 待执行签署',
}

export function Dp30IntakeModule({ onNavigate }: { onNavigate?: (m: ModuleKey) => void }) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [actorId, setActorId] = useState('DPA-ZHANG')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [securitySession, setSecuritySession] = useState<SecuritySession | null>(null)

  const load = async (nextActor = actorId) => { setError(null); setMachine(await api<Machine>(`/api/dp30-intake?actorId=${encodeURIComponent(nextActor)}`)) }
  useEffect(() => {
    const init = async () => {
      let session: SecuritySession = { authenticated: false, mode: 'demo' }
      try { session = await api<SecuritySession>('/api/security/session') } catch (e) { session = { authenticated: false, mode: 'unavailable', error: e instanceof Error ? e.message : '身份会话读取失败' } }
      setSecuritySession(session)
      const initialActor = session.authenticated && session.identity?.actorId ? session.identity.actorId : actorId
      if (initialActor !== actorId) setActorId(initialActor)
      await load(initialActor)
    }
    init().catch((e) => setError(e instanceof Error ? e.message : '读取失败'))
  }, [])
  const current = useMemo(() => machine?.steps.find((x) => x.state === 'current') ?? null, [machine])
  const actor = useMemo(() => machine?.actors.find((x) => x.id === actorId) ?? null, [machine, actorId])

  const changeActor = async (next: string) => { if (securitySession?.authenticated) { setError('OIDC工程模式禁止前端切换身份；请使用当前认证主体对应的DTEP角色。'); return }; setActorId(next); setBusy(true); try { await load(next) } catch (e) { setError(e instanceof Error ? e.message : '身份切换失败') } finally { setBusy(false) } }
  const run = async () => {
    if (!machine?.governance || !current) return
    const operation = machine.governance.stage === 'awaiting-request' ? 'request-approval' : machine.governance.stage === 'awaiting-approval' ? 'approve' : 'execute'
    setBusy(true); setError(null)
    try { setMachine(await post<Machine>('/api/dp30-intake', { operation, stepId: current.id, actorId })) }
    catch (e) { setError(e instanceof Error ? e.message : '状态迁移失败') }
    finally { setBusy(false) }
  }
  const reset = async () => {
    if (typeof window !== 'undefined' && !window.confirm('重置会清除本轮3.0接收、符合性、审批与签署演示记录，并恢复到“研制方已提交、基地待签收”。继续？')) return
    setBusy(true); setError(null)
    try { setMachine(await post<Machine>('/api/dp30-intake', { operation: 'reset' })); await load(actorId) }
    catch (e) { setError(e instanceof Error ? e.message : '重置失败') }
    finally { setBusy(false) }
  }

  if (!machine) return <div className="rounded-lg border border-zinc-200 bg-white p-5 text-xs text-zinc-500"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />加载数字样机3.0交付接收 Case…</div>
  const governance = machine.governance
  const requiredActor = governance ? machine.actors.find((x) => x.roleId === governance.requiredRole) ?? null : null
  const actionText = governance?.stage === 'awaiting-request' ? '提交申请并签署' : governance?.stage === 'awaiting-approval' ? '批准并签署' : '执行并签署'
  const failedResults = machine.results.filter((x) => x.decision === 'FAIL')

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[10px]', machine.completed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : machine.currentStep >= 3 && machine.currentStep < 5 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-700')}>{machine.completed ? 'QUALIFIED / HANDOFF' : `STEP ${machine.currentStep + 1}/7`}</Badge>
              <span className="text-[10px] font-semibold tracking-wide text-zinc-500">DP30-INTAKE-01 · DIGITAL PROTOTYPE 3.0</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">X9A 数字样机 3.0 · 交付接收与资格鉴定 Case</h1>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600">把“承制单位交来一包模型”变成试验鉴定基地可接收、可核验、可运行、可复测、可冻结基线、可进入 VV&A 的受控数字对象链。G0 管齐套性，G1 管跨平台运行/交互符合性，G2-ENTRY 只管是否具备进入具体 Intended Use VV&A 的资格。</p>
          </div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => load()} disabled={busy}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新</Button><Button size="sm" variant="outline" onClick={reset} disabled={busy}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />重置演示</Button></div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <GateCard gate={machine.gates.find((x) => x.gate === 'G0')} icon={<PackageCheck className="h-4 w-4" />} />
            <GateCard gate={machine.gates.find((x) => x.gate === 'G1')} icon={<FlaskConical className="h-4 w-4" />} />
            <GateCard gate={machine.gates.find((x) => x.gate === 'G2')} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-4 xl:grid-cols-7">
            {machine.steps.map((step) => <StepCard key={step.id} step={step} />)}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_350px]">
            <div className={cn('rounded-md border p-4', machine.completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50/50')}>
              {machine.completed ? (
                <div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="text-sm font-semibold text-zinc-900">3.0 资格鉴定完成，已建立 CASE-01 来源链</p><p className="mt-1 text-xs leading-5 text-zinc-600">基地基线 <span className="font-mono">{machine.baseline?.code ?? '—'}</span> 已冻结；ART-DP30-05 → MD-01、ART-DP30-09 → MD-08。下一阶段仍需按照具体 Intended Use 完成 Model VV&A。</p><Button size="sm" className="mt-3" onClick={() => onNavigate?.('digitalCase')}>进入 CASE-01 <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></div></div>
              ) : current && governance ? (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold text-zinc-500">当前受控动作</span><Badge variant="outline" className="text-[9px]">{stageLabel[governance.stage]}</Badge></div><p className="mt-1 text-sm font-semibold text-zinc-900">{current.index + 1}. {current.label}</p><p className="mt-1 text-[11px] text-zinc-500">输出：{current.output}</p></div>
                    <Button onClick={run} disabled={busy || !governance.allowed}><Play className="mr-1.5 h-4 w-4" />{busy ? '处理中…' : actionText}</Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3"><RoleBox label="发起" value={governance.policy.initiatorRoleName} active={governance.stage === 'awaiting-request'} /><RoleBox label="审批" value={governance.policy.approverRoleName} active={governance.stage === 'awaiting-approval'} /><RoleBox label="执行/签署" value={governance.policy.executorRoleName} active={governance.stage === 'ready-execution'} /></div>
                  <p className="mt-2 text-[10px] leading-4 text-zinc-500">{governance.policy.rationale}</p>
                  {!governance.allowed && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-[10px] text-amber-800">当前身份无权执行。需要：<b>{governance.requiredRoleName}</b>。</p>{requiredActor && !securitySession?.authenticated && <Button size="sm" variant="outline" className="h-7 bg-white text-[10px]" onClick={() => changeActor(requiredActor.id)} disabled={busy}>切换到 {requiredActor.title}</Button>}</div>}
                  {governance.approval && <p className="mt-2 text-[10px] text-zinc-500">审批单 <span className="font-mono">{governance.approval.code}</span> · 发起：{governance.approval.requestedByName}{governance.approval.approvedByName ? ` · 批准：${governance.approval.approvedByName}` : ''}</p>}
                </div>
              ) : null}
              {error && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-700">{error}</p>}
              <p className="mt-3 text-[10px] leading-4 text-zinc-400">{machine.prototypeDataNotice}</p>
            </div>

            <div className="rounded-md border border-zinc-200 p-4">
              <label className="text-[10px] font-semibold text-zinc-600">{securitySession?.authenticated ? '当前认证身份' : '当前演示身份'}
                <select value={actorId} onChange={(e) => changeActor(e.target.value)} disabled={busy || !!securitySession?.authenticated} className="mt-1 block h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500">
                  {machine.actors.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.name} — {x.roleName}</option>)}
                </select>
              </label>
              <div className="mt-3 space-y-1.5 text-[10px] leading-4 text-zinc-500"><p>当前角色：<b className="text-zinc-800">{actor?.roleName ?? '—'}</b></p><p>交付版本：<b className="text-zinc-800">{machine.delivery?.deliveryVersion}</b></p><p>基地基线：<b className="text-zinc-800">{machine.baseline?.version ?? '未形成'}</b></p><p>审批/签署：<b className="text-zinc-800">{machine.approvals.length} / {machine.signatures.length}</b></p>{securitySession?.authenticated ? <><p>认证主体：<b className="text-emerald-700">{securitySession.identity?.displayName ?? securitySession.identity?.subject}</b> · actor <span className="font-mono">{securitySession.identity?.actorId ?? '未映射'}</span></p><p>身份保证：<b className="text-emerald-700">OIDC RS256 / JWKS VERIFIED</b> · {securitySession.identity?.assurance ?? 'OIDC'}；角色切换已禁用。</p></> : <p>身份保证：<b className="text-amber-700">DEMO ROLE SWITCH</b>；工程/生产部署由可信身份会话/认证代理提供主体，签署使用独立签名服务。</p>}</div>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="artifacts" className="space-y-3">
        <TabsList className="h-auto flex-wrap justify-start bg-white"><TabsTrigger value="artifacts">3.0 十要素</TabsTrigger><TabsTrigger value="contracts">FMI / SAL / IDL</TabsTrigger><TabsTrigger value="tests">符合性试验</TabsTrigger><TabsTrigger value="audit">审批与审计</TabsTrigger></TabsList>

        <TabsContent value="artifacts" className="m-0">
          <section className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">数字样机 3.0 · 产品构成 / 产品特性 / 产品行为</h2></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[940px] text-left text-[10px]"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="py-2 pr-3">要素</th><th className="py-2 pr-3">模型簇</th><th className="py-2 pr-3">运行分类</th><th className="py-2 pr-3">交付格式</th><th className="py-2 pr-3">试验基地路由</th><th className="py-2 pr-3">版本</th><th className="py-2">符合性/映射</th></tr></thead><tbody>{machine.artifacts.map((a) => <tr key={a.pk} className="border-b border-zinc-100 align-top"><td className="py-2.5 pr-3"><p className="font-medium text-zinc-800">{a.element}</p><p className="font-mono text-[9px] text-zinc-400">{a.pk}</p></td><td className="py-2.5 pr-3 text-zinc-600">{a.category}</td><td className="py-2.5 pr-3"><Badge variant="outline" className="text-[8px]">{a.runtimeClass}</Badge></td><td className="py-2.5 pr-3 text-zinc-600">{a.format}</td><td className="py-2.5 pr-3 font-medium text-zinc-700">{a.route}<p className="text-[9px] font-normal text-zinc-400">{a.interfaceProfile}</p></td><td className="py-2.5 pr-3 font-mono text-zinc-600">{a.deliveryVersion}</td><td className="py-2.5"><span className={cn(a.conformanceStatus?.includes('BLOCKED') ? 'text-red-700' : a.conformanceStatus?.includes('PASS') ? 'text-emerald-700' : 'text-zinc-500')}>{a.conformanceStatus}</span>{a.promotedModelRef && <p className="mt-0.5 text-[9px] text-zinc-400">→ {a.promotedModelRef}</p>}</td></tr>)}</tbody></table></div></section>
        </TabsContent>

        <TabsContent value="contracts" className="m-0">
          <div className="grid gap-3 lg:grid-cols-3">{machine.contracts.map((c) => <section key={c.pk} className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Braces className="h-4 w-4 text-zinc-600" /><h3 className="text-xs font-semibold text-zinc-900">{c.kind}</h3></div><Badge variant="outline" className={cn('text-[9px]', c.conformanceStatus === 'PASS' && 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{c.conformanceStatus || '未测试'}</Badge></div><p className="mt-2 text-[11px] font-medium text-zinc-700">{c.title}</p><p className="mt-1 font-mono text-[9px] text-zinc-400">{c.pk} · v{c.version}</p><ul className="mt-3 space-y-1 text-[10px] leading-4 text-zinc-500">{c.requirements.map((r) => <li key={r}>• {r}</li>)}</ul></section>)}</div>
        </TabsContent>

        <TabsContent value="tests" className="m-0">
          <section className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">技术符合性试验记录</h2></div>{failedResults.length > 0 && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[9px]">保留 {failedResults.length} 条历史失败</Badge>}</div><div className="mt-3 grid gap-3 xl:grid-cols-2">{machine.results.length ? machine.results.slice().reverse().map((r) => <div key={r.pk} className={cn('rounded-md border p-3', r.decision === 'PASS' ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30')}><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold text-zinc-800">{r.title}</p><Badge variant="outline" className={cn('text-[9px]', r.decision === 'PASS' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700')}>{r.decision}</Badge></div><p className="mt-1 font-mono text-[9px] text-zinc-400">{r.testRef} · attempt {r.attempt}</p><div className="mt-2 space-y-1">{r.checks.map((c) => <p key={c.name} className="text-[10px] leading-4 text-zinc-600"><span className={c.status === 'PASS' ? 'text-emerald-700' : 'text-red-700'}>{c.status === 'PASS' ? '✓' : '✕'}</span> {c.name}{c.detail ? ` — ${c.detail}` : ''}</p>)}</div>{r.blockers.length > 0 && <div className="mt-2 rounded border border-red-100 bg-white/70 p-2">{r.blockers.map((b) => <p key={b} className="text-[9px] leading-4 text-red-700">{b}</p>)}</div>}<p className="mt-2 break-all font-mono text-[8px] text-zinc-400">{r.resultHash}</p></div>) : <p className="text-xs text-zinc-400">尚未执行 G1 技术符合性试验。</p>}</div></section>
        </TabsContent>

        <TabsContent value="audit" className="m-0">
          <div className="grid gap-3 xl:grid-cols-2"><AuditPanel title="审批链" icon={<ShieldCheck className="h-4 w-4" />} empty="尚无审批记录。">{machine.approvals.map((a) => <div key={a.code} className="rounded border border-zinc-100 bg-zinc-50/60 p-2.5 text-[10px] leading-4"><div className="flex justify-between gap-2"><span className="font-mono text-zinc-500">{a.stepId}</span><Badge variant="outline" className="text-[8px]">{a.status}</Badge></div><p className="mt-1 text-zinc-700">发起：{a.requestedByName}</p><p className="text-zinc-500">审批：{a.approvedByName ?? '待审批'}</p></div>)}</AuditPanel><AuditPanel title="签署链" icon={<Fingerprint className="h-4 w-4" />} empty="尚无签署记录。">{machine.signatures.slice().reverse().map((s) => <div key={s.code} className="rounded border border-zinc-100 bg-zinc-50/60 p-2.5 text-[10px] leading-4"><div className="flex justify-between gap-2"><span className="font-mono text-zinc-500">{s.stepId}/{s.phase}</span><span className={s.integrityValid ? 'text-emerald-700' : 'text-red-700'}>{s.integrityValid ? '✓ 完整' : '✕ 异常'}</span></div><p className="mt-1 text-zinc-700">{s.signerName} · {s.signerRoleName}</p><p className="break-all font-mono text-[8px] text-zinc-400">{s.signatureHash.slice(0, 50)}…</p></div>)}</AuditPanel></div>
        </TabsContent>
      </Tabs>

      <section className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center gap-2"><Waypoints className="h-4 w-4 text-zinc-700" /><h2 className="text-sm font-semibold text-zinc-900">与现有 CASE-01 的关系</h2></div><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]"><FlowNode icon={<Archive className="h-4 w-4" />} label="DigitalPrototypeDelivery" detail={machine.delivery?.deliveryVersion ?? '3.0.0'} /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<FileCog className="h-4 w-4" />} label="ModelArtifact" detail="10要素" /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<FlaskConical className="h-4 w-4" />} label="G0/G1" detail="接收+技术符合性" /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<Fingerprint className="h-4 w-4" />} label="ModelBaseline" detail={machine.baseline ? '已冻结' : '待形成'} /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<Boxes className="h-4 w-4" />} label="Test Model Assembly" detail={machine.completed ? '场景装配已生成' : 'G2后生成'} /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<ShieldCheck className="h-4 w-4" />} label="Model VV&A" detail="Intended Use" /><ArrowRight className="h-4 w-4 text-zinc-300" /><FlowNode icon={<Waypoints className="h-4 w-4" />} label="CASE-01" detail="Scenario / Run" /></div><div className="mt-3 flex items-start gap-2 rounded-md border border-sky-100 bg-sky-50/50 p-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" /><p className="text-[10px] leading-5 text-sky-900">资格链的边界：<b>G0 通过</b>只说明交付齐套；<b>G1 通过</b>只说明基地能够按接口契约运行/交互；<b>G2-ENTRY 通过</b>只说明可以进入具体试验用途的 VV&A。它们都不能直接推出“模型可信”或“装备性能达标”。</p></div></section>
    </div>
  )
}

function GateCard({ gate, icon }: { gate?: Gate; icon: ReactNode }) {
  if (!gate) return null
  const pass = gate.decision === '通过'; const blocked = gate.decision === '阻塞'
  return <div className={cn('rounded-md border p-3', pass ? 'border-emerald-200 bg-emerald-50/35' : blocked ? 'border-red-200 bg-red-50/35' : 'border-zinc-200 bg-zinc-50/50')}><div className="flex items-center justify-between gap-2"><span className={cn(pass ? 'text-emerald-700' : blocked ? 'text-red-700' : 'text-zinc-600')}>{icon}</span><Badge variant="outline" className={cn('text-[9px]', pass ? 'border-emerald-200 text-emerald-700' : blocked ? 'border-red-200 text-red-700' : '')}>{gate.decision ?? gate.status}</Badge></div><p className="mt-2 text-[11px] font-semibold text-zinc-800">{gate.title}</p><p className="mt-1 line-clamp-2 text-[9px] leading-4 text-zinc-500">{gate.summary ?? gate.note ?? '尚未执行'}</p>{gate.blockers?.length > 0 && <p className="mt-1 text-[9px] text-red-700">阻塞 {gate.blockers.length} 项</p>}</div>
}
function StepCard({ step }: { step: Step }) {
  const Icon = step.state === 'done' ? Check : step.state === 'current' ? CircleDot : LockKeyhole
  return <div className={cn('rounded-md border p-2.5', step.state === 'done' ? 'border-emerald-200 bg-emerald-50/40' : step.state === 'current' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-zinc-50/30 opacity-60')}><div className="flex items-center justify-between"><span className="font-mono text-[9px] text-zinc-400">{String(step.index + 1).padStart(2, '0')} · {step.gate}</span><Icon className={cn('h-3.5 w-3.5', step.state === 'done' ? 'text-emerald-600' : step.state === 'current' ? 'text-zinc-800' : 'text-zinc-400')} /></div><p className="mt-1 text-[10px] font-semibold leading-4 text-zinc-700">{step.short}</p><p className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-zinc-400">{step.output}</p></div>
}
function RoleBox({ label, value, active }: { label: string; value: string; active: boolean }) { return <div className={cn('rounded border px-2.5 py-2', active ? 'border-zinc-400 bg-white' : 'border-zinc-200 bg-zinc-50/60')}><p className="text-[9px] font-semibold text-zinc-400">{label}</p><p className="mt-0.5 text-[10px] font-medium leading-4 text-zinc-700">{value}</p></div> }
function AuditPanel({ title, icon, empty, children }: { title: string; icon: ReactNode; empty: string; children: ReactNode }) { const has = Array.isArray(children) ? children.length > 0 : !!children; return <section className="rounded-lg border border-zinc-200 bg-white p-4"><div className="flex items-center gap-2 text-zinc-700">{icon}<h3 className="text-xs font-semibold text-zinc-900">{title}</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{has ? children : <p className="text-[10px] text-zinc-400">{empty}</p>}</div></section> }
function FlowNode({ icon, label, detail }: { icon: ReactNode; label: string; detail: string }) { return <div className="min-w-[132px] rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"><div className="flex items-center gap-1.5 text-zinc-700">{icon}<span className="font-semibold">{label}</span></div><p className="mt-1 text-[9px] text-zinc-400">{detail}</p></div> }
