import { sha256Digest } from '@/lib/security/canonical'
import { signGovernancePayload, verifyDigitalSignatureEnvelope } from '@/lib/security/digital-signature'
import { db } from '@/lib/db'
// Legacy compatibility marker: DEMO-SHA256-ATTESTATION-v1 is no longer emitted in v2.1.x engineering mode.

export type GovernanceRoleId =
  | 'test-executor'
  | 'lvc-controller'
  | 'model-owner'
  | 'accreditation-authority'
  | 'digital-operator'
  | 'evidence-manager'
  | 'test-director'
  | 'evaluation-authority'
  | 'final-approver'
  | 'expert-reviewer'

export type GovernanceActor = {
  id: string
  name: string
  title: string
  roleId: GovernanceRoleId
  roleName: string
}

export type StepGovernancePolicy = {
  stepId: string
  initiatorRole: GovernanceRoleId
  approverRole?: GovernanceRoleId
  executorRole: GovernanceRoleId
  requiresApproval: boolean
  separationOfDuty: boolean
  rationale: string
}

export const CASE01_ACTORS: GovernanceActor[] = [
  { id: 'ACT-LIN', name: '林晓东', title: '试验执行员', roleId: 'test-executor', roleName: 'Live 试验执行' },
  { id: 'ACT-LIU', name: '刘晨', title: 'LVC 总控席', roleId: 'lvc-controller', roleName: 'LVC 联合试验执行' },
  { id: 'ACT-HE', name: '何斌', title: '模型负责人', roleId: 'model-owner', roleName: '模型/VV&A 提交' },
  { id: 'ACT-ZHAO', name: '赵岚', title: '认可授权人', roleId: 'accreditation-authority', roleName: 'M&S 认可审批' },
  { id: 'ACT-WU', name: '吴静', title: '数字试验运行席', roleId: 'digital-operator', roleName: '正式数字 Run 执行' },
  { id: 'ACT-TANG', name: '唐宁', title: '证据负责人', roleId: 'evidence-manager', roleName: 'Evidence Package 编制' },
  { id: 'ACT-ZHOU', name: '周衡', title: '试验总师', roleId: 'test-director', roleName: '试验执行/证据冻结审批' },
  { id: 'ACT-SUN', name: '孙立', title: '鉴定评估负责人', roleId: 'evaluation-authority', roleName: '正式 Evidence Gate' },
  { id: 'ACT-QIN', name: '秦岳', title: '鉴定批准人', roleId: 'final-approver', roleName: '正式结论批准与冻结' },
  { id: 'ACT-FANG', name: '方宁', title: '作战效能专家', roleId: 'expert-reviewer', roleName: '独立鉴定专家复核' },
  { id: 'ACT-GAO', name: '高远', title: '模型与VV&A专家', roleId: 'expert-reviewer', roleName: '独立鉴定专家复核' },
  { id: 'ACT-YU', name: '余珂', title: '试验数据专家', roleId: 'expert-reviewer', roleName: '独立鉴定专家复核' },
]

export const ROLE_NAMES: Record<GovernanceRoleId, string> = {
  'test-executor': 'Live 试验执行员',
  'lvc-controller': 'LVC 总控人员',
  'model-owner': '模型负责人',
  'accreditation-authority': 'VV&A 认可授权人',
  'digital-operator': '数字试验运行员',
  'evidence-manager': '证据负责人',
  'test-director': '试验总师/试验批准人',
  'evaluation-authority': '鉴定评估负责人',
  'final-approver': '鉴定批准人',
  'expert-reviewer': '鉴定专家组成员',
}

