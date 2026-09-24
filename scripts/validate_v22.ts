import { PrismaClient } from '@prisma/client'
import { projectionLinkApiName, projectionTargetForElement } from '../src/lib/sysml-v2-projection'

const db = new PrismaClient()

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.2 validation failed: ${message}`)
}

class RollbackValidation extends Error {}

async function main() {
  check(projectionTargetForElement({ '@type': 'PartUsage' }) === 'SUT', 'PartUsage -> SUT')
  check(projectionTargetForElement({ '@type': 'InterfaceUsage' }) === 'InterfaceContract', 'InterfaceUsage -> InterfaceContract')
  check(projectionTargetForElement({ '@type': 'AnalysisCaseUsage' }) === 'ModelAsset', 'AnalysisCaseUsage -> ModelAsset')
  check(projectionTargetForElement({ '@type': 'RequirementUsage' }) === 'TestRequirement', 'RequirementUsage -> TestRequirement')
  check(projectionTargetForElement({ '@type': 'VerificationCaseUsage' }) === 'DigitalTestCase', 'VerificationCaseUsage -> DigitalTestCase')
  check(projectionTargetForElement({ '@type': 'Package' }) === null, 'unrelated SysML elements must not project')
  check(projectionLinkApiName('TestRequirement', 'DigitalTestCase') === 'requirementVerifiedBy', 'requirement verification link')

  const tables = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='LinkEntry'",
  )
  check(tables.length === 1, 'LinkEntry table exists after restore')

  try {
    await db.$transaction(async (tx) => {
      const sut = await tx.objectType.findUnique({ where: { apiName: 'SUT' } })
      const iface = await tx.objectType.findUnique({ where: { apiName: 'InterfaceContract' } })
      check(sut && iface, 'projection target ObjectTypes exist in frozen ontology')

      const suffix = Date.now().toString(36)
      const source = await tx.objectEntry.create({
        data: { objectTypeId: sut.id, pk: `__V22_SUT_${suffix}`, title: 'v2.2 validation source', dataJson: '{}' },
      })
      const target = await tx.objectEntry.create({
        data: { objectTypeId: iface.id, pk: `__V22_IF_${suffix}`, title: 'v2.2 validation target', dataJson: '{}' },
      })
      const linkType = await tx.linkType.create({
        data: { apiName: `__v22Link_${suffix}`, displayName: 'v2.2 validation link', sourceTypeId: sut.id, targetTypeId: iface.id },
      })
      const link = await tx.linkEntry.create({
        data: {
          linkTypeId: linkType.id,
          sourceObjectId: source.id,
          targetObjectId: target.id,
          sourceSystem: 'validation',
          sourceRef: suffix,
        },
      })
      check(link.createdAt instanceof Date, 'LinkEntry DateTime materializes through Prisma')

      const fetched = await tx.linkEntry.findUnique({
        where: {
          linkTypeId_sourceObjectId_targetObjectId_sourceRef: {
            linkTypeId: linkType.id,
            sourceObjectId: source.id,
            targetObjectId: target.id,
            sourceRef: suffix,
          },
        },
      })
      check(fetched?.id === link.id, 'LinkEntry compound identity is queryable')

      let duplicateRejected = false
      try {
        await tx.objectEntry.create({
          data: { objectTypeId: sut.id, pk: source.pk, title: 'duplicate must fail', dataJson: '{}' },
        })
      } catch (error) {
        duplicateRejected = (error as any)?.code === 'P2002'
      }
      check(duplicateRejected, 'ObjectEntry (objectTypeId, pk) uniqueness is enforced')
      throw new RollbackValidation()
    })
  } catch (error) {
    if (!(error instanceof RollbackValidation)) throw error
  }

  console.log('DTEP v2.2 validation PASS: graph hardening + deterministic SysML T&E projection')
}

main().finally(() => db.$disconnect())
