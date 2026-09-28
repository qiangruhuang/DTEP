import { PrismaClient } from '@prisma/client'
import { buildChinaTeGovernanceSnapshot } from '../src/lib/china-te-governance'

const db = new PrismaClient()
const SOURCE_CASE = 'CASE-01'
const TARGET_CASE = 'CASE-02'
const SOURCE_MODEL = 'MD-01'
const TARGET_TASK_TYPE = 'reliability-maintainability-supportability'
const ROLE = 'formal-digital-model-review-input'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3.3 reuse validation failed: ${message}`)
}

async function object(apiName: string, pk: string) {
  const type = await db.objectType.findUnique({ where: { apiName } })
  check(type, `missing ObjectType ${apiName}`)
  const entry = await db.objectEntry.findUnique({
    where: { objectTypeId_pk: { objectTypeId: type.id, pk } },
  })
  check(entry, `missing ${apiName}/${pk}`)
  return entry
}

async function linkType(apiName: string) {
  const row = await db.linkType.findFirst({ where: { apiName } })
  check(row, `missing LinkType ${apiName}`)
  return row
}

type AuthorizationPatch = Partial<{
  sourceCaseId: string
  targetCaseId: string
  sourceObjectType: string
  sourceObjectPk: string
  relationApiName: string
  allowedGovernanceRoles: string[]
  targetTaskTypes: string[]
  status: string
  decision: string
  equivalenceBasis: string
  provenanceRef: string
  sourceSnapshotRef: string
  sourceApprovedBy: string
  targetApprovedBy: string
  approvedAt: string
  validFrom: string
  validTo: string
  limitations: string[]
  requalificationTriggers: string[]
}>

async function createAuthorization(ref: string, patch: AuthorizationPatch = {}) {
  const type = await db.objectType.findUnique({ where: { apiName: 'EvidenceReuseAuthorization' } })
  check(type, 'EvidenceReuseAuthorization type must be installed by migrate_v233.py')

  const data = {
    code: ref,
    sourceCaseId: SOURCE_CASE,
    targetCaseId: TARGET_CASE,
    sourceObjectType: 'ModelAsset',
    sourceObjectPk: SOURCE_MODEL,
    relationApiName: 'caseUsesModel',
    allowedGovernanceRoles: [ROLE],
    targetTaskTypes: [TARGET_TASK_TYPE],
    purpose: '复用已认可的通用数字模型审验输入；不继承来源 Case 的最终鉴定结论',
    status: 'approved',
    decision: 'accept-for-reuse',
    equivalenceBasis: '目标 Case 仅复用模型已完成的 VV&A 结论；模型用途被限制为共同的数字模型审验输入，目标任务结论仍独立形成。',
    provenanceRef: 'CASE-01/ModelAsset/MD-01/VV&A',
    sourceSnapshotRef: 'MD-01@FC-7.2#vva-approved',
    sourceApprovedBy: 'SRC-VVA-AUTHORITY',
    targetApprovedBy: 'TGT-TE-AUTHORITY',
    approvedAt: '2026-09-28T00:00:00Z',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2099-12-31T23:59:59Z',
    limitations: ['仅复用模型 VV&A 状态与已验证域；不得继承 CASE-01 的任务效能结论'],
    requalificationTriggers: ['模型版本变化', '超出原验证域', '目标 intended use 改变'],
    ...patch,
  }

  return db.objectEntry.create({
    data: {
      objectTypeId: type.id,
      pk: ref,
      title: `跨 Case 复用授权 ${ref}`,
      dataJson: JSON.stringify(data),
    },
  })
}

async function linkAuthorization(caseId: string, authorizationPk: string, sourceRef: string) {
  const [caseObject, authorization, type] = await Promise.all([
    object('DigitalTestCase', caseId),
    object('EvidenceReuseAuthorization', authorizationPk),
    linkType('caseHasReuseAuthorization'),
  ])
  return db.linkEntry.create({
    data: {
      linkTypeId: type.id,
      sourceObjectId: caseObject.id,
      targetObjectId: authorization.id,
      propertiesJson: '{}',
      sourceSystem: 'v2.3.3-reuse-gate',
      sourceRef,
    },
  })
}

async function linkReusedModel(authorizationRef: string | null, sourceRef: string) {
  const [targetCase, model, type] = await Promise.all([
    object('DigitalTestCase', TARGET_CASE),
    object('ModelAsset', SOURCE_MODEL),
    linkType('caseUsesModel'),
  ])
  const properties: Record<string, unknown> = {
    sharedAcrossCases: true,
    governanceRole: ROLE,
  }
  if (authorizationRef) properties.reuseAuthorizationRef = authorizationRef
  return db.linkEntry.create({
    data: {
      linkTypeId: type.id,
      sourceObjectId: targetCase.id,
      targetObjectId: model.id,
      propertiesJson: JSON.stringify(properties),
      sourceSystem: 'v2.3.3-reuse-gate',
      sourceRef,
    },
  })
}

async function cleanup(ids: { links: string[]; objects: string[] }) {
  for (const id of ids.links.reverse()) {
    await db.linkEntry.delete({ where: { id } }).catch(() => undefined)
  }
  for (const id of ids.objects.reverse()) {
    await db.objectEntry.delete({ where: { id } }).catch(() => undefined)
  }
}

async function runScenario(
  name: string,
  patch: AuthorizationPatch | null,
  expectedCode: string | null,
  assertSnapshot?: (snapshot: Awaited<ReturnType<typeof buildChinaTeGovernanceSnapshot>>) => void,
) {
  const created = { links: [] as string[], objects: [] as string[] }
  const authorizationRef = patch === null && expectedCode === 'REL-REUSE-AUTH-MISSING'
    ? null
    : `REUSE-${name}`

  try {
    if (authorizationRef) {
      const auth = await createAuthorization(authorizationRef, patch ?? {})
      created.objects.push(auth.id)
      const authLink = await linkAuthorization(TARGET_CASE, authorizationRef, `v233-${name}-auth`)
      created.links.push(authLink.id)
    }

    const reuseLink = await linkReusedModel(authorizationRef, `v233-${name}-evidence`)
    created.links.push(reuseLink.id)

    const snapshot = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
    if (expectedCode) {
      check(snapshot.transportability.integrity.status === 'invalid', `${name}: invalid reuse must fail closed`)
      check(
        snapshot.transportability.integrity.hardErrors.some((issue) => issue.code === expectedCode),
        `${name}: expected ${expectedCode}`,
      )
      check(
        snapshot.actions.every((action) =>
          action.blockers.some((blocker) => blocker.includes(`ONTOLOGY-${expectedCode}`)),
        ),
        `${name}: integrity error must block every governed action`,
      )
    } else {
      check(snapshot.transportability.integrity.status === 'valid', `${name}: approved reuse must keep graph valid`)
    }
    assertSnapshot?.(snapshot)
  } finally {
    await cleanup(created)
  }
}

async function main() {
  const baseline = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
  check(baseline.transportability.integrity.status === 'valid', 'CASE-02 baseline graph must be valid')
  check(baseline.transportability.crossCaseReuse.acceptedReuseCount === 0, 'baseline must not contain cross-case reuse')

  await runScenario(
    'BARE-SHARED-FLAG',
    null,
    'REL-REUSE-AUTH-MISSING',
    (snapshot) => {
      check(snapshot.objectCoverage.models === baseline.objectCoverage.models, 'bare shared flag must not add model evidence')
    },
  )

  await runScenario(
    'CONTRACT-MISMATCH',
    { sourceObjectPk: 'WRONG-MODEL' },
    'REL-REUSE-AUTH-MISMATCH',
    (snapshot) => {
      check(snapshot.objectCoverage.models === baseline.objectCoverage.models, 'mismatched authorization must not add model evidence')
    },
  )

  await runScenario(
    'INACTIVE',
    { status: 'pending' },
    'REL-REUSE-AUTH-INACTIVE',
  )

  await runScenario(
    'DOMAIN-MISMATCH',
    { targetTaskTypes: ['air-combat-mission-effectiveness'] },
    'REL-REUSE-DOMAIN-MISMATCH',
  )

  await runScenario(
    'PROVENANCE-INCOMPLETE',
    { sourceSnapshotRef: '', requalificationTriggers: [] },
    'REL-REUSE-PROVENANCE-INCOMPLETE',
  )

  await runScenario(
    'APPROVED',
    {},
    null,
    (snapshot) => {
      check(
        snapshot.objectCoverage.models === baseline.objectCoverage.models + 1,
        'approved reuse must enter the receiving Case model evidence bucket',
      )
      check(
        snapshot.transportability.semanticRoleCounts.formalDigitalModelReviewInputs
          === baseline.transportability.semanticRoleCounts.formalDigitalModelReviewInputs + 1,
        'approved reuse must carry only its authorized governance role',
      )
      check(
        snapshot.transportability.crossCaseReuse.acceptedReuseCount === 1,
        'approved reuse must emit one auditable reuse trace',
      )
      const trace = snapshot.transportability.crossCaseReuse.accepted[0]
      check(trace?.sourceCaseId === SOURCE_CASE, 'reuse trace must preserve source Case')
      check(trace?.targetCaseId === TARGET_CASE, 'reuse trace must preserve target Case')
      check(trace?.targetPk === SOURCE_MODEL, 'reuse trace must preserve source object identity')
      check(Boolean(trace?.provenanceRef), 'reuse trace must preserve provenance')
      check(
        trace?.requalificationTriggers.length === 3,
        'reuse trace must preserve requalification boundaries',
      )
      check(
        snapshot.digitalModel.accreditedModelRefs.includes(SOURCE_MODEL),
        'underlying accredited model status may be reused after authorization',
      )
      const sqDm = snapshot.stateQualification.criteria.find((item) => item.id === 'SQ-DM')
      check(
        sqDm?.status === 'partial',
        'reuse authorization must not upgrade VV&A input into a formal equipment digital-model review conclusion',
      )
    },
  )

  const restored = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
  check(restored.transportability.integrity.status === 'valid', 'CASE-02 must be restored after reuse injections')
  check(restored.objectCoverage.models === baseline.objectCoverage.models, 'temporary reused model must be removed')
  check(restored.transportability.crossCaseReuse.acceptedReuseCount === 0, 'temporary reuse trace must be removed')

  console.log(JSON.stringify({
    overall: 'PASS',
    gate: 'v2.3.3 Governed Cross-Case Evidence Reuse Gate',
    scenarios: [
      'sharedAcrossCases without authorization -> rejected',
      'authorization/object contract mismatch -> rejected',
      'pending/inactive authorization -> rejected',
      'target task outside approved reuse domain -> rejected',
      'incomplete provenance or requalification boundary -> rejected',
      'approved bounded authorization -> accepted with provenance trace',
    ],
    invariants: [
      'cross-case reuse is opt-in and authorization-backed',
      'authorization must match source Case, target Case, object, relation, role and target task domain',
      'approved reuse preserves source snapshot and requalification triggers',
      'authorization permits evidence reuse but never upgrades the evidence quality or formal decision level',
      'rejected reuse never enters trusted evidence buckets',
    ],
  }, null, 2))
}

main().finally(() => db.$disconnect())