export const CASE01_GOVERNANCE_POLICIES: Record<string, StepGovernancePolicy> = {
  'live-retest': {
    stepId: 'live-retest', initiatorRole: 'test-executor', approverRole: 'test-director', executorRole: 'test-executor', requiresApproval: true, separationOfDuty: true,
    rationale: '复试由现场执行人员发起，试验总师批准；批准人与发起人必须分离。',
  },
  'lvc-anchor': {
    stepId: 'lvc-anchor', initiatorRole: 'lvc-controller', approverRole: 'test-director', executorRole: 'lvc-controller', requiresApproval: true, separationOfDuty: true,
    rationale: 'LVC 联合试验由总控席发起，试验总师批准后执行并签署运行记录。',
  },
  'vva-accredit': {
    stepId: 'vva-accredit', initiatorRole: 'model-owner', approverRole: 'accreditation-authority', executorRole: 'accreditation-authority', requiresApproval: true, separationOfDuty: true,
    rationale: '模型负责人提交 VV&A 证据，认可授权人独立审批并签署认可结果。',
  },
  'digital-5000': {
    stepId: 'digital-5000', initiatorRole: 'digital-operator', approverRole: 'test-director', executorRole: 'digital-operator', requiresApproval: true, separationOfDuty: true,
    rationale: '正式 5,000 次数字 Run 必须在认可域生效后，由运行席申请、试验总师批准。',
  },
  'draft-package': {
    stepId: 'draft-package', initiatorRole: 'evidence-manager', executorRole: 'evidence-manager', requiresApproval: false, separationOfDuty: false,
    rationale: '证据草稿属于编制行为，由证据负责人执行并签署编制记录；尚不产生冻结效力。',
  },
  'freeze-package': {
    stepId: 'freeze-package', initiatorRole: 'evidence-manager', approverRole: 'test-director', executorRole: 'evidence-manager', requiresApproval: true, separationOfDuty: true,
    rationale: '证据负责人申请冻结，试验总师独立批准；冻结仍由证据负责人执行并签署。',
  },
  'strict-gate': {
    stepId: 'strict-gate', initiatorRole: 'evidence-manager', approverRole: 'evaluation-authority', executorRole: 'evaluation-authority', requiresApproval: true, separationOfDuty: true,
    rationale: '证据负责人只能提交门控申请，正式门控由独立鉴定评估负责人批准并执行。',
  },
  'freeze-conclusion': {
    stepId: 'freeze-conclusion', initiatorRole: 'evaluation-authority', approverRole: 'final-approver', executorRole: 'final-approver', requiresApproval: true, separationOfDuty: true,
    rationale: '鉴定评估负责人提交正式结论，鉴定批准人独立批准并完成最终冻结。',
  },
}

function sha256(value: unknown) { return sha256Digest(value) }

function nowIso() { return new Date().toISOString() }

function signatureIntegrityValid(data: Record<string, any>) {
  if (!data?.signatureHash || !data?.subjectDigest || !data?.signedAt || !data?.signatureValue || !data?.signerPublicKeyPem) return false
  const signedPayload = {
    caseId: data.caseId, stepId: data.stepId, phase: data.phase, actorId: data.signerId,
    roleId: data.signerRole, signedAt: data.signedAt, subjectDigest: data.subjectDigest,
  }
  if (sha256({ signatureValue: data.signatureValue, publicKeyFingerprint: data.signerPublicKeyFingerprint, signedPayload }) !== data.signatureHash) return false
  return verifyDigitalSignatureEnvelope({
    scheme: data.signatureScheme,
    keyId: data.signerKeyId,
    publicKeyPem: data.signerPublicKeyPem,
    publicKeyFingerprint: data.signerPublicKeyFingerprint,
    signatureValue: data.signatureValue,
    signedPayload,
  })
}

async function ensureType(apiName: string, displayName: string, description: string, icon: string) {
  const existing = await db.objectType.findUnique({ where: { apiName } })
  if (existing) return existing
  return db.objectType.create({ data: { apiName, displayName, description, icon } })
}

async function upsertObject(apiName: string, pk: string, title: string, data: Record<string, unknown>) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 治理对象类型未初始化`)
  const dataJson = JSON.stringify(data)
  const existing = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (existing) {
    // Governance bootstrap runs on read paths as a defensive compatibility
    // measure. Avoid turning every GET into a write when the static principal
    // projection is already identical to the frozen runtime representation.
    if (existing.title === title && existing.dataJson === dataJson) return existing
    return db.objectEntry.update({ where: { id: existing.id }, data: { title, dataJson } })
  }
  const created = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return created
}

async function createObject(apiName: string, pk: string, title: string, data: Record<string, unknown>) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 治理对象类型未初始化`)
  const existing = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (existing) throw new Error(`${apiName}/${pk} 已存在；签署记录禁止原地覆盖`)
  const created = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return created
}

async function readObject(apiName: string, pk: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return null
  const row = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!row) return null
  return { ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }
}

async function listObjects(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return []
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id }, orderBy: { updatedAt: 'desc' } })
  return rows.map((row) => ({ ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }))
}

