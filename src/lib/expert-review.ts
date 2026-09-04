import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getGovernanceActor, recordExpertOpinionSignature, recordPanelDecisionSignature } from '@/lib/case01-governance'

export type ExpertReviewOperation = 'open-panel' | 'submit-opinion' | 'finalize-panel'
export type ExpertOpinionDisposition = 'CONCUR' | 'DISSENT' | 'CONCUR_WITH_QUALIFICATION' | 'REQUEST_MORE_EVIDENCE'
export type ExpertChallengeType = 'NONE' | 'DATA_CHALLENGE' | 'RULE_CHALLENGE' | 'MODEL_CHALLENGE' | 'SCENARIO_CHALLENGE' | 'INTERPRETATION_CHALLENGE'

const PANEL_ID = 'RPS-CASE01-FINAL-001'
const REVIEWER_IDS = ['ACT-FANG', 'ACT-GAO', 'ACT-YU'] as const
const CHAIR_ID = 'ACT-SUN'
const FINAL_DECISION_ID = 'FAD-CASE01-FINAL-001'
const VALID_DISPOSITIONS = new Set<ExpertOpinionDisposition>(['CONCUR','DISSENT','CONCUR_WITH_QUALIFICATION','REQUEST_MORE_EVIDENCE'])
const VALID_CHALLENGES = new Set<ExpertChallengeType>(['NONE','DATA_CHALLENGE','RULE_CHALLENGE','MODEL_CHALLENGE','SCENARIO_CHALLENGE','INTERPRETATION_CHALLENGE'])

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
function sha256(value: unknown) { return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}` }
function nowIso() { return new Date().toISOString() }

async function ensureType(apiName: string, displayName: string, description: string, icon: string) {
  const current = await db.objectType.findUnique({ where: { apiName } })
  return current ?? db.objectType.create({ data: { apiName, displayName, description, icon } })
}
async function objectType(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 本体未初始化`)
  return t
}
async function ensureLink(apiName: string, displayName: string, sourceApi: string, targetApi: string) {
  if (await db.linkType.findFirst({ where: { apiName } })) return
  const [source, target] = await Promise.all([objectType(sourceApi), objectType(targetApi)])
  await db.linkType.create({ data: { apiName, displayName, sourceTypeId: source.id, targetTypeId: target.id, cardinality: '一对多' } })
}
async function entry(apiName: string, pk: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return null
  const row = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!row) return null
  return { ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }
}
async function entries(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return []
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id }, orderBy: { updatedAt: 'asc' } })
  return rows.map((row) => ({ ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }))
}
async function createEntry(apiName: string, pk: string, title: string, data: Record<string, any>) {
  const t = await objectType(apiName)
  if (await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })) throw new Error(`${apiName}/${pk} 已存在；专家审查记录不可覆盖`)
  const row = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return row
}
async function patchEntry(apiName: string, pk: string, patch: Record<string, any> | ((data: Record<string, any>) => Record<string, any>)) {
  const current = await entry(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  const next = typeof patch === 'function' ? patch(current.data) : { ...current.data, ...patch }
  await db.objectEntry.update({ where: { id: current.id }, data: { dataJson: JSON.stringify(next) } })
  return next
}

export async function ensureExpertReviewOntology() {
  await ensureType('ReviewPanelSession', '鉴定专家合议会话', '冻结机器初审、证据包和专家成员范围；承载独立评阅、解除盲态与最终合议。', 'users-round')
  await ensureType('ExpertOpinion', '专家独立意见', '专家对自动判读、证据充分性、适用范围和解释形成的追加式独立意见。', 'message-square-warning')
  await ensureType('EvidenceRequest', '补充证据请求', '专家合议认为现有证据不足时形成的正式补试/补证请求；不得通过人工改写机器结果替代。', 'clipboard-plus')
  await ensureType('FinalAdjudicationDecision', '人类最终判定', '专家合议对机器判读进行确认、附条件确认、退回补证或规则复核后的最终处置。', 'scale')
  for (const spec of [
    ['panelReviewsCase', '合议—Case', 'ReviewPanelSession', 'DigitalTestCase'],
    ['panelReviewsEvidencePackage', '合议—证据包', 'ReviewPanelSession', 'EvidencePackage'],
    ['panelReviewsAdjudication', '合议—自动判读', 'ReviewPanelSession', 'RunAdjudicationDecision'],
    ['opinionBelongsToPanel', '专家意见—合议', 'ExpertOpinion', 'ReviewPanelSession'],
    ['opinionTargetsMeasure', '专家意见—指标', 'ExpertOpinion', 'Measure'],
    ['finalDecisionBelongsToPanel', '最终判定—合议', 'FinalAdjudicationDecision', 'ReviewPanelSession'],
    ['finalDecisionReviewsEvidencePackage', '最终判定—证据包', 'FinalAdjudicationDecision', 'EvidencePackage'],
    ['evidenceRequestBelongsToPanel', '补证请求—合议', 'EvidenceRequest', 'ReviewPanelSession'],
  ] as const) await ensureLink(...spec)
}

async function formalMachineFindings() {
  const run = await entry('TestRun', 'RUN-DOT-S-02')
  const packageV04 = await entry('EvidencePackage', 'EP-CASE01-M13-V0.4')
  const testCase = await entry('DigitalTestCase', 'CASE-01')
  if (!run || run.data.runAdjudicationDecisionSnapshot?.decision !== 'READY_FOR_RUN_SIGNOFF') throw new Error('5,000次正式数字Run尚未形成可签署的自动判读结果')
  if (!packageV04 || !String(packageV04.data.status ?? '').startsWith('已冻结') || packageV04.data.gateDecision !== '通过') throw new Error('Evidence Package V0.4 / STRICT-V1 尚未形成正式通过记录')
  const results = Array.isArray(run.data.runMeasureResultSnapshots) ? run.data.runMeasureResultSnapshots : []
  const m13 = results.find((x: any) => x.measureRef === 'M-13')
  const m14 = results.find((x: any) => x.measureRef === 'M-14')
  if (!m13) throw new Error('缺少M-13自动判读结果，不能组建最终合议')
  return {
    caseRef: 'CASE-01', evidencePackageRef: 'EP-CASE01-M13-V0.4', evidencePackageHash: packageV04.data.packageHash,
    gateRuleSetRef: 'GRS-CASE01-STRICT-V1', gateDecision: packageV04.data.gateDecision,
    automatedAdjudicationRef: run.data.runAdjudicationDecisionRef, automatedAdjudicationHash: run.data.runAdjudicationDecisionHash,
    automatedAdjudicationFinalHash: run.data.automatedAdjudicationFinalHash,
    performanceResults: [m13, m14].filter(Boolean).map((x: any) => ({ measureRef: x.measureRef, value: x.value, unit: x.unit, threshold: x.thresholdSnapshot, direction: x.direction, performanceDecision: x.performanceDecision, resultHash: x.resultHash })),
    machinePerformanceDecision: m13.performanceDecision === '未达标' ? '未达到要求' : '达到要求',
    scope: { scenarioRef: 'SC-COA-01', threatLevel: 4, ewIntensityPct: 75, forceRatio: 0.85 },
    caseStatus: testCase?.data.status ?? null,
  }
}

export function expertReviewRequiredForStep(stepId: string) { return stepId === 'freeze-conclusion' }

async function panelOpinions() {
  return (await entries('ExpertOpinion')).filter((x) => x.data.caseId === 'CASE-01' && x.data.panelRef === PANEL_ID)
}

function chooseFinalDisposition(opinions: Array<Record<string, any>>) {
  if (opinions.some((x) => x.disposition === 'REQUEST_MORE_EVIDENCE')) return 'RETURN_FOR_EVIDENCE'
  if (opinions.some((x) => x.disposition === 'DISSENT' && x.challengeType === 'RULE_CHALLENGE')) return 'REFER_RULE_REVIEW'
  if (opinions.some((x) => x.disposition === 'DISSENT')) return 'RETURN_FOR_EVIDENCE'
  if (opinions.some((x) => x.disposition === 'CONCUR_WITH_QUALIFICATION')) return 'CONFIRM_WITH_QUALIFICATION'
  return 'CONFIRM'
}

export async function openExpertReviewPanel(actorId: string) {
  await ensureExpertReviewOntology()
  const actor = getGovernanceActor(actorId)
  if (actor.id !== CHAIR_ID || actor.roleId !== 'evaluation-authority') throw new Error('最终鉴定合议只能由鉴定评估负责人/合议主席组建')
  if (await entry('ReviewPanelSession', PANEL_ID)) throw new Error('最终鉴定合议已组建')
  const findings = await formalMachineFindings()
  const openedAt = nowIso()
  const base = {
    schema: 'dtep/expert-review-panel/v2.1', code: PANEL_ID, caseId: 'CASE-01', status: 'INDEPENDENT_REVIEW',
    reviewMode: 'blind-independent-then-deliberate', chairId: CHAIR_ID, memberIds: [...REVIEWER_IDS], quorumRequired: REVIEWER_IDS.length,
    openedAt, openedBy: actor.id, openedByName: `${actor.title} · ${actor.name}`, reviewScope: 'Evidence Sufficiency + Applicability + Interpretation + Final Disposition',
    machineFindings: findings, overridePolicy: 'NO_IN_PLACE_OVERRIDE; machine facts immutable; rule changes require new AdjudicationRuleSet version',
  }
  const panelHash = sha256(base)
  await createEntry('ReviewPanelSession', PANEL_ID, 'CASE-01 最终鉴定专家合议 · 独立评阅', { ...base, panelHash })
  return { ...base, panelHash }
}

export async function submitExpertOpinion(actorId: string, disposition: ExpertOpinionDisposition, reason: string, challengeType: ExpertChallengeType = 'NONE', supplementalComment = '') {
  await ensureExpertReviewOntology()
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== 'expert-reviewer' || !REVIEWER_IDS.includes(actor.id as any)) throw new Error('当前身份不是本次合议指定专家成员')
  if (!VALID_DISPOSITIONS.has(disposition)) throw new Error('未知专家意见类型')
  if (!VALID_CHALLENGES.has(challengeType)) throw new Error('未知异议类型')
  if (reason.trim().length < 8) throw new Error('专家意见必须提供可审计的理由说明')
  const panel = await entry('ReviewPanelSession', PANEL_ID)
  if (!panel || !['INDEPENDENT_REVIEW','DELIBERATION_READY'].includes(panel.data.status)) throw new Error('专家合议尚未开放独立评阅')
  const existing = (await panelOpinions()).find((x) => x.data.reviewerId === actor.id)
  if (existing) throw new Error('该专家已提交独立意见；意见不可原地覆盖')
  const submittedAt = nowIso()
  const opinionSubject = { caseId: 'CASE-01', panelRef: PANEL_ID, reviewerId: actor.id, disposition, challengeType, reason: reason.trim(), supplementalComment: supplementalComment.trim(), submittedAt, machineFindingsHash: sha256(panel.data.machineFindings) }
  const signature = await recordExpertOpinionSignature(actorId, opinionSubject)
  const code = `EO-CASE01-${actor.id.replace('ACT-','')}-001`
  const base = { schema: 'dtep/expert-opinion/v2.1', code, caseId: 'CASE-01', panelRef: PANEL_ID, reviewerId: actor.id, reviewerName: `${actor.title} · ${actor.name}`, disposition, challengeType, reason: reason.trim(), supplementalComment: supplementalComment.trim() || null, evidenceRefs: ['EP-CASE01-M13-V0.4','RUN-DOT-S-02','M-13','M-14'], ruleRefs: ['ARS-CASE01-E2M-v1','GRS-CASE01-STRICT-V1'], signatureRef: signature.code, signatureHash: signature.signatureHash, submittedAt, immutable: true }
  const opinionHash = sha256(base)
  await createEntry('ExpertOpinion', code, `${actor.title} · ${disposition}`, { ...base, opinionHash })
  const opinions = await panelOpinions()
  if (opinions.length >= REVIEWER_IDS.length) await patchEntry('ReviewPanelSession', PANEL_ID, { status: 'DELIBERATION_READY', independentReviewClosedAt: nowIso() })
  return { ...base, opinionHash }
}

