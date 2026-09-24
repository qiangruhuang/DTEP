import { sha256Digest } from '@/lib/security/canonical'
import { signGovernancePayload, verifyDigitalSignatureEnvelope } from '@/lib/security/digital-signature'
import { runEngineeringAdapter } from '@/lib/adapters/runtime-client'
import { db } from '@/lib/db'
import { clearCase01Assemblies, createCase01InitialAssemblies, ensureTestModelAssemblyOntology } from '@/lib/test-model-assembly'
import { clearCase01EnvironmentAssemblies, createCase01InitialEnvironmentAssemblies, ensureTestEnvironmentOntology } from '@/lib/test-environment-assembly'
import { clearCase01ReadinessReviews, ensureReadinessOntology } from '@/lib/test-readiness-review'
import { clearCase01RunControlRecords, ensureRunControlOntology } from '@/lib/run-control-monitoring'
import { clearCase01RunDataQualityRecords, ensureRunDataQualityOntology } from '@/lib/run-data-quality'
import { clearCase01AutomatedAdjudicationRecords, ensureAutomatedAdjudicationOntology } from '@/lib/event-to-measure'
import { clearCase01ExpertReviewRecords, ensureExpertReviewOntology } from '@/lib/expert-review'

export type Dp30StepId =
  | 'receive-isolate'
  | 'g0-manifest'
  | 'classify-route'
  | 'g1-first-test'
  | 'remediate-retest'
  | 'freeze-baseline'
  | 'qualify-handoff'

export type Dp30RoleId =
  | 'delivery-provider'
  | 'intake-officer'
  | 'conformance-engineer'
  | 'configuration-manager'
  | 'qualification-authority'

export type Dp30Actor = { id: string; name: string; title: string; roleId: Dp30RoleId; roleName: string }
export type Dp30Policy = {
  stepId: Dp30StepId
  initiatorRole: Dp30RoleId
  approverRole: Dp30RoleId
  executorRole: Dp30RoleId
  rationale: string
}

export const DP30_CASE_ID = 'DP30-INTAKE-01'
export const DELIVERY_ID = 'DLV-X9A-DP30-001'
export const PROTOTYPE_ID = 'DP30-X9A-S3'
export const MANIFEST_ID = 'MAN-X9A-DP30-001'
export const BASELINE_ID = 'BL-X9A-DP30-001'

export const DP30_STEPS: Array<{ id: Dp30StepId; label: string; short: string; output: string; gate: string }> = [
  { id: 'receive-isolate', label: '签收数字样机 3.0 并建立隔离副本', short: '接收隔离', output: '交付介质保全 + Custody Hash', gate: '收件' },
  { id: 'g0-manifest', label: '核验 Manifest、文件哈希与 3.0 十要素', short: 'G0 交付验收', output: 'G0 PASS + 完整性矩阵', gate: 'G0' },
  { id: 'classify-route', label: '完成模型分类与 FMI / SAL / IDL 运行路由', short: '分类路由', output: '10 个 ModelArtifact + 3 个接口契约', gate: '准备' },
  { id: 'g1-first-test', label: '执行首轮技术符合性试验', short: 'G1 首测', output: 'FMI PASS / SAL FAIL / IDL FAIL', gate: 'G1' },
  { id: 'remediate-retest', label: '接收 v3.0.1 整改包并完成复测', short: '整改复测', output: 'SAL / IDL 复测 PASS，G1 关闭', gate: 'G1' },
  { id: 'freeze-baseline', label: '冻结试验基地数字样机模型基线', short: '基地基线', output: 'BL-X9A-DP30-001 + SHA-256', gate: '基线' },
  { id: 'qualify-handoff', label: '完成资格鉴定并挂接 CASE-01 / VV&A', short: '资格移交', output: 'G2-ENTRY PASS + Model/Environment Assembly', gate: 'G2' },
]

export const DP30_ACTORS: Dp30Actor[] = [
  { id: 'DPA-ZHANG', name: '张嵘', title: '研制方交付代表', roleId: 'delivery-provider', roleName: '数字样机交付/整改提交' },
  { id: 'DPA-CHEN', name: '陈楷', title: '数字样机接收员', roleId: 'intake-officer', roleName: '交付接收与完整性核验' },
  { id: 'DPA-HAN', name: '韩宁', title: '模型符合性工程师', roleId: 'conformance-engineer', roleName: 'FMI/SAL/IDL 技术符合性试验' },
  { id: 'DPA-LUO', name: '罗毅', title: '配置平台主管', roleId: 'configuration-manager', roleName: '配置审查与基地基线冻结' },
  { id: 'DPA-ZHAO', name: '赵岚', title: '模型资格认可授权人', roleId: 'qualification-authority', roleName: '模型资格准入与 VV&A 移交' },
]

const ROLE_NAMES: Record<Dp30RoleId, string> = {
  'delivery-provider': '研制方交付代表',
  'intake-officer': '数字样机接收员',
  'conformance-engineer': '模型符合性工程师',
  'configuration-manager': '配置平台主管',
  'qualification-authority': '模型资格认可授权人',
}

export const DP30_POLICIES: Record<Dp30StepId, Dp30Policy> = {
  'receive-isolate': { stepId: 'receive-isolate', initiatorRole: 'delivery-provider', approverRole: 'intake-officer', executorRole: 'intake-officer', rationale: '研制方提出交付，基地接收员独立核对交付介质后签收并建立隔离副本。' },
  'g0-manifest': { stepId: 'g0-manifest', initiatorRole: 'intake-officer', approverRole: 'configuration-manager', executorRole: 'intake-officer', rationale: '接收员完成 Manifest/哈希/十要素检查，由配置平台主管复核交付构型后确认 G0。' },
  'classify-route': { stepId: 'classify-route', initiatorRole: 'conformance-engineer', approverRole: 'configuration-manager', executorRole: 'conformance-engineer', rationale: '符合性工程师按非运行类、FMI 性能模型、SAL 作战模型、IDL 数据契约分类；配置平台主管确认路由。' },
  'g1-first-test': { stepId: 'g1-first-test', initiatorRole: 'conformance-engineer', approverRole: 'qualification-authority', executorRole: 'conformance-engineer', rationale: '技术符合性试验属于正式资格证据，测试方案由资格授权人批准，测试与批准职责分离。' },
  'remediate-retest': { stepId: 'remediate-retest', initiatorRole: 'delivery-provider', approverRole: 'conformance-engineer', executorRole: 'conformance-engineer', rationale: '研制方提交整改版，基地符合性工程师确认补丁范围并独立复测，保留首测失败记录。' },
  'freeze-baseline': { stepId: 'freeze-baseline', initiatorRole: 'configuration-manager', approverRole: 'qualification-authority', executorRole: 'configuration-manager', rationale: '只有 G0/G1 均关闭后才能冻结基地基线；资格授权人批准，配置平台主管执行冻结。' },
  'qualify-handoff': { stepId: 'qualify-handoff', initiatorRole: 'conformance-engineer', approverRole: 'qualification-authority', executorRole: 'qualification-authority', rationale: '符合性工程师提交资格结论，授权人批准后将合格 Artifact 映射到 ModelAsset 并移交 CASE-01/VV&A。' },
}