export function getGovernanceActor(actorId: string) {
  const actor = CASE01_ACTORS.find((item) => item.id === actorId)
  if (!actor) throw new Error('未知演示身份')
  return actor
}

export function getStepPolicy(stepId: string) {
  const policy = CASE01_GOVERNANCE_POLICIES[stepId]
  if (!policy) throw new Error('该步骤未配置角色治理策略')
  return policy
}

let governanceOntologyReady: Promise<void> | null = null

export async function ensureCase01GovernanceOntology() {
  if (!governanceOntologyReady) {
    governanceOntologyReady = (async () => {
      await ensureType('WorkflowPrincipal', '工作流人员与角色', 'CASE-01 岗位身份与单一职责角色映射；工程模式支持OIDC认证映射，生产部署应接组织身份目录与强认证。', 'users')
      await ensureType('ApprovalRecord', '审批记录', '受控状态迁移动作的申请、独立审批与职责分离记录。', 'badge-check')
      await ensureType('SignatureRecord', '签署记录', '受控动作的不可变签署记录；v2.1.x工程模式使用Ed25519 detached signature并保存公钥指纹，生产可替换为远程PKI/密码服务适配器。', 'signature')
      for (const actor of CASE01_ACTORS) {
        await upsertObject('WorkflowPrincipal', actor.id, `${actor.title} · ${actor.name}`, {
          code: actor.id, caseId: 'CASE-01', name: actor.name, title: actor.title, roleId: actor.roleId, roleName: actor.roleName,
          active: true, identityAssurance: (process.env.DTEP_AUTH_MODE || 'demo') === 'oidc' ? 'OIDC VERIFIED / ROLE MAPPED' : 'ENGINEERING LOCAL IDENTITY / ROLE SWITCH FALLBACK',
        })
      }
    })().catch((error) => {
      governanceOntologyReady = null
      throw error
    })
  }
  return governanceOntologyReady
}

function approvalPk(stepId: string) { return `APR-CASE01-${stepId}` }
function signaturePk(stepId: string, phase: string, actorId: string, signatureHash: string) { return `SIG-CASE01-${stepId}-${phase}-${actorId}-${signatureHash.slice(-12)}` }

async function createSignature(stepId: string, phase: 'request' | 'approval' | 'execution' | 'control' | 'data-quality' | 'adjudication' | 'expert-review' | 'panel-decision', actor: GovernanceActor, subject: Record<string, unknown>) {
  const signedAt = nowIso()
  const subjectDigest = sha256(subject)
  const signedPayload = {
    caseId: 'CASE-01', stepId, phase, actorId: actor.id, roleId: actor.roleId, signedAt, subjectDigest,
  }
  const envelope = await signGovernancePayload(actor.id, signedPayload)
  const signatureHash = sha256({ signatureValue: envelope.signatureValue, publicKeyFingerprint: envelope.publicKeyFingerprint, signedPayload })
  const code = signaturePk(stepId, phase, actor.id, signatureHash)
  const data = {
    code, caseId: 'CASE-01', stepId, phase,
    signerId: actor.id, signerName: `${actor.title} · ${actor.name}`, signerRole: actor.roleId, signerRoleName: ROLE_NAMES[actor.roleId],
    signedAt, subjectDigest, signatureHash, signatureScheme: envelope.scheme, immutable: true,
    signatureValue: envelope.signatureValue, signerKeyId: envelope.keyId, signerPublicKeyPem: envelope.publicKeyPem,
    signerPublicKeyFingerprint: envelope.publicKeyFingerprint,
    assurance: 'ENGINEERING CRYPTOGRAPHIC SIGNATURE：Ed25519 detached signature已进行密码学验证；本地工程密钥仅用于集成测试，生产部署应切换组织PKI/CAC/HSM/远程签名服务并由OIDC/证书身份绑定签名人。',
  }
  await createObject('SignatureRecord', data.code, `${phase.toUpperCase()} · ${actor.title} · ${actor.name}`, data)
  return data
}