export async function finalizeExpertReviewPanel(actorId: string) {
  await ensureExpertReviewOntology()
  const actor = getGovernanceActor(actorId)
  if (actor.id !== CHAIR_ID || actor.roleId !== 'evaluation-authority') throw new Error('最终合议处置必须由鉴定评估负责人/合议主席执行')
  const panel = await entry('ReviewPanelSession', PANEL_ID)
  if (!panel || panel.data.status !== 'DELIBERATION_READY') throw new Error('尚未达到合议法定人数或独立意见未全部提交')
  if (await entry('FinalAdjudicationDecision', FINAL_DECISION_ID)) throw new Error('最终人类判定已经冻结')
  const opinions = (await panelOpinions()).map((x) => x.data)
  if (opinions.length !== REVIEWER_IDS.length) throw new Error('专家独立意见数量不满足3/3法定人数')
  const disposition = chooseFinalDisposition(opinions)
  const machine = panel.data.machineFindings as Record<string, any>
  const finalPerformanceDecision = machine.machinePerformanceDecision
  const qualifications = opinions.filter((x) => x.disposition === 'CONCUR_WITH_QUALIFICATION').map((x) => ({ reviewerId: x.reviewerId, reason: x.reason, challengeType: x.challengeType }))
  const dissentRefs = opinions.filter((x) => x.disposition === 'DISSENT').map((x) => x.code)
  const finalizedAt = nowIso()
  const base = {
    schema: 'dtep/final-adjudication-decision/v2.1', code: FINAL_DECISION_ID, caseId: 'CASE-01', panelRef: PANEL_ID,
    machineDecisionPreserved: true, machineFindings: machine, panelDisposition: disposition, finalPerformanceDecision,
    evidenceDecision: disposition === 'RETURN_FOR_EVIDENCE' ? '证据需补充' : disposition === 'REFER_RULE_REVIEW' ? '规则需复核' : '证据充分/可形成最终结论',
    scope: machine.scope, qualifications, dissentRefs, opinionRefs: opinions.map((x) => x.code),
    finalFinding: `在冻结的SC-COA-01（Threat=4、EW=75%、兵力比0.85）条件下，自动判读M-13=${machine.performanceResults?.find((x:any)=>x.measureRef==='M-13')?.value ?? '—'}%，专家合议${disposition === 'CONFIRM_WITH_QUALIFICATION' ? '附条件确认' : disposition === 'CONFIRM' ? '确认' : '未确认'}机器事实；性能结论保持“${finalPerformanceDecision}”。`,
    finalizedAt, chairId: actor.id, chairName: `${actor.title} · ${actor.name}`, immutable: true,
  }
  const signature = await recordPanelDecisionSignature(actorId, base)
  const humanReviewHash = sha256({ ...base, chairSignatureRef: signature.code, chairSignatureHash: signature.signatureHash })
  const data = { ...base, chairSignatureRef: signature.code, chairSignatureHash: signature.signatureHash, humanReviewHash }
  await createEntry('FinalAdjudicationDecision', FINAL_DECISION_ID, `CASE-01 人类最终判定 · ${disposition}`, data)
  await patchEntry('ReviewPanelSession', PANEL_ID, { status: 'FINALIZED', finalDecisionRef: FINAL_DECISION_ID, finalDecisionHash: humanReviewHash, finalizedAt })
  if (disposition === 'RETURN_FOR_EVIDENCE' || disposition === 'REFER_RULE_REVIEW') {
    const requestCode = `ER-CASE01-FINAL-001`
    const req = { schema: 'dtep/evidence-request/v2.1', code: requestCode, caseId: 'CASE-01', panelRef: PANEL_ID, status: 'OPEN', reason: disposition === 'RETURN_FOR_EVIDENCE' ? '专家合议要求补充证据后重新评审' : '专家合议要求发布/复核判读规则后重新评审', sourceOpinionRefs: data.opinionRefs, createdAt: finalizedAt, immutable: true }
    await createEntry('EvidenceRequest', requestCode, 'CASE-01 合议补充证据/规则复核请求', { ...req, requestHash: sha256(req) })
  }
  return data
}