const ARTIFACTS = [
  { pk: 'ART-DP30-01', title: '总体布局', category: '产品构成', element: '总体布局', runtimeClass: '非仿真运行类', format: 'STEP/CAD + PNG', deliveryVersion: '3.0.0', route: 'Viewer', interfaceProfile: '静态查看', promotedModelRef: null },
  { pk: 'ART-DP30-02', title: '系统组成', category: '产品构成', element: '系统组成', runtimeClass: '非仿真运行类', format: 'SysML BDD/IBD + XML', deliveryVersion: '3.0.0', route: 'Ontology Import', interfaceProfile: '结构化/逻辑视图', promotedModelRef: null },
  { pk: 'ART-DP30-03', title: '配套资源', category: '产品构成', element: '配套资源', runtimeClass: '非仿真运行类', format: 'XML/JSON', deliveryVersion: '3.0.0', route: 'Resource Import', interfaceProfile: '结构化数据', promotedModelRef: null },
  { pk: 'ART-DP30-04', title: '功能特性', category: '产品特性', element: '功能特性', runtimeClass: '混合类', format: 'SysML ACT/STM + XML', deliveryVersion: '3.0.0', route: 'Requirements/Measure Mapping', interfaceProfile: '结构化+逻辑视图', promotedModelRef: null },
  { pk: 'ART-DP30-05', title: '性能特性 FMU', category: '产品特性', element: '性能特性', runtimeClass: '仿真运行类', format: 'FMU', deliveryVersion: '3.0.0', route: 'FMI Runtime', interfaceProfile: 'FMI 2.0 Co-Simulation', promotedModelRef: 'MD-01' },
  { pk: 'ART-DP30-06', title: '通用质量特性', category: '产品特性', element: '通用质量特性', runtimeClass: '混合类', format: 'XML + FMU', deliveryVersion: '3.0.0', route: 'FMI/Analysis', interfaceProfile: 'FMI 2.0 + XML', promotedModelRef: null },
  { pk: 'ART-DP30-07', title: '操作使用', category: '产品行为', element: '操作使用', runtimeClass: '非仿真运行类', format: 'IETM + XML + STM', deliveryVersion: '3.0.0', route: 'Procedure/Training', interfaceProfile: '结构化+逻辑视图', promotedModelRef: null },
  { pk: 'ART-DP30-08', title: '维修保障', category: '产品行为', element: '维修保障', runtimeClass: '非仿真运行类', format: 'IETM + XML', deliveryVersion: '3.0.0', route: 'Support Workflow', interfaceProfile: '结构化文本/数据', promotedModelRef: null },
  { pk: 'ART-DP30-09', title: '作战运用 SAL 模型', category: '产品行为', element: '作战运用', runtimeClass: '仿真运行类', format: 'Binary + Config', deliveryVersion: '3.0.0', route: 'SAL Runtime', interfaceProfile: 'SAL + IDL', promotedModelRef: 'MD-08' },
  { pk: 'ART-DP30-10', title: '虚实交互适配器', category: '产品行为', element: '虚实交互', runtimeClass: '仿真运行类', format: 'Binary + IDL', deliveryVersion: '3.0.0', route: 'LVC / Live Gateway', interfaceProfile: 'IDL Topic + SAL Interaction', promotedModelRef: null },
] as const

const CONTRACTS = [
  { pk: 'CTR-DP30-FMI-01', title: 'X9A 性能模型 FMI 契约', kind: 'FMI', version: '2.0', artifactRefs: ['ART-DP30-05', 'ART-DP30-06'], requirements: ['FMU 可解析', 'Instantiate/Initialize', 'doStep', 'Reset', '跨平台加载', '输入输出元数据完整'] },
  { pk: 'CTR-DP30-SAL-01', title: 'X9A 作战运用 SAL 契约', kind: 'SAL', version: '1.0-demo', artifactRefs: ['ART-DP30-09'], requirements: ['时间管理', '事件管理', '模型管理', '交互管理', '服务管理', '阵营管理', 'PrepareData', 'Validate', 'Start', 'Reset'] },
  { pk: 'CTR-DP30-IDL-01', title: 'X9A 模型交互 IDL 契约', kind: 'IDL', version: '1.3', artifactRefs: ['ART-DP30-09', 'ART-DP30-10'], requirements: ['平台状态 Topic', '传感器/目标 Topic', 'EW.Status v2.1', 'Mission.Status', 'WeaponEngagement', '发布/订阅兼容'] },
] as const

function sha256(value: unknown) { return sha256Digest(value) }
function nowIso() { return new Date().toISOString() }