export async function requestStepApproval(stepId: string, actorId: string, subjectContext?: Record<string, unknown> | null) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  if (!policy.requiresApproval) throw new Error('该步骤无需审批，可由授权执行角色直接执行并签署')
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.initiatorRole) throw new Error(`角色不匹配：该步骤必须由“${ROLE_NAMES[policy.initiatorRole]}”发起`)
  const existing = await readObject('ApprovalRecord', approvalPk(stepId))
  if (existing && ['pending', 'approved'].includes(existing.data.status)) throw new Error('该步骤已存在有效审批流程')
  const requestedAt = nowIso()
  const baseData = {
    code: approvalPk(stepId), caseId: 'CASE-01', stepId, status: 'requesting', policy,
    requestedBy: actor.id, requestedByName: `${actor.title} · ${actor.name}`, requestedRole: actor.roleId, requestedAt,
    requestSignatureRef: null, approvedBy: null, approvedByName: null, approvedRole: null, approvedAt: null,
    approvalSignatureRef: null, decision: null, subjectContext: subjectContext ?? null,
  }
  await upsertObject('ApprovalRecord', baseData.code, `${stepId} · 申请签署中`, baseData)
  const requestSubject = { caseId: 'CASE-01', stepId, initiator: actor.id, requestedAt, policy, subjectContext: subjectContext ?? null }
  const requestSignature = await createSignature(stepId, 'request', actor, requestSubject)
  const data = { ...baseData, status: 'pending', requestSignatureRef: requestSignature.code }
  await upsertObject('ApprovalRecord', data.code, `${stepId} · 待审批`, data)
  return data
}

export async function approveStep(stepId: string, actorId: string) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  if (!policy.requiresApproval || !policy.approverRole) throw new Error('该步骤未配置审批')
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.approverRole) throw new Error(`角色不匹配：该步骤必须由“${ROLE_NAMES[policy.approverRole]}”审批`)
  const approval = await readObject('ApprovalRecord', approvalPk(stepId))
  if (!approval || approval.data.status !== 'pending') throw new Error('不存在待审批申请')
  if (policy.separationOfDuty && approval.data.requestedBy === actor.id) throw new Error('职责分离约束：发起人不能审批自己的申请')
  const approvedAt = nowIso()
  const approvalSubject = {
    caseId: 'CASE-01', stepId, requestRef: approval.data.code, requester: approval.data.requestedBy,
    approver: actor.id, decision: 'approved', approvedAt, policy, subjectContext: approval.data.subjectContext ?? null,
  }
  const approvalSignature = await createSignature(stepId, 'approval', actor, approvalSubject)
  const next = {
    ...approval.data, status: 'approved', approvedBy: actor.id, approvedByName: `${actor.title} · ${actor.name}`,
    approvedRole: actor.roleId, approvedAt, approvalSignatureRef: approvalSignature.code, decision: 'approved',
  }
  await upsertObject('ApprovalRecord', approvalPk(stepId), `${stepId} · 已批准`, next)
  return next
}

export async function assertStepExecutionAuthorized(stepId: string, actorId: string) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`角色不匹配：该步骤必须由“${ROLE_NAMES[policy.executorRole]}”执行并签署`)
  if (policy.requiresApproval) {
    const approval = await readObject('ApprovalRecord', approvalPk(stepId))
    if (!approval || approval.data.status !== 'approved') throw new Error('该步骤尚未获得必要审批')
    if (policy.separationOfDuty && approval.data.requestedBy === approval.data.approvedBy) throw new Error('审批记录违反职责分离约束')
    if (!approval.data.requestSignatureRef || !approval.data.approvalSignatureRef) throw new Error('审批记录缺少申请或批准签署凭据')
    const [requestSignature, approvalSignature] = await Promise.all([
      readObject('SignatureRecord', approval.data.requestSignatureRef),
      readObject('SignatureRecord', approval.data.approvalSignatureRef),
    ])
    if (!requestSignature || !approvalSignature) throw new Error('审批签署记录不可解析，拒绝执行')
    if (!signatureIntegrityValid(requestSignature.data) || !signatureIntegrityValid(approvalSignature.data)) throw new Error('审批签署完整性校验失败，拒绝执行')
  }
  return actor
}

export async function recordStepExecutionSignature(stepId: string, actorId: string, subject: Record<string, unknown>) {
  const actor = await assertStepExecutionAuthorized(stepId, actorId)
  return createSignature(stepId, 'execution', actor, subject)
}

export async function recordRunControlSignature(stepId: string, actorId: string, subject: Record<string, unknown>) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`运行控制签署必须由“${ROLE_NAMES[policy.executorRole]}”岗位完成`)
  return createSignature(stepId, 'control', actor, subject)
}

