import { PrismaClient } from '@prisma/client'
import { buildChinaTeGovernanceSnapshot } from '../src/lib/china-te-governance'
import { sourceSnapshotDigest } from '../src/lib/case-ontology-context'

const db = new PrismaClient()

const SOURCE_CASE = 'CASE-01'
const TARGET_CASE = 'CASE-02'
const SOURCE_MODEL = 'MD-01'
const NATIVE_TARGET_MODEL = 'MD-RMS-01'
const TARGET_TASK_TYPE = 'reliability-maintainability-supportability'
const ROLE = 'formal-digital-model-review-input'
const AUTH_REF = 'REUSE-V234-PROPAGATION'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3.4 reuse propagation validation failed: ${message}`)
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

async function restoreLink(row: {
  id: string
  linkTypeId: string
  sourceObjectId: string
  targetObjectId: string
  propertiesJson: string
  sourceSystem: string
  sourceRef: string
  validFrom: Date | null
  validTo: Date | null
  createdAt: Date
}) {
  await db.linkEntry.create({ data: row })
}

async function setAuthorization(patch: Record<string, unknown>) {
  const auth = await object('EvidenceReuseAuthorization', AUTH_REF)
  const data = JSON.parse(auth.dataJson || '{}')
  await db.objectEntry.update({
    where: { id: auth.id },
    data: { dataJson: JSON.stringify({ ...data, ...patch }) },
  })
}

async function assertStalePropagation(
  expectedCode: string,
  expectedTargetPk = SOURCE_MODEL,
) {
  const snapshot = await buildChinaTeGovernanceSnapshot(TARGET_CASE)

  check(
    snapshot.transportability.integrity.status === 'valid',
    `${expectedCode}: lifecycle invalidation must not masquerade as ontology corruption`,
  )
  check(
    snapshot.transportability.crossCaseReuse.acceptedReuseCount === 0,
    `${expectedCode}: stale reuse must leave the trusted reuse set`,
  )
  check(
    snapshot.transportability.crossCaseReuse.staleReuseCount === 1,
    `${expectedCode}: exactly one stale reuse expected`,
  )
  const stale = snapshot.transportability.crossCaseReuse.stale[0]
  check(stale?.code === expectedCode, `${expectedCode}: stale reason code must be preserved`)
  check(stale?.targetPk === expectedTargetPk, `${expectedCode}: stale trace must preserve source evidence identity`)
  check(
    snapshot.transportability.semanticRoleCounts.formalDigitalModelReviewInputs === 0,
    `${expectedCode}: stale model must be removed from the governance-role evidence bucket`,
  )

  const criterion = snapshot.stateQualification.criteria.find((item) => item.id === 'SQ-DM')
  check(criterion?.status === 'blocked', `${expectedCode}: SQ-DM must become blocked`)
  check(
    criterion?.detail.includes(expectedCode),
    `${expectedCode}: SQ-DM must explain the reuse invalidation reason`,
  )

  const action = snapshot.actions.find((item) => item.apiName === 'submitStateQualificationReview')
  check(
    action?.blockers.some((blocker) => blocker.startsWith('SQ-DM：') && blocker.includes(expectedCode)),
    `${expectedCode}: stale reuse must propagate through SQ-DM into the governed action blocker`,
  )
}

async function main() {
  const baseline = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
  check(baseline.transportability.integrity.status === 'valid', 'CASE-02 baseline must be valid')
  check(baseline.transportability.crossCaseReuse.staleReuseCount === 0, 'baseline must have no stale reuse')

  const targetCase = await object('DigitalTestCase', TARGET_CASE)
  const nativeModel = await object('ModelAsset', NATIVE_TARGET_MODEL)
  const sourceModel = await object('ModelAsset', SOURCE_MODEL)
  const sourceData = JSON.parse(sourceModel.dataJson || '{}')
  const modelLinkType = await linkType('caseUsesModel')

  const nativeLink = await db.linkEntry.findFirst({
    where: {
      sourceObjectId: targetCase.id,
      targetObjectId: nativeModel.id,
      linkTypeId: modelLinkType.id,
    },
  })
  check(nativeLink, 'CASE-02 native digital-model relation missing')

  let authObjectId: string | null = null
  let authLinkId: string | null = null
  let reuseLinkId: string | null = null
  let nativeDetached = false
  const originalSourceDataJson = sourceModel.dataJson

  try {
    await db.linkEntry.delete({ where: { id: nativeLink.id } })
    nativeDetached = true

    const authType = await db.objectType.findUnique({ where: { apiName: 'EvidenceReuseAuthorization' } })
    check(authType, 'EvidenceReuseAuthorization missing; apply migrate_v233.py first')

    const authorization = await db.objectEntry.create({
      data: {
        objectTypeId: authType.id,
        pk: AUTH_REF,
        title: 'v2.3.4 复用失效传播验证授权',
        dataJson: JSON.stringify({
          code: AUTH_REF,
          sourceCaseId: SOURCE_CASE,
          targetCaseId: TARGET_CASE,
          sourceObjectType: 'ModelAsset',
          sourceObjectPk: SOURCE_MODEL,
          relationApiName: 'caseUsesModel',
          allowedGovernanceRoles: [ROLE],
          targetTaskTypes: [TARGET_TASK_TYPE],
          purpose: '验证已批准跨 Case 模型复用在来源变化后的自动失效传播',
          status: 'approved',
          decision: 'accept-for-reuse',
          equivalenceBasis: '仅复用来源模型的已认可 VV&A 输入，不继承来源 Case 的任务效能或最终鉴定结论。',
          provenanceRef: 'CASE-01/ModelAsset/MD-01/VV&A',
          sourceSnapshotRef: 'MD-01@FC-7.2#vva-approved',
          sourceSnapshotDigest: sourceSnapshotDigest(sourceData),
          sourceValidationDomain: String(sourceData.validationDomain ?? ''),
          sourceApprovedBy: 'SRC-VVA-AUTHORITY',
          targetApprovedBy: 'TGT-TE-AUTHORITY',
          approvedAt: '2026-09-28T00:00:00Z',
          validFrom: '2026-01-01T00:00:00Z',
          validTo: '2099-12-31T23:59:59Z',
          limitations: ['不得继承 CASE-01 最终鉴定结论'],
          requalificationTriggers: ['模型版本变化', '验证域变化', '授权撤销或过期'],
        }),
      },
    })
    authObjectId = authorization.id

    const authLinkType = await linkType('caseHasReuseAuthorization')
    const authLink = await db.linkEntry.create({
      data: {
        linkTypeId: authLinkType.id,
        sourceObjectId: targetCase.id,
        targetObjectId: authorization.id,
        propertiesJson: '{}',
        sourceSystem: 'v2.3.4-reuse-propagation-gate',
        sourceRef: 'v234-auth',
      },
    })
    authLinkId = authLink.id

    const reuseLink = await db.linkEntry.create({
      data: {
        linkTypeId: modelLinkType.id,
        sourceObjectId: targetCase.id,
        targetObjectId: sourceModel.id,
        propertiesJson: JSON.stringify({
          sharedAcrossCases: true,
          governanceRole: ROLE,
          reuseAuthorizationRef: AUTH_REF,
        }),
        sourceSystem: 'v2.3.4-reuse-propagation-gate',
        sourceRef: 'v234-evidence',
      },
    })
    reuseLinkId = reuseLink.id

    const accepted = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
    check(accepted.transportability.integrity.status === 'valid', 'approved reuse must keep ontology valid')
    check(accepted.transportability.crossCaseReuse.acceptedReuseCount === 1, 'approved reuse must be trusted')
    check(accepted.transportability.crossCaseReuse.staleReuseCount === 0, 'approved reuse must not be stale')
    check(
      accepted.transportability.semanticRoleCounts.formalDigitalModelReviewInputs === 1,
      'approved reused model must be the sole digital-model review input in this isolated gate',
    )
    const acceptedCriterion = accepted.stateQualification.criteria.find((item) => item.id === 'SQ-DM')
    check(acceptedCriterion?.status === 'partial', 'approved accredited reused model must support SQ-DM as partial')
    const acceptedAction = accepted.actions.find((item) => item.apiName === 'submitStateQualificationReview')
    check(
      !acceptedAction?.blockers.some((blocker) => blocker.startsWith('SQ-DM：')),
      'valid reused model must remove the SQ-DM blocker while other lifecycle blockers remain',
    )

    await setAuthorization({ status: 'revoked' })
    await assertStalePropagation('REUSE-AUTH-REVOKED')
    await setAuthorization({ status: 'approved' })

    await setAuthorization({ validTo: '2026-01-02T00:00:00Z' })
    await assertStalePropagation('REUSE-AUTH-EXPIRED')
    await setAuthorization({ validTo: '2099-12-31T23:59:59Z' })

    const versionDrift = { ...sourceData, version: `${sourceData.version ?? 'unknown'}-CHANGED` }
    await db.objectEntry.update({
      where: { id: sourceModel.id },
      data: { dataJson: JSON.stringify(versionDrift) },
    })
    await assertStalePropagation('REUSE-SOURCE-SNAPSHOT-CHANGED')
    await db.objectEntry.update({
      where: { id: sourceModel.id },
      data: { dataJson: originalSourceDataJson },
    })

    const domainDrift = {
      ...sourceData,
      validationDomain: `${sourceData.validationDomain ?? ''}；新增未授权扩展域`,
    }
    await db.objectEntry.update({
      where: { id: sourceModel.id },
      data: { dataJson: JSON.stringify(domainDrift) },
    })
    await assertStalePropagation('REUSE-SOURCE-DOMAIN-CHANGED')
    await db.objectEntry.update({
      where: { id: sourceModel.id },
      data: { dataJson: originalSourceDataJson },
    })

    const recovered = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
    check(recovered.transportability.crossCaseReuse.acceptedReuseCount === 1, 'restored source must reactivate reuse')
    check(recovered.transportability.crossCaseReuse.staleReuseCount === 0, 'restored source must clear stale state')
    check(
      recovered.stateQualification.criteria.find((item) => item.id === 'SQ-DM')?.status === 'partial',
      'restored source must recover dependent criterion',
    )
  } finally {
    await db.objectEntry.update({
      where: { id: sourceModel.id },
      data: { dataJson: originalSourceDataJson },
    }).catch(() => undefined)

    if (reuseLinkId) {
      await db.linkEntry.delete({ where: { id: reuseLinkId } }).catch(() => undefined)
    }
    if (authLinkId) {
      await db.linkEntry.delete({ where: { id: authLinkId } }).catch(() => undefined)
    }
    if (authObjectId) {
      await db.objectEntry.delete({ where: { id: authObjectId } }).catch(() => undefined)
    }
    if (nativeDetached) {
      await restoreLink(nativeLink).catch(() => undefined)
    }
  }

  const restoredBaseline = await buildChinaTeGovernanceSnapshot(TARGET_CASE)
  check(restoredBaseline.transportability.integrity.status === 'valid', 'baseline graph must be restored')
  check(
    restoredBaseline.objectCoverage.models === baseline.objectCoverage.models,
    'native CASE-02 model coverage must be restored',
  )
  check(
    restoredBaseline.transportability.crossCaseReuse.acceptedReuseCount === 0
      && restoredBaseline.transportability.crossCaseReuse.staleReuseCount === 0,
    'temporary reuse lifecycle state must be fully removed',
  )

  console.log(JSON.stringify({
    overall: 'PASS',
    gate: 'v2.3.4 Reuse Revocation & Change-Propagation Gate',
    transitions: [
      'approved reuse -> trusted evidence -> SQ-DM partial',
      'authorization revoked -> stale reuse -> evidence removed -> SQ-DM blocked -> action blocker',
      'authorization expired -> stale reuse -> evidence removed -> SQ-DM blocked -> action blocker',
      'source object version/content changed -> digest drift -> stale reuse -> criterion/action propagation',
      'source validation domain changed -> domain drift -> stale reuse -> criterion/action propagation',
      'source/auth state restored -> reuse reactivated -> criterion recovered',
    ],
    invariants: [
      'lifecycle invalidation is distinct from ontology corruption',
      'stale reused evidence never remains in trusted semantic-role buckets',
      'change propagation is derived from evidence removal, not case-specific action branches',
      'content-addressed source snapshots detect unannounced source changes',
      'restoring the exact authorized source state recovers the dependent criterion',
    ],
  }, null, 2))
}

main().finally(() => db.$disconnect())