async function ensureType(apiName: string, displayName: string, description: string, icon: string) {
  const existing = await db.objectType.findUnique({ where: { apiName } })
  return existing ?? db.objectType.create({ data: { apiName, displayName, description, icon } })
}
async function type(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 本体未初始化`)
  return t
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
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id }, orderBy: { pk: 'asc' } })
  return rows.map((row) => ({ ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }))
}
async function upsertObject(apiName: string, pk: string, title: string, data: Record<string, unknown>) {
  const t = await type(apiName)
  const existing = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (existing) return db.objectEntry.update({ where: { id: existing.id }, data: { title, dataJson: JSON.stringify(data) } })
  const created = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return created
}
async function createObject(apiName: string, pk: string, title: string, data: Record<string, unknown>) {
  const t = await type(apiName)
  const existing = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (existing) throw new Error(`${apiName}/${pk} 已存在；审计记录禁止原地覆盖`)
  const created = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return created
}
async function patchObject(apiName: string, pk: string, patch: Record<string, unknown> | ((data: Record<string, any>) => Record<string, any>)) {
  const current = await readObject(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  const next = typeof patch === 'function' ? patch(current.data) : { ...current.data, ...patch }
  await db.objectEntry.update({ where: { id: current.id }, data: { dataJson: JSON.stringify(next) } })
  return next
}
async function deleteCaseObjects(apiName: string, predicate: (data: Record<string, any>, pk: string) => boolean) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
  const ids = rows.filter((row) => {
    try { return predicate(JSON.parse(row.dataJson || '{}'), row.pk) } catch { return false }
  }).map((row) => row.id)
  if (!ids.length) return
  await db.objectEntry.deleteMany({ where: { id: { in: ids } } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { decrement: ids.length } } })
}

async function ensureLink(apiName: string, displayName: string, sourceApi: string, targetApi: string, cardinality = '一对多') {
  const existing = await db.linkType.findFirst({ where: { apiName } })
  if (existing) return existing
  const [source, target] = await Promise.all([type(sourceApi), type(targetApi)])
  return db.linkType.create({ data: { apiName, displayName, sourceTypeId: source.id, targetTypeId: target.id, cardinality } })
}

async function ensureActionType() {
  const existing = await db.actionType.findFirst({ where: { apiName: 'dp30IntakeTransition' } })
  if (existing) return existing
  const t = await type('DigitalPrototypeDelivery')
  return db.actionType.create({ data: { apiName: 'dp30IntakeTransition', displayName: '数字样机3.0接收资格状态迁移', objectTypeId: t.id, parametersJson: JSON.stringify([{ name: 'step', type: 'string' }]), description: 'DP30-INTAKE-01 受控状态迁移动作。' } })
}
async function logTransition(step: string, result: string, performedBy: string, detail: Record<string, any> = {}) {
  const action = await ensureActionType()
  return db.actionLog.create({ data: { actionTypeId: action.id, objectPk: DELIVERY_ID, performedBy, parametersJson: JSON.stringify({ step, result, ...detail }) } })
}

function baseDelivery() {
  return {
    code: DELIVERY_ID, caseId: DP30_CASE_ID, name: 'X9A 数字样机 3.0 交付批次', provider: 'X9A 承研承制单位', receiver: '试验鉴定基地', targetProgram: 'TP-25-01', targetCase: 'CASE-01',
    deliveryVersion: '3.0.0', submittedAt: '2026-08-28T09:30:00+08:00', status: '研制方已提交 · 待基地签收', prototypeRef: PROTOTYPE_ID, manifestRef: MANIFEST_ID,
    media: { label: 'DP30-X9A-S3-001', classification: 'DEMO', encrypted: true, sizeGb: 18.6 }, custody: null, baselineRef: null,
    gates: { G0: { status: '未执行', label: 'Delivery Acceptance' }, G1: { status: '未执行', label: 'Technical Conformance' }, G2: { status: '未执行', label: 'Qualification / VV&A Entry' } },
    targetOutcome: '形成试验基地权威模型基线，并将可运行模型映射为 ModelAsset 进入 CASE-01 / Model VV&A。',
    demoNotice: 'DEMO/SYNTHETIC：所有文件、版本、哈希和符合性结果仅用于原型演示。',
  }
}
function basePrototype() {
  return {
    code: PROTOTYPE_ID, deliveryRef: DELIVERY_ID, name: 'X9A 数字样机模型（3.0-交付）', stage: '3.0-交付', status: '待接收资格鉴定',
    composition: {
      '产品构成模型': ['ART-DP30-01', 'ART-DP30-02', 'ART-DP30-03'],
      '产品特性模型': ['ART-DP30-04', 'ART-DP30-05', 'ART-DP30-06'],
      '产品行为模型': ['ART-DP30-07', 'ART-DP30-08', 'ART-DP30-09', 'ART-DP30-10'],
    },
    elementCount: 10, runtimeArtifactRefs: ['ART-DP30-05', 'ART-DP30-06', 'ART-DP30-09', 'ART-DP30-10'], staticArtifactRefs: ['ART-DP30-01', 'ART-DP30-02', 'ART-DP30-03', 'ART-DP30-07', 'ART-DP30-08'],
    sourceRule: '3.0 = 产品构成 + 产品特性 + 产品行为；运行类按性能试验/作战试验分别进入 FMI 与 SAL/IDL 技术路线。',
  }
}
function baseManifest() {
  const artifactRefs = ARTIFACTS.map((x) => x.pk)
  const contractRefs = CONTRACTS.map((x) => x.pk)
  const manifestBody = { schema: 'dtep/dp30-delivery-manifest/v2.0a', deliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, artifactRefs, contractRefs, declaredElementCount: 10, version: '3.0.0' }
  return { ...manifestBody, code: MANIFEST_ID, status: '待核验', declaredPackageHash: sha256({ media: 'DP30-X9A-S3-001', version: '3.0.0', artifactRefs, contractRefs }), manifestHash: sha256(manifestBody), verifiedAt: null, verifiedBy: null, checks: null }
}

export async function ensureDp30Ontology() {
  await ensureTestModelAssemblyOntology()
  await ensureTestEnvironmentOntology()
  await ensureReadinessOntology()
  await ensureRunControlOntology()
  await ensureRunDataQualityOntology()
  await ensureAutomatedAdjudicationOntology()
  await ensureExpertReviewOntology()
  await ensureType('DigitalPrototypeDelivery', '数字样机3.0交付批次', '研制方交付到试验鉴定基地的数字样机3.0交付对象、介质与门控状态。', 'package-open')
  await ensureType('DeliveryManifest', '3.0交付清单', '数字样机3.0的文件、版本、哈希、模型要素与接口契约清单。', 'list-checks')
  await ensureType('DigitalPrototype3', '数字样机模型（3.0-交付）', '由产品构成、产品特性、产品行为模型组成的试验鉴定交付对象。', 'cuboid')
  await ensureType('ModelArtifact', '模型交付物', '3.0十要素对应的可追溯交付物；区分非运行类与仿真运行类。', 'file-cog')
  await ensureType('InterfaceContract', '模型接口契约', 'FMI、SAL、IDL 等模型运行与交互技术契约。', 'braces')
  await ensureType('ConformanceTest', '符合性试验', '试验基地对3.0交付物执行的技术符合性测试定义与状态。', 'flask-conical')
  await ensureType('ConformanceResult', '符合性试验结果', 'FMI/SAL/IDL首测与复测结果，历史结果追加保留。', 'badge-check')
  await ensureType('ModelBaseline', '试验基地模型基线', '通过交付验收和技术符合性后由试验基地冻结的权威运行基线。', 'git-commit-horizontal')
  await ensureType('IntakeGate', '数字样机资格门控', 'G0交付验收、G1技术符合性与G2 VV&A入口资格的独立门控对象。', 'shield-check')
  // v1.7 已存在，保证独立运行时仍可自初始化。
  await ensureType('WorkflowPrincipal', '工作流人员与角色', '受控工作流岗位身份目录。', 'users')
  await ensureType('ApprovalRecord', '审批记录', '受控状态迁移动作的申请与审批记录。', 'badge-check')
  await ensureType('SignatureRecord', '签署记录', 'DEMO SHA-256见证记录；不等同于真实PKI数字签名。', 'signature')

  for (const link of [
    ['deliveryHasManifest', '交付批次—Manifest', 'DigitalPrototypeDelivery', 'DeliveryManifest'],
    ['deliveryContainsPrototype', '交付批次—数字样机3.0', 'DigitalPrototypeDelivery', 'DigitalPrototype3'],
    ['prototypeHasArtifact', '数字样机—模型交付物', 'DigitalPrototype3', 'ModelArtifact'],
    ['artifactImplementsContract', '交付物—接口契约', 'ModelArtifact', 'InterfaceContract'],
    ['artifactTestedBy', '交付物—符合性试验', 'ModelArtifact', 'ConformanceTest'],
    ['testProducesResult', '符合性试验—结果', 'ConformanceTest', 'ConformanceResult'],
    ['baselineContainsArtifact', '基地基线—交付物', 'ModelBaseline', 'ModelArtifact'],
    ['artifactPromotedToModel', '交付物—试验ModelAsset', 'ModelArtifact', 'ModelAsset'],
    ['deliveryFeedsCase', '3.0交付—数字试验Case', 'DigitalPrototypeDelivery', 'DigitalTestCase'],
  ] as const) await ensureLink(link[0], link[1], link[2], link[3])

  for (const actor of DP30_ACTORS) await upsertObject('WorkflowPrincipal', actor.id, `${actor.title} · ${actor.name}`, { code: actor.id, caseId: DP30_CASE_ID, name: actor.name, title: actor.title, roleId: actor.roleId, roleName: actor.roleName, active: true, identityAssurance: (process.env.DTEP_AUTH_MODE || 'demo') === 'oidc' ? 'OIDC VERIFIED / ROLE MAPPED' : 'ENGINEERING LOCAL IDENTITY / ROLE SWITCH FALLBACK' })

  if (!(await readObject('DigitalPrototypeDelivery', DELIVERY_ID))) await upsertObject('DigitalPrototypeDelivery', DELIVERY_ID, 'X9A 数字样机 3.0 交付批次', baseDelivery())
  if (!(await readObject('DigitalPrototype3', PROTOTYPE_ID))) await upsertObject('DigitalPrototype3', PROTOTYPE_ID, 'X9A 数字样机模型（3.0-交付）', basePrototype())
  if (!(await readObject('DeliveryManifest', MANIFEST_ID))) await upsertObject('DeliveryManifest', MANIFEST_ID, 'X9A 数字样机 3.0 Manifest', baseManifest())
  for (const item of ARTIFACTS) if (!(await readObject('ModelArtifact', item.pk))) await upsertObject('ModelArtifact', item.pk, item.title, { ...item, deliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, status: '随包提交 · 待核验', fileHash: sha256({ pk: item.pk, version: item.deliveryVersion, format: item.format }), conformanceStatus: '未测试', remediation: null })
  for (const item of CONTRACTS) if (!(await readObject('InterfaceContract', item.pk))) await upsertObject('InterfaceContract', item.pk, item.title, { ...item, deliveryRef: DELIVERY_ID, status: '随包提交 · 待核验', conformanceStatus: '未测试' })
  for (const gate of [
    { pk: 'G0-DP30', title: 'G0 · Delivery Acceptance', data: { code: 'G0-DP30', caseId: DP30_CASE_ID, gate: 'G0', question: '交付给基地的数字样机3.0是否齐套、可识别、哈希一致？', status: '未执行', blockers: [], decision: null } },
    { pk: 'G1-DP30', title: 'G1 · Technical Conformance', data: { code: 'G1-DP30', caseId: DP30_CASE_ID, gate: 'G1', question: '运行类模型能否在基地环境按FMI/SAL/IDL契约运行和交互？', status: '未执行', blockers: [], decision: null } },
    { pk: 'G2-DP30', title: 'G2 · Qualification / VV&A Entry', data: { code: 'G2-DP30', caseId: DP30_CASE_ID, gate: 'G2', question: '是否可形成基地基线并进入具体Intended Use的VV&A/试验设计？', status: '未执行', blockers: [], decision: null, note: 'G2-ENTRY通过不等于模型已完成VV&A认可。' } },
  ]) if (!(await readObject('IntakeGate', gate.pk))) await upsertObject('IntakeGate', gate.pk, gate.title, gate.data)
}

function approvalPk(stepId: Dp30StepId) { return `APR-DP30-${stepId}` }
function signaturePk(stepId: string, phase: string, actorId: string, signatureHash: string) { return `SIG-DP30-${stepId}-${phase}-${actorId}-${signatureHash.slice(-12)}` }
function getActor(actorId: string) {
  const actor = DP30_ACTORS.find((x) => x.id === actorId)
  if (!actor) throw new Error('未知演示身份')
  return actor
}
function signatureIntegrityValid(data: Record<string, any>) {
  if (!data?.signatureHash || !data?.subjectDigest || !data?.signedAt || !data?.signatureValue || !data?.signerPublicKeyPem) return false
  const signedPayload = { caseId: data.caseId, stepId: data.stepId, phase: data.phase, actorId: data.signerId, roleId: data.signerRole, signedAt: data.signedAt, subjectDigest: data.subjectDigest }
  if (sha256({ signatureValue: data.signatureValue, publicKeyFingerprint: data.signerPublicKeyFingerprint, signedPayload }) !== data.signatureHash) return false
  return verifyDigitalSignatureEnvelope({ scheme: data.signatureScheme, keyId: data.signerKeyId, publicKeyPem: data.signerPublicKeyPem, publicKeyFingerprint: data.signerPublicKeyFingerprint, signatureValue: data.signatureValue, signedPayload })
}
async function createSignature(stepId: Dp30StepId, phase: 'request' | 'approval' | 'execution', actor: Dp30Actor, subject: Record<string, unknown>) {
  const signedAt = nowIso(); const subjectDigest = sha256(subject)
  const signedPayload = { caseId: DP30_CASE_ID, stepId, phase, actorId: actor.id, roleId: actor.roleId, signedAt, subjectDigest }
  const envelope = await signGovernancePayload(actor.id, signedPayload)
  const signatureHash = sha256({ signatureValue: envelope.signatureValue, publicKeyFingerprint: envelope.publicKeyFingerprint, signedPayload }); const code = signaturePk(stepId, phase, actor.id, signatureHash)
  const data = { code, caseId: DP30_CASE_ID, stepId, phase, signerId: actor.id, signerName: `${actor.title} · ${actor.name}`, signerRole: actor.roleId, signerRoleName: ROLE_NAMES[actor.roleId], signedAt, subjectDigest, signatureHash, signatureScheme: envelope.scheme, signatureValue: envelope.signatureValue, signerKeyId: envelope.keyId, signerPublicKeyPem: envelope.publicKeyPem, signerPublicKeyFingerprint: envelope.publicKeyFingerprint, immutable: true, assurance: 'ENGINEERING CRYPTOGRAPHIC SIGNATURE：Ed25519 detached signature已进行密码学验证；生产部署应切换组织PKI/CAC/HSM/远程签名服务。' }
  await createObject('SignatureRecord', code, `${phase.toUpperCase()} · ${actor.title} · ${actor.name}`, data)
  return data
}
async function requestApproval(stepId: Dp30StepId, actorId: string) {
  const policy = DP30_POLICIES[stepId]; const actor = getActor(actorId)
  if (actor.roleId !== policy.initiatorRole) throw new Error(`该步骤必须由“${ROLE_NAMES[policy.initiatorRole]}”发起`)
  const existing = await readObject('ApprovalRecord', approvalPk(stepId))
  if (existing && ['pending', 'approved'].includes(existing.data.status)) throw new Error('该步骤已存在有效审批流程')
  const requestedAt = nowIso(); const requestSignature = await createSignature(stepId, 'request', actor, { caseId: DP30_CASE_ID, stepId, requestedAt, policy })
  const data = { code: approvalPk(stepId), caseId: DP30_CASE_ID, stepId, status: 'pending', policy, requestedBy: actor.id, requestedByName: `${actor.title} · ${actor.name}`, requestedRole: actor.roleId, requestedAt, requestSignatureRef: requestSignature.code, approvedBy: null, approvedByName: null, approvedRole: null, approvedAt: null, approvalSignatureRef: null, decision: null }
  await upsertObject('ApprovalRecord', data.code, `${stepId} · 待审批`, data)
}
async function approve(stepId: Dp30StepId, actorId: string) {
  const policy = DP30_POLICIES[stepId]; const actor = getActor(actorId)
  if (actor.roleId !== policy.approverRole) throw new Error(`该步骤必须由“${ROLE_NAMES[policy.approverRole]}”审批`)
  const approval = await readObject('ApprovalRecord', approvalPk(stepId))
  if (!approval || approval.data.status !== 'pending') throw new Error('不存在待审批申请')
  if (approval.data.requestedBy === actor.id) throw new Error('职责分离：发起人不能审批自己的申请')
  const approvedAt = nowIso(); const sig = await createSignature(stepId, 'approval', actor, { caseId: DP30_CASE_ID, stepId, requestRef: approval.data.code, requester: approval.data.requestedBy, approver: actor.id, decision: 'approved', approvedAt, policy })
  await upsertObject('ApprovalRecord', approval.data.code, `${stepId} · 已批准`, { ...approval.data, status: 'approved', approvedBy: actor.id, approvedByName: `${actor.title} · ${actor.name}`, approvedRole: actor.roleId, approvedAt, approvalSignatureRef: sig.code, decision: 'approved' })
}
async function assertExecution(stepId: Dp30StepId, actorId: string) {
  const policy = DP30_POLICIES[stepId]; const actor = getActor(actorId)
  if (actor.roleId !== policy.executorRole) throw new Error(`该步骤必须由“${ROLE_NAMES[policy.executorRole]}”执行`)
  const approval = await readObject('ApprovalRecord', approvalPk(stepId))
  if (!approval || approval.data.status !== 'approved') throw new Error('该步骤尚未获得必要审批')
  if (approval.data.requestedBy === approval.data.approvedBy) throw new Error('审批记录违反职责分离约束')
  for (const ref of [approval.data.requestSignatureRef, approval.data.approvalSignatureRef]) {
    const sig = ref ? await readObject('SignatureRecord', ref) : null
    if (!sig || !signatureIntegrityValid(sig.data)) throw new Error('审批签署完整性校验失败')
  }
  return actor
}
async function recordExecution(stepId: Dp30StepId, actor: Dp30Actor, subject: Record<string, unknown>) { return createSignature(stepId, 'execution', actor, subject) }
async function hasExecutionSignature(stepId: Dp30StepId) {
  const records = await listObjects('SignatureRecord')
  return records.some((x) => x.data.caseId === DP30_CASE_ID && x.data.stepId === stepId && x.data.phase === 'execution' && signatureIntegrityValid(x.data))
}
async function getGovernance(stepId: Dp30StepId, actorId?: string | null) {
  const policy = DP30_POLICIES[stepId]; const approval = await readObject('ApprovalRecord', approvalPk(stepId))
  const stage = !approval || approval.data.status !== 'pending' && approval.data.status !== 'approved' ? 'awaiting-request' : approval.data.status === 'pending' ? 'awaiting-approval' : 'ready-execution'
  const requiredRole = stage === 'awaiting-request' ? policy.initiatorRole : stage === 'awaiting-approval' ? policy.approverRole : policy.executorRole
  const actor = actorId ? DP30_ACTORS.find((x) => x.id === actorId) ?? null : null
  const allowed = !!actor && actor.roleId === requiredRole && !(stage === 'awaiting-approval' && approval?.data.requestedBy === actor.id)
  return { policy: { ...policy, initiatorRoleName: ROLE_NAMES[policy.initiatorRole], approverRoleName: ROLE_NAMES[policy.approverRole], executorRoleName: ROLE_NAMES[policy.executorRole] }, stage, requiredRole, requiredRoleName: ROLE_NAMES[requiredRole], allowed, approval: approval?.data ?? null }
}

async function doReceive(actorLabel: string) {
  const custody = { mediaLabel: 'DP30-X9A-S3-001', isolatedCopy: 'INTAKE://vault/DP30-X9A-S3-001', receivedAt: nowIso(), receivedBy: actorLabel, sourceMediaSealed: true, custodyHash: sha256({ media: 'DP30-X9A-S3-001', source: 'sealed', sizeGb: 18.6 }) }
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, (d) => ({ ...d, status: '已接收 · 隔离区', custody }))
  await patchObject('DigitalPrototype3', PROTOTYPE_ID, { status: '基地隔离区 · 待G0核验' })
  return custody
}
async function doG0(actorLabel: string) {
  const checks = { filesPresent: 13, filesDeclared: 13, hashesMatched: 13, elementCount: 10, elementExpected: 10, categories: ['产品构成模型', '产品特性模型', '产品行为模型'], contractsPresent: ['FMI', 'SAL', 'IDL'], viewerDependenciesPresent: true, result: 'PASS' }
  await patchObject('DeliveryManifest', MANIFEST_ID, (d) => ({ ...d, status: '已核验 · PASS', verifiedAt: nowIso(), verifiedBy: actorLabel, checks }))
  for (const item of ARTIFACTS) await patchObject('ModelArtifact', item.pk, { status: 'G0已核验' })
  for (const item of CONTRACTS) await patchObject('InterfaceContract', item.pk, { status: 'G0已核验' })
  await patchObject('IntakeGate', 'G0-DP30', { status: '已完成', decision: '通过', blockers: [], checkedAt: nowIso(), summary: '13/13 交付项哈希一致；3.0 三大模型簇/10要素齐套。' })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, (d) => ({ ...d, status: 'G0通过 · 待模型分类', gates: { ...d.gates, G0: { ...d.gates.G0, status: '通过', checkedAt: nowIso() } } }))
  return checks
}
async function doClassify() {
  for (const item of ARTIFACTS) await patchObject('ModelArtifact', item.pk, { status: '已分类/已路由', classification: item.runtimeClass, executionRoute: item.route, interfaceProfile: item.interfaceProfile })
  await patchObject('DigitalPrototype3', PROTOTYPE_ID, { status: '已完成模型分类与运行路由', routingSummary: { nonRuntime: 5, mixed: 2, runtime: 3, fmi: ['ART-DP30-05', 'ART-DP30-06'], sal: ['ART-DP30-09'], idl: ['ART-DP30-09', 'ART-DP30-10'] } })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, { status: '运行路由完成 · 待G1符合性试验' })
  return { viewer: 5, fmi: 2, sal: 1, idl: 2 }
}
async function createTest(pk: string, title: string, kind: string, contractRef: string, artifactRefs: string[]) {
  await upsertObject('ConformanceTest', pk, title, { code: pk, caseId: DP30_CASE_ID, kind, contractRef, artifactRefs, status: '已执行', executedAt: nowIso(), environment: 'DTEP Test-Base Sandbox / Linux-x64 / deterministic seed', latestResultRef: null })
}
async function createResult(pk: string, title: string, testRef: string, attempt: number, decision: 'PASS' | 'FAIL', checks: any[], blockers: string[]) {
  const existing = await readObject('ConformanceResult', pk)
  if (existing) {
    await patchObject('ConformanceTest', testRef, { status: existing.data.decision === 'PASS' ? '通过' : '未通过', latestResultRef: pk, lastDecision: existing.data.decision })
    return existing.data
  }
  const payload = { code: pk, caseId: DP30_CASE_ID, testRef, attempt, decision, checks, blockers, recordedAt: nowIso(), immutable: true }
  await createObject('ConformanceResult', pk, title, { ...payload, resultHash: sha256(payload) })
  await patchObject('ConformanceTest', testRef, { status: decision === 'PASS' ? '通过' : '未通过', latestResultRef: pk, lastDecision: decision })
  return payload
}
async function doFirstTest() {
  const fmiRuntime = await runEngineeringAdapter('fmi/conformance', 10000)
  if (fmiRuntime && fmiRuntime.decision && !['PASS', 'UNAVAILABLE'].includes(String(fmiRuntime.decision))) throw new Error('FMI工程执行器符合性未通过，禁止写入G1 PASS')
  await createTest('CT-DP30-FMI-01', 'FMI 2.0 运行符合性', 'FMI', 'CTR-DP30-FMI-01', ['ART-DP30-05', 'ART-DP30-06'])
  await createTest('CT-DP30-SAL-01', 'SAL 生命周期与调度接口符合性', 'SAL', 'CTR-DP30-SAL-01', ['ART-DP30-09'])
  await createTest('CT-DP30-IDL-01', 'IDL Topic / 数据对象契约符合性', 'IDL', 'CTR-DP30-IDL-01', ['ART-DP30-09', 'ART-DP30-10'])
  await createResult('CR-DP30-FMI-A1', 'FMI 首测 · PASS', 'CT-DP30-FMI-01', 1, 'PASS', [
    { name: 'FMU parse/modelDescription', status: 'PASS' }, { name: 'Instantiate/Initialize', status: 'PASS' }, { name: 'doStep 10k cycles', status: 'PASS', detail: fmiRuntime?.decision === 'PASS' ? `工程执行器 ${fmiRuntime.adapter}：${Math.round(Number(fmiRuntime.stepsPerSec || 0))} doStep/s；absError=${fmiRuntime.absError}` : '未配置DTEP_ADAPTER_DAEMON_URL，保留冻结演示判据' }, { name: 'Reset repeatability', status: 'PASS' }, { name: 'I/O metadata', status: 'PASS' },
  ], [])
  await createResult('CR-DP30-SAL-A1', 'SAL 首测 · FAIL', 'CT-DP30-SAL-01', 1, 'FAIL', [
    { name: '时间/事件/模型/交互/服务/阵营接口', status: 'PASS' }, { name: 'PrepareData/Validate/Start', status: 'PASS' }, { name: 'Reset 后状态回归', status: 'FAIL', detail: 'Run#2 初始任务队列残留 2 项，无法保证多次运行同一初态。' },
  ], ['SAL-RESET-001：Reset 未清理任务队列，重复运行初始态不一致'])
  await createResult('CR-DP30-IDL-A1', 'IDL 首测 · FAIL', 'CT-DP30-IDL-01', 1, 'FAIL', [
    { name: 'Topic 编译/二进制布局', status: 'PASS' }, { name: '发布/订阅映射', status: 'PASS' }, { name: 'EW.Status schema version', status: 'FAIL', detail: '基地契约要求 v2.1，交付包声明 v2.0。' },
  ], ['IDL-SCHEMA-002：EW.Status 版本不兼容'])
  await patchObject('ModelArtifact', 'ART-DP30-05', { conformanceStatus: 'FMI PASS' })
  await patchObject('ModelArtifact', 'ART-DP30-06', { conformanceStatus: 'FMI PASS' })
  await patchObject('ModelArtifact', 'ART-DP30-09', { conformanceStatus: 'SAL/IDL BLOCKED' })
  await patchObject('ModelArtifact', 'ART-DP30-10', { conformanceStatus: 'IDL BLOCKED' })
  await patchObject('IntakeGate', 'G1-DP30', { status: '阻塞', decision: '阻塞', blockers: ['SAL-RESET-001', 'IDL-SCHEMA-002'], checkedAt: nowIso(), summary: 'FMI 通过；SAL Reset 可重复性与 IDL EW.Status 版本不兼容，禁止形成基地运行基线。' })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, (d) => ({ ...d, status: 'G1阻塞 · 待研制方整改', gates: { ...d.gates, G1: { ...d.gates.G1, status: '阻塞', blockers: ['SAL-RESET-001', 'IDL-SCHEMA-002'] } } }))
  return { decision: 'BLOCKED', blockers: ['SAL-RESET-001', 'IDL-SCHEMA-002'] }
}
async function doRetest() {
  const salRuntime = await runEngineeringAdapter('sal/conformance', 100)
  if (salRuntime && salRuntime.decision && !['PASS', 'UNAVAILABLE'].includes(String(salRuntime.decision))) throw new Error('SAL工程执行器Reset/生命周期复测未通过，禁止关闭G1')
  await patchObject('ModelArtifact', 'ART-DP30-09', (d) => ({ ...d, deliveryVersion: '3.0.1', conformanceStatus: '复测中', remediation: ['修复 Reset：任务队列/订阅缓存/随机种子状态统一清理', '更新 SAL adapter build 2026.09.03-r1'] }))
  await patchObject('ModelArtifact', 'ART-DP30-10', (d) => ({ ...d, deliveryVersion: '3.0.1', conformanceStatus: '复测中', remediation: ['EW.Status IDL 从 v2.0 升级为 v2.1', '保持字段向后兼容映射'] }))
  await createResult('CR-DP30-SAL-A2', 'SAL 复测 · PASS', 'CT-DP30-SAL-01', 2, 'PASS', [
    { name: '接口最小集', status: 'PASS' }, { name: 'PrepareData/Validate/Start', status: 'PASS' }, { name: 'Reset × 100 runs', status: 'PASS', detail: salRuntime?.decision === 'PASS' ? `工程执行器 ${salRuntime.adapter}：resetDeterministic=${salRuntime.resetDeterministic}；uniqueFingerprints=${salRuntime.uniqueFingerprints}` : '初始状态摘要 100/100 一致（未配置工程Adapter服务）' },
  ], [])
  await createResult('CR-DP30-IDL-A2', 'IDL 复测 · PASS', 'CT-DP30-IDL-01', 2, 'PASS', [
    { name: 'Topic 编译/布局', status: 'PASS' }, { name: '发布/订阅映射', status: 'PASS' }, { name: 'EW.Status v2.1', status: 'PASS' },
  ], [])
  await patchObject('ModelArtifact', 'ART-DP30-09', { conformanceStatus: 'SAL/IDL PASS' })
  await patchObject('ModelArtifact', 'ART-DP30-10', { conformanceStatus: 'IDL PASS' })
  await patchObject('InterfaceContract', 'CTR-DP30-SAL-01', { conformanceStatus: 'PASS' })
  await patchObject('InterfaceContract', 'CTR-DP30-IDL-01', { conformanceStatus: 'PASS' })
  await patchObject('InterfaceContract', 'CTR-DP30-FMI-01', { conformanceStatus: 'PASS' })
  await patchObject('IntakeGate', 'G1-DP30', { status: '已完成', decision: '通过', blockers: [], checkedAt: nowIso(), summary: 'FMI 首测通过；SAL/IDL 整改后复测通过。首测失败记录保留用于审计。' })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, (d) => ({ ...d, deliveryVersion: '3.0.1', status: 'G1通过 · 待冻结基地基线', gates: { ...d.gates, G1: { ...d.gates.G1, status: '通过', closedAfterRemediation: true, blockers: [] } } }))
  return { decision: 'PASS', fixed: ['SAL-RESET-001', 'IDL-SCHEMA-002'] }
}
async function doFreezeBaseline(actorLabel: string) {
  const artifacts = await Promise.all(ARTIFACTS.map((x) => readObject('ModelArtifact', x.pk)))
  const contracts = await Promise.all(CONTRACTS.map((x) => readObject('InterfaceContract', x.pk)))
  const results = (await listObjects('ConformanceResult')).filter((x) => x.data.caseId === DP30_CASE_ID)
  if (artifacts.some((x) => !x) || contracts.some((x) => !x)) throw new Error('基线冻结前引用完整性失败')
  const manifest = { schema: 'dtep/model-baseline/v2.0a', deliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, artifactSnapshots: artifacts.map((x) => ({ pk: x!.pk, title: x!.title, data: x!.data })).sort((a, b) => a.pk.localeCompare(b.pk)), contractSnapshots: contracts.map((x) => ({ pk: x!.pk, title: x!.title, data: x!.data })).sort((a, b) => a.pk.localeCompare(b.pk)), conformanceResultSnapshots: results.map((x) => ({ pk: x.pk, data: x.data })).sort((a, b) => a.pk.localeCompare(b.pk)), gateRefs: ['G0-DP30', 'G1-DP30'] }
  const frozenAt = nowIso(); const baselineHash = sha256(manifest)
  await upsertObject('ModelBaseline', BASELINE_ID, 'X9A 数字样机3.0 · 试验基地基线', { code: BASELINE_ID, caseId: DP30_CASE_ID, status: '已冻结', sourceDeliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, version: '3.0.1-test-base', frozenAt, frozenBy: actorLabel, manifest, baselineHash, mutable: false, qualificationScope: '技术符合性基线；具体试验用途仍需 Model VV&A / Intended Use 认可。' })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, { status: '基地基线已冻结 · 待资格移交', baselineRef: BASELINE_ID })
  await patchObject('DigitalPrototype3', PROTOTYPE_ID, { status: '基地基线已冻结', baselineRef: BASELINE_ID })
  return { baselineHash }
}
function stripProvenance(data: Record<string, any>) {
  const next = { ...data }
  for (const key of ['sourceDeliveryRef', 'sourcePrototypeRef', 'sourceArtifactRef', 'sourceBaselineRef', 'intakeQualification', 'intakeQualificationAt']) delete next[key]
  return next
}
async function doHandoff(actorLabel: string) {
  const baseline = await readObject('ModelBaseline', BASELINE_ID)
  if (!baseline || baseline.data.status !== '已冻结') throw new Error('基地基线尚未冻结')
  for (const mapping of [{ model: 'MD-01', artifact: 'ART-DP30-05' }, { model: 'MD-08', artifact: 'ART-DP30-09' }]) {
    const model = await readObject('ModelAsset', mapping.model); const artifact = await readObject('ModelArtifact', mapping.artifact)
    if (!model || !artifact) throw new Error(`映射对象缺失 ${mapping.model}/${mapping.artifact}`)
    await patchObject('ModelAsset', mapping.model, (d) => ({ ...d, sourceDeliveryRef: DELIVERY_ID, sourcePrototypeRef: PROTOTYPE_ID, sourceArtifactRef: mapping.artifact, sourceBaselineRef: BASELINE_ID, intakeQualification: 'G0/G1通过，可进入具体Intended Use的VV&A；不等同于已认可', intakeQualificationAt: nowIso() }))
    await patchObject('ModelArtifact', mapping.artifact, { promotedModelRef: mapping.model, promotionStatus: '已映射到试验 ModelAsset' })
  }
  const case01 = await readObject('DigitalTestCase', 'CASE-01')
  if (!case01) throw new Error('CASE-01 不存在')
  await patchObject('DigitalTestCase', 'CASE-01', (d) => ({ ...d, prototypeDeliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, prototypeBaselineRef: BASELINE_ID, modelProvenanceRefs: { 'MD-01': 'ART-DP30-05', 'MD-08': 'ART-DP30-09' }, intakeQualification: '3.0交付G0/G1完成；已进入VV&A/试验设计' }))
  await patchObject('IntakeGate', 'G2-DP30', { status: '已完成', decision: '通过', blockers: [], checkedAt: nowIso(), approvedBy: actorLabel, summary: '试验基地基线已冻结，关键运行模型已建立 ModelArtifact→ModelAsset 来源关系，并生成 Test Model Assembly / Test Environment Assembly，可进入 CASE-01 / VV&A。', note: 'G2-ENTRY PASS 仅表示可进入用途相关VV&A，不代表模型已经完成Validation/Accreditation。' })
  await patchObject('DigitalPrototypeDelivery', DELIVERY_ID, (d) => ({ ...d, status: '资格鉴定完成 · 已移交CASE-01', qualifiedAt: nowIso(), qualifiedBy: actorLabel, gates: { ...d.gates, G2: { ...d.gates.G2, status: '通过', scope: 'VV&A Entry' } } }))
  const assemblies = await createCase01InitialAssemblies()
  const environments = await createCase01InitialEnvironmentAssemblies()
  await patchObject('DigitalTestCase', 'CASE-01', { testModelAssemblies: assemblies, testEnvironmentAssemblies: environments })
  await patchObject('DigitalPrototype3', PROTOTYPE_ID, { status: '试验基地资格鉴定完成 · 进入试验鉴定', downstreamCaseRef: 'CASE-01', downstreamAssemblyRefs: Object.values(assemblies), downstreamEnvironmentRefs: [environments.base, environments.stress] })
  return { targetCase: 'CASE-01', baselineRef: BASELINE_ID, modelMappings: { 'ART-DP30-05': 'MD-01', 'ART-DP30-09': 'MD-08' }, assemblies, environments }
}

async function currentStepIndex() {
  const delivery = await readObject('DigitalPrototypeDelivery', DELIVERY_ID)
  if (!delivery?.data.custody || !(await hasExecutionSignature('receive-isolate'))) return 0
  const g0 = await readObject('IntakeGate', 'G0-DP30')
  if (g0?.data.decision !== '通过' || !(await hasExecutionSignature('g0-manifest'))) return 1
  const prototype = await readObject('DigitalPrototype3', PROTOTYPE_ID)
  if (!prototype?.data.routingSummary || !(await hasExecutionSignature('classify-route'))) return 2
  const g1 = await readObject('IntakeGate', 'G1-DP30')
  if (!['阻塞', '通过'].includes(String(g1?.data.decision)) || !(await hasExecutionSignature('g1-first-test'))) return 3
  if (g1?.data.decision !== '通过' || !(await hasExecutionSignature('remediate-retest'))) return 4
  const baseline = await readObject('ModelBaseline', BASELINE_ID)
  if (!baseline || baseline.data.status !== '已冻结' || !(await hasExecutionSignature('freeze-baseline'))) return 5
  const g2 = await readObject('IntakeGate', 'G2-DP30')
  if (g2?.data.decision !== '通过' || !(await hasExecutionSignature('qualify-handoff'))) return 6
  return 7
}

async function governanceRecords() {
  const approvals = (await listObjects('ApprovalRecord')).filter((x) => x.data.caseId === DP30_CASE_ID).map((x) => x.data)
  const signatures = (await listObjects('SignatureRecord')).filter((x) => x.data.caseId === DP30_CASE_ID).map((x) => ({ ...x.data, integrityValid: signatureIntegrityValid(x.data) }))
  return { approvals, signatures }
}

export async function getDp30State(actorId?: string | null) {
  await ensureDp30Ontology()
  const current = await currentStepIndex()
  const [delivery, prototype, manifest, gates, artifacts, contracts, tests, results, baseline, records] = await Promise.all([
    readObject('DigitalPrototypeDelivery', DELIVERY_ID), readObject('DigitalPrototype3', PROTOTYPE_ID), readObject('DeliveryManifest', MANIFEST_ID), listObjects('IntakeGate'), listObjects('ModelArtifact'), listObjects('InterfaceContract'), listObjects('ConformanceTest'), listObjects('ConformanceResult'), readObject('ModelBaseline', BASELINE_ID), governanceRecords(),
  ])
  const action = await db.actionType.findFirst({ where: { apiName: 'dp30IntakeTransition' } })
  const logs = action ? await db.actionLog.findMany({ where: { actionTypeId: action.id, objectPk: DELIVERY_ID }, orderBy: { createdAt: 'desc' }, take: 24 }) : []
  const currentGovernance = current < DP30_STEPS.length ? await getGovernance(DP30_STEPS[current].id, actorId) : null
  return {
    caseId: DP30_CASE_ID, delivery: delivery?.data ?? null, prototype: prototype?.data ?? null, manifest: manifest?.data ?? null, gates: gates.filter((x) => x.data.caseId === DP30_CASE_ID).map((x) => ({ pk: x.pk, title: x.title, ...x.data })),
    artifacts: artifacts.filter((x) => x.data.deliveryRef === DELIVERY_ID).map((x) => ({ pk: x.pk, title: x.title, ...x.data })), contracts: contracts.filter((x) => x.data.deliveryRef === DELIVERY_ID).map((x) => ({ pk: x.pk, title: x.title, ...x.data })),
    tests: tests.filter((x) => x.data.caseId === DP30_CASE_ID).map((x) => ({ pk: x.pk, title: x.title, ...x.data })), results: results.filter((x) => x.data.caseId === DP30_CASE_ID).map((x) => ({ pk: x.pk, title: x.title, ...x.data })), baseline: baseline?.data ?? null,
    currentStep: current, completed: current >= DP30_STEPS.length, actors: DP30_ACTORS, selectedActorId: actorId ?? null, governance: currentGovernance, approvals: records.approvals, signatures: records.signatures,
    steps: DP30_STEPS.map((step, index) => ({ ...step, index, policy: DP30_POLICIES[step.id], state: index < current ? 'done' : index === current ? 'current' : 'locked' })),
    logs: logs.map((x) => ({ id: x.id, performedBy: x.performedBy, createdAt: x.createdAt.toISOString(), parameters: JSON.parse(x.parametersJson || '{}') })),
    prototypeDataNotice: 'DEMO/SYNTHETIC：交付包、整改、符合性结果与签署均用于系统演示。G0/G1/G2-ENTRY 通过不代表装备性能达标，也不替代用途相关 VV&A。',
  }
}

export async function requestDp30Approval(stepId: Dp30StepId, actorId: string) { await ensureDp30Ontology(); await requestApproval(stepId, actorId); return getDp30State(actorId) }
export async function approveDp30Step(stepId: Dp30StepId, actorId: string) { await ensureDp30Ontology(); await approve(stepId, actorId); return getDp30State(actorId) }

export async function executeDp30Step(stepId: Dp30StepId, actorId: string) {
  await ensureDp30Ontology()
  const current = await currentStepIndex()
  if (current >= DP30_STEPS.length) throw new Error('数字样机3.0资格Case已完成；请先重置演示')
  const expected = DP30_STEPS[current]
  if (stepId !== expected.id) throw new Error(`动作越序：当前只能执行“${expected.label}”`)
  const actor = await assertExecution(stepId, actorId); const actorLabel = `${actor.title} · ${actor.name}`
  let result: any
  if (stepId === 'receive-isolate') result = await doReceive(actorLabel)
  else if (stepId === 'g0-manifest') result = await doG0(actorLabel)
  else if (stepId === 'classify-route') result = await doClassify()
  else if (stepId === 'g1-first-test') result = await doFirstTest()
  else if (stepId === 'remediate-retest') result = await doRetest()
  else if (stepId === 'freeze-baseline') result = await doFreezeBaseline(actorLabel)
  else result = await doHandoff(actorLabel)
  const executionSignature = await recordExecution(stepId, actor, { deliveryRef: DELIVERY_ID, stepId, result })
  await logTransition(stepId, `${expected.short}完成`, actorLabel, { resultDetail: result, executionSignatureRef: executionSignature.code })
  return getDp30State(actorId)
}

export async function resetDp30Demo() {
  await ensureDp30Ontology()
  await upsertObject('DigitalPrototypeDelivery', DELIVERY_ID, 'X9A 数字样机 3.0 交付批次', baseDelivery())
  await upsertObject('DigitalPrototype3', PROTOTYPE_ID, 'X9A 数字样机模型（3.0-交付）', basePrototype())
  await upsertObject('DeliveryManifest', MANIFEST_ID, 'X9A 数字样机 3.0 Manifest', baseManifest())
  for (const item of ARTIFACTS) await upsertObject('ModelArtifact', item.pk, item.title, { ...item, deliveryRef: DELIVERY_ID, prototypeRef: PROTOTYPE_ID, status: '随包提交 · 待核验', fileHash: sha256({ pk: item.pk, version: item.deliveryVersion, format: item.format }), conformanceStatus: '未测试', remediation: null })
  for (const item of CONTRACTS) await upsertObject('InterfaceContract', item.pk, item.title, { ...item, deliveryRef: DELIVERY_ID, status: '随包提交 · 待核验', conformanceStatus: '未测试' })
  for (const [pk, status, question] of [
    ['G0-DP30', '未执行', '交付给基地的数字样机3.0是否齐套、可识别、哈希一致？'],
    ['G1-DP30', '未执行', '运行类模型能否在基地环境按FMI/SAL/IDL契约运行和交互？'],
    ['G2-DP30', '未执行', '是否可形成基地基线并进入具体Intended Use的VV&A/试验设计？'],
  ]) await upsertObject('IntakeGate', pk, `${pk.startsWith('G0') ? 'G0 · Delivery Acceptance' : pk.startsWith('G1') ? 'G1 · Technical Conformance' : 'G2 · Qualification / VV&A Entry'}`, { code: pk, caseId: DP30_CASE_ID, gate: pk.slice(0, 2), question, status, blockers: [], decision: null, ...(pk.startsWith('G2') ? { note: 'G2-ENTRY通过不等于模型已完成VV&A认可。' } : {}) })
  for (const api of ['ConformanceTest', 'ConformanceResult', 'ModelBaseline']) await deleteCaseObjects(api, (d) => d.caseId === DP30_CASE_ID || d.sourceDeliveryRef === DELIVERY_ID)
  await clearCase01ReadinessReviews()
  await clearCase01AutomatedAdjudicationRecords()
  await clearCase01ExpertReviewRecords()
  await clearCase01RunDataQualityRecords()
  await clearCase01RunControlRecords()
  await clearCase01EnvironmentAssemblies()
  await clearCase01Assemblies()
  for (const api of ['ApprovalRecord', 'SignatureRecord']) await deleteCaseObjects(api, (d) => d.caseId === DP30_CASE_ID)
  for (const modelPk of ['MD-01', 'MD-08']) {
    const model = await readObject('ModelAsset', modelPk); if (model) await upsertObject('ModelAsset', modelPk, model.title, stripProvenance(model.data))
  }
  const case01 = await readObject('DigitalTestCase', 'CASE-01')
  if (case01) {
    const next = { ...case01.data }; for (const key of ['prototypeDeliveryRef', 'prototypeRef', 'prototypeBaselineRef', 'modelProvenanceRefs', 'intakeQualification', 'testModelAssemblies', 'testEnvironmentAssemblies']) delete next[key]
    await upsertObject('DigitalTestCase', 'CASE-01', case01.title, next)
  }
  const action = await ensureActionType(); await db.actionLog.deleteMany({ where: { actionTypeId: action.id, objectPk: DELIVERY_ID } })
  await logTransition('reset', '恢复到研制方已提交、基地待签收初态', '系统')
  return getDp30State()
}