export async function recordDataQualitySignature(stepId: string, actorId: string, subject: Record<string, unknown>) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`数据质量签署必须由“${ROLE_NAMES[policy.executorRole]}”岗位完成`)
  return createSignature(stepId, 'data-quality', actor, subject)
}


export async function recordAdjudicationSignature(stepId: string, actorId: string, subject: Record<string, unknown>) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`自动判读确认必须由“${ROLE_NAMES[policy.executorRole]}”岗位完成`)
  return createSignature(stepId, 'adjudication', actor, subject)
}

export async function recordExpertOpinionSignature(actorId: string, subject: Record<string, unknown>) {
  await ensureCase01GovernanceOntology()
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== 'expert-reviewer') throw new Error('专家独立意见必须由鉴定专家组成员签署')
  return createSignature('freeze-conclusion', 'expert-review', actor, subject)
}

export async function recordPanelDecisionSignature(actorId: string, subject: Record<string, unknown>) {
  await ensureCase01GovernanceOntology()
  const actor = getGovernanceActor(actorId)
  if (actor.roleId !== 'evaluation-authority') throw new Error('合议最终处置必须由鉴定评估负责人/合议主席签署')
  return createSignature('freeze-conclusion', 'panel-decision', actor, subject)
}

export async function getStepGovernance(stepId: string, actorId?: string | null) {
  await ensureCase01GovernanceOntology()
  const policy = getStepPolicy(stepId)
  const approval = policy.requiresApproval ? await readObject('ApprovalRecord', approvalPk(stepId)) : null
  let stage: 'ready-execution' | 'awaiting-request' | 'awaiting-approval' = 'ready-execution'
  if (policy.requiresApproval && !approval) stage = 'awaiting-request'
  else if (policy.requiresApproval && approval?.data.status === 'pending') stage = 'awaiting-approval'
  else if (policy.requiresApproval && approval?.data.status !== 'approved') stage = 'awaiting-request'

  const actor = actorId ? CASE01_ACTORS.find((item) => item.id === actorId) ?? null : null
  const requiredRole = stage === 'awaiting-request' ? policy.initiatorRole : stage === 'awaiting-approval' ? policy.approverRole! : policy.executorRole
  const allowed = !!actor && actor.roleId === requiredRole && !(stage === 'awaiting-approval' && policy.separationOfDuty && approval?.data.requestedBy === actor.id)
  return {
    policy: { ...policy, initiatorRoleName: ROLE_NAMES[policy.initiatorRole], approverRoleName: policy.approverRole ? ROLE_NAMES[policy.approverRole] : null, executorRoleName: ROLE_NAMES[policy.executorRole] },
    stage, requiredRole, requiredRoleName: ROLE_NAMES[requiredRole], allowed,
    approval: approval?.data ?? null,
  }
}

export async function listCase01GovernanceRecords() {
  await ensureCase01GovernanceOntology()
  const approvals = (await listObjects('ApprovalRecord')).filter((x) => x.data.caseId === 'CASE-01')
  const signatures = (await listObjects('SignatureRecord')).filter((x) => x.data.caseId === 'CASE-01')
  return {
    approvals: approvals.map((x) => x.data),
    signatures: signatures.map((x) => ({ ...x.data, integrityValid: signatureIntegrityValid(x.data) })),
  }
}

export async function resetCase01GovernanceRecords() {
  await ensureCase01GovernanceOntology()
  for (const apiName of ['ApprovalRecord', 'SignatureRecord']) {
    const t = await db.objectType.findUnique({ where: { apiName } })
    if (!t) continue
    const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
    const caseRows = rows.filter((row) => {
      try { return JSON.parse(row.dataJson || '{}').caseId === 'CASE-01' } catch { return false }
    })
    if (!caseRows.length) continue
    await db.objectEntry.deleteMany({ where: { id: { in: caseRows.map((r) => r.id) } } })
    await db.objectType.update({ where: { id: t.id }, data: { objectCount: { decrement: caseRows.length } } })
  }
}

export async function hasStepExecutionSignature(stepId: string) {
  const signatures = await listObjects('SignatureRecord')
  return signatures.some((item) => item.data.caseId === 'CASE-01' && item.data.stepId === stepId && item.data.phase === 'execution' && item.data.signatureHash)
}