export async function getExpertReviewState(actorId?: string | null) {
  await ensureExpertReviewOntology()
  const panel = await entry('ReviewPanelSession', PANEL_ID)
  const finalDecision = await entry('FinalAdjudicationDecision', FINAL_DECISION_ID)
  const rawOpinions = await panelOpinions()
  const quorumReached = rawOpinions.length >= REVIEWER_IDS.length
  const actor = actorId ? (() => { try { return getGovernanceActor(actorId) } catch { return null } })() : null
  const visibleOpinions = rawOpinions.map((row) => {
    const mine = actor?.id === row.data.reviewerId
    if (quorumReached || mine || actor?.roleId === 'evaluation-authority' || actor?.roleId === 'final-approver') return row.data
    return { code: row.data.code, panelRef: PANEL_ID, reviewerId: row.data.reviewerId, reviewerName: row.data.reviewerName, submittedAt: row.data.submittedAt, blinded: true }
  })
  if (!panel) {
    return { required: true, status: 'NOT_OPEN', readyForFinalApproval: false, requiredRole: 'evaluation-authority', requiredRoleName: '鉴定评估负责人/合议主席', allowed: actor?.roleId === 'evaluation-authority', actionLabel: '组建鉴定专家合议', panel: null, opinions: [], finalDecision: null, memberIds: [...REVIEWER_IDS], quorumRequired: REVIEWER_IDS.length, note: 'STRICT-V1通过后，必须先组建专家合议并完成独立评阅，才允许提交最终结论审批。' }
  }
  if (!finalDecision) {
    const submittedByActor = rawOpinions.some((x) => x.data.reviewerId === actor?.id)
    const needsChair = quorumReached
    return { required: true, status: needsChair ? 'DELIBERATION_READY' : 'INDEPENDENT_REVIEW', readyForFinalApproval: false, requiredRole: needsChair ? 'evaluation-authority' : 'expert-reviewer', requiredRoleName: needsChair ? '鉴定评估负责人/合议主席' : '鉴定专家组成员', allowed: needsChair ? actor?.roleId === 'evaluation-authority' : actor?.roleId === 'expert-reviewer' && REVIEWER_IDS.includes(actor.id as any) && !submittedByActor, actionLabel: needsChair ? '形成合议最终处置并签署' : '提交独立专家意见并签署', panel: panel.data, opinions: visibleOpinions, finalDecision: null, memberIds: [...REVIEWER_IDS], quorumRequired: REVIEWER_IDS.length, submittedCount: rawOpinions.length, note: needsChair ? '3/3独立意见已提交并解除盲态；由合议主席形成最终处置。' : '专家在其他成员意见不可见的条件下独立提交；达到3/3后统一解除盲态进入合议。' }
  }
  const ready = ['CONFIRM','CONFIRM_WITH_QUALIFICATION'].includes(String(finalDecision.data.panelDisposition))
  return { required: true, status: ready ? 'READY_FOR_FINAL_APPROVAL' : 'RETURNED', readyForFinalApproval: ready, requiredRole: ready ? 'evaluation-authority' : 'evaluation-authority', requiredRoleName: '鉴定评估负责人/合议主席', allowed: false, actionLabel: null, panel: panel.data, opinions: visibleOpinions, finalDecision: finalDecision.data, memberIds: [...REVIEWER_IDS], quorumRequired: REVIEWER_IDS.length, submittedCount: rawOpinions.length, blockers: ready ? [] : [`合议处置为${finalDecision.data.panelDisposition}，不能进入正式结论审批`], note: ready ? '人类最终判定已冻结；机器数值与规则结果保持不可变，现在可以提交正式结论审批。' : '合议要求补证/规则复核；必须回到相应业务链产生新证据后另起评审版本。' }
}

