import { PrismaClient } from '@prisma/client'
import { buildChinaTeGovernanceSnapshot } from '../src/lib/china-te-governance'

const db = new PrismaClient()

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3.2 negative transport validation failed: ${message}`)
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

async function insertNegativeLink(
  sourceCase: string,
  linkApiName: string,
  targetType: string,
  targetPk: string,
  sourceRef: string,
  properties: Record<string, unknown> = {},
) {
  const [source, target, type] = await Promise.all([
    object('DigitalTestCase', sourceCase),
    object(targetType, targetPk),
    linkType(linkApiName),
  ])
  return db.linkEntry.create({
    data: {
      linkTypeId: type.id,
      sourceObjectId: source.id,
      targetObjectId: target.id,
      sourceSystem: 'v2.3.2-negative-gate',
      sourceRef,
      propertiesJson: JSON.stringify(properties),
    },
  })
}

function hasIntegrityBlocker(
  snapshot: Awaited<ReturnType<typeof buildChinaTeGovernanceSnapshot>>,
  code: string,
) {
  return snapshot.actions.every((action) =>
    action.blockers.some((blocker) => blocker.includes(`ONTOLOGY-${code}`)),
  )
}

async function withInsertedLink<T>(
  create: () => Promise<{ id: string }>,
  run: () => Promise<T>,
) {
  const row = await create()
  try {
    return await run()
  } finally {
    await db.linkEntry.delete({ where: { id: row.id } })
  }
}

async function missingRelationGate() {
  const source = await object('DigitalTestCase', 'CASE-02')
  const event = await object('TestEvent', 'TE-RMS-001')
  const type = await linkType('caseUsesEvent')
  const relation = await db.linkEntry.findFirst({
    where: {
      sourceObjectId: source.id,
      targetObjectId: event.id,
      linkTypeId: type.id,
      propertiesJson: { contains: 'qualification-performance-anchor' },
    },
  })
  check(relation, 'CASE-02 qualification anchor relation missing before negative test')

  await db.linkEntry.delete({ where: { id: relation.id } })
  try {
    const snapshot = await buildChinaTeGovernanceSnapshot('CASE-02')
    check(snapshot.transportability.integrity.status === 'valid', 'missing relation is incompleteness, not graph corruption')
    const sqA = snapshot.stateQualification.criteria.find((item) => item.id === 'SQ-A')
    check(sqA?.status === 'blocked', 'missing qualification anchor must block SQ-A')
    const submit = snapshot.actions.find((item) => item.apiName === 'submitStateQualificationReview')
    check(
      submit?.blockers.some((blocker) => blocker.startsWith('SQ-A：')),
      'missing qualification anchor must propagate to state-qualification action blocker',
    )
  } finally {
    await db.linkEntry.create({
      data: {
        id: relation.id,
        linkTypeId: relation.linkTypeId,
        sourceObjectId: relation.sourceObjectId,
        targetObjectId: relation.targetObjectId,
        propertiesJson: relation.propertiesJson,
        sourceSystem: relation.sourceSystem,
        sourceRef: relation.sourceRef,
        validFrom: relation.validFrom,
        validTo: relation.validTo,
        createdAt: relation.createdAt,
      },
    })
  }
}

async function main() {
  const baseline01 = await buildChinaTeGovernanceSnapshot('CASE-01')
  const baseline02 = await buildChinaTeGovernanceSnapshot('CASE-02')
  check(baseline01.transportability.integrity.status === 'valid', 'CASE-01 baseline relation graph must be valid')
  check(baseline02.transportability.integrity.status === 'valid', 'CASE-02 baseline relation graph must be valid')

  await missingRelationGate()

  await withInsertedLink(
    () => insertNegativeLink(
      'CASE-02',
      'caseUsesEvent',
      'Measure',
      'M-RMS-01',
      'v232-negative-type-mismatch',
    ),
    async () => {
      const snapshot = await buildChinaTeGovernanceSnapshot('CASE-02')
      check(snapshot.transportability.integrity.status === 'invalid', 'type mismatch must invalidate relation graph')
      check(
        snapshot.transportability.integrity.hardErrors.some((item) => item.code === 'REL-TYPE-MISMATCH'),
        'type mismatch error must be explicit',
      )
      check(hasIntegrityBlocker(snapshot, 'REL-TYPE-MISMATCH'), 'type mismatch must hard-block every governed action')
    },
  )

  await withInsertedLink(
    () => insertNegativeLink(
      'CASE-01',
      'caseUsesModelBaseline',
      'ModelBaseline',
      'MB-RMS-01',
      'v232-negative-cross-case',
    ),
    async () => {
      const snapshot = await buildChinaTeGovernanceSnapshot('CASE-01')
      check(snapshot.transportability.integrity.status === 'invalid', 'cross-case relation must invalidate relation graph')
      check(
        snapshot.transportability.integrity.hardErrors.some((item) => item.code === 'REL-CROSS-CASE'),
        'cross-case contamination must be explicit',
      )
      check(hasIntegrityBlocker(snapshot, 'REL-CROSS-CASE'), 'cross-case contamination must hard-block every governed action')
      check(
        !snapshot.technicalState.currentModelBaselines.includes('MB-RMS-01'),
        'cross-case object must be excluded from accepted governance evidence',
      )
    },
  )

  await withInsertedLink(
    () => insertNegativeLink(
      'CASE-02',
      'caseUsesScenario',
      'TestScenario',
      'SC-RMS-BASE',
      'v232-negative-role-not-allowed',
      { governanceRole: 'qualification-performance-anchor' },
    ),
    async () => {
      const snapshot = await buildChinaTeGovernanceSnapshot('CASE-02')
      check(
        snapshot.transportability.integrity.hardErrors.some((item) => item.code === 'REL-ROLE-NOT-ALLOWED'),
        'role on unsupported relation must be rejected',
      )
      check(hasIntegrityBlocker(snapshot, 'REL-ROLE-NOT-ALLOWED'), 'unsupported role must hard-block every governed action')
    },
  )

  await withInsertedLink(
    () => insertNegativeLink(
      'CASE-02',
      'caseUsesEvent',
      'TestEvent',
      'TE-RMS-001',
      'v232-negative-role-conflict',
      { governanceRole: 'operational-evidence-anchor' },
    ),
    async () => {
      const snapshot = await buildChinaTeGovernanceSnapshot('CASE-02')
      check(
        snapshot.transportability.integrity.hardErrors.some((item) => item.code === 'REL-ROLE-CONFLICT'),
        'conflicting semantic roles must be explicit',
      )
      check(hasIntegrityBlocker(snapshot, 'REL-ROLE-CONFLICT'), 'role conflict must hard-block every governed action')
      check(
        snapshot.transportability.semanticRoleCounts.qualificationPerformanceAnchors === 0,
        'conflicted object must not remain trusted under its original role',
      )
      check(
        snapshot.transportability.semanticRoleCounts.operationalEvidenceAnchors === 1,
        'unrelated operational anchor must remain isolated from the conflicted object',
      )
    },
  )

  const restored01 = await buildChinaTeGovernanceSnapshot('CASE-01')
  const restored02 = await buildChinaTeGovernanceSnapshot('CASE-02')
  check(restored01.transportability.integrity.status === 'valid', 'CASE-01 graph must be restored after negative tests')
  check(restored02.transportability.integrity.status === 'valid', 'CASE-02 graph must be restored after negative tests')

  console.log(JSON.stringify({
    overall: 'PASS',
    gate: 'v2.3.2 Relation Completeness & Negative Transport Gate',
    negativeCases: [
      'missing required relation -> stage-specific fail closed',
      'target type mismatch -> global integrity blocker',
      'cross-case relation contamination -> global integrity blocker + evidence exclusion',
      'governance role on unsupported relation -> global integrity blocker',
      'conflicting governance roles on one target -> global integrity blocker + conflicted evidence exclusion',
    ],
    invariants: [
      'normal incompleteness is distinguishable from graph corruption',
      'corrupt relations never enter accepted evidence buckets',
      'cross-case evidence cannot improve another case governance state',
      'relation-integrity errors block every governed lifecycle action',
      'negative tests restore the baseline graph after injection',
    ],
  }, null, 2))
}

main().finally(() => db.$disconnect())