export async function executeExpertReviewOperation(operation: ExpertReviewOperation, actorId: string, payload: Record<string, any> = {}) {
  if (operation === 'open-panel') return openExpertReviewPanel(actorId)
  if (operation === 'submit-opinion') return submitExpertOpinion(actorId, payload.disposition, String(payload.reason ?? ''), payload.challengeType ?? 'NONE', String(payload.supplementalComment ?? ''))
  if (operation === 'finalize-panel') return finalizeExpertReviewPanel(actorId)
  throw new Error('未知专家合议操作')
}

export async function assertExpertReviewReadyForFinalApproval() {
  const state = await getExpertReviewState()
  if (!state.readyForFinalApproval || !state.finalDecision) throw new Error('鉴定专家合议尚未形成可进入最终批准的人类最终判定')
  return state.finalDecision as Record<string, any>
}

export async function expertReviewApprovalContext() {
  const finalDecision = await assertExpertReviewReadyForFinalApproval()
  return { humanFinalAdjudicationRef: finalDecision.code, humanReviewHash: finalDecision.humanReviewHash, panelDisposition: finalDecision.panelDisposition, finalPerformanceDecision: finalDecision.finalPerformanceDecision, scope: finalDecision.scope }
}

export async function clearCase01ExpertReviewRecords() {
  await ensureExpertReviewOntology()
  for (const apiName of ['ReviewPanelSession','ExpertOpinion','EvidenceRequest','FinalAdjudicationDecision']) {
    const t = await db.objectType.findUnique({ where: { apiName } })
    if (!t) continue
    const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
    const caseRows = rows.filter((row) => { try { return JSON.parse(row.dataJson || '{}').caseId === 'CASE-01' } catch { return false } })
    if (!caseRows.length) continue
    await db.objectEntry.deleteMany({ where: { id: { in: caseRows.map((r) => r.id) } } })
    await db.objectType.update({ where: { id: t.id }, data: { objectCount: { decrement: caseRows.length } } })
  }
}
