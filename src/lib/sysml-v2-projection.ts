import { db } from '@/lib/db'
import { sysmlV2, type SysmlRecord } from '@/lib/sysml-v2-client'

const TYPE_MAP: Record<string, string> = {
  PartDefinition: 'SUT',
  PartUsage: 'SUT',
  InterfaceDefinition: 'InterfaceContract',
  InterfaceUsage: 'InterfaceContract',
  PortDefinition: 'InterfaceContract',
  PortUsage: 'InterfaceContract',
  AnalysisCaseDefinition: 'ModelAsset',
  AnalysisCaseUsage: 'ModelAsset',
  CalculationDefinition: 'ModelAsset',
  CalculationUsage: 'ModelAsset',
  RequirementDefinition: 'TestRequirement',
  RequirementUsage: 'TestRequirement',
  VerificationCaseDefinition: 'DigitalTestCase',
  VerificationCaseUsage: 'DigitalTestCase',
}

const TYPE_META: Record<string, { displayName: string; description: string; icon: string }> = {
  SUT: { displayName: '被试系统', description: '接受试验鉴定的系统/分系统语义对象', icon: 'plane' },
  InterfaceContract: { displayName: '接口契约', description: '模型/系统接口与连接契约', icon: 'box' },
  ModelAsset: { displayName: '模型资产', description: '可用于试验分析或执行的模型资产', icon: 'cpu' },
  TestRequirement: { displayName: '试验需求', description: '从 SysML v2 投影的、需要被试验验证的系统需求', icon: 'target' },
  DigitalTestCase: { displayName: '数字化试验鉴定 Case', description: '面向验证问题的数字化试验鉴定对象', icon: 'target' },
}

const PROVENANCE_PROPERTIES = [
  ['sourceSystem', '来源系统', 'string'],
  ['sysmlProjectId', 'SysML Project ID', 'string'],
  ['sysmlCommitId', 'SysML Commit ID', 'string'],
  ['sysmlElementId', 'SysML Element ID', 'string'],
  ['sysmlElementType', 'SysML Element Type', 'string'],
  ['sourceQualifiedName', '源限定名', 'string'],
] as const

function recordId(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') return String(value['@id'] ?? value.id ?? value.identity?.id ?? '') || null
  return null
}

function elementType(element: SysmlRecord): string {
  const raw = element['@type'] ?? element.type ?? element.elementType ?? ''
  if (Array.isArray(raw)) return String(raw[raw.length - 1] ?? '')
  return String(raw)
}

function elementName(element: SysmlRecord, fallback: string) {
  return String(element.declaredName ?? element.name ?? element.shortName ?? element.qualifiedName ?? fallback)
}

function qualifiedName(element: SysmlRecord) {
  return String(element.qualifiedName ?? element.declaredName ?? element.name ?? '')
}

function referenceIds(value: any): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap(referenceIds))]
  const id = recordId(value)
  return id ? [id] : []
}

export function projectionTargetForElement(element: SysmlRecord): string | null {
  return TYPE_MAP[elementType(element)] ?? null
}

export function projectionLinkApiName(sourceType: string, targetType: string) {
  if (sourceType === 'TestRequirement' && targetType === 'DigitalTestCase') return 'requirementVerifiedBy'
  if (sourceType === 'TestRequirement' && targetType === 'SUT') return 'requirementAllocatedTo'
  if (sourceType === 'SUT' && targetType === 'InterfaceContract') return 'sutHasInterface'
  if (sourceType === 'ModelAsset' && targetType === 'SUT') return 'modelRepresentsSut'
  if (sourceType === 'SUT' && targetType === 'SUT') return 'decomposesTo'
  return `sysmlTrace_${sourceType}_${targetType}`
}

async function ensureObjectType(apiName: string) {
  const meta = TYPE_META[apiName]
  if (!meta) throw new Error(`未定义投影 ObjectType: ${apiName}`)
  let objectType = await db.objectType.findUnique({ where: { apiName }, include: { properties: true } })
  if (!objectType) {
    objectType = await db.objectType.create({
      data: { apiName, displayName: meta.displayName, description: meta.description, icon: meta.icon },
      include: { properties: true },
    })
  }
  const existing = new Set(objectType.properties.map((p) => p.apiName))
  for (const [propApiName, displayName, dataType] of PROVENANCE_PROPERTIES) {
    if (!existing.has(propApiName)) {
      await db.propertyDef.create({ data: { objectTypeId: objectType.id, apiName: propApiName, displayName, dataType } })
    }
  }
  return objectType
}

async function ensureLinkType(apiName: string, sourceTypeId: string, targetTypeId: string) {
  const existing = await db.linkType.findFirst({ where: { apiName, sourceTypeId, targetTypeId } })
  if (existing) return existing
  return db.linkType.create({
    data: {
      apiName,
      displayName: apiName.startsWith('sysmlTrace_') ? 'SysML 语义追踪' : apiName,
      sourceTypeId,
      targetTypeId,
      cardinality: '多对多',
    },
  })
}

function relationshipEnds(relationship: SysmlRecord) {
  const sources = referenceIds(relationship.source ?? relationship.sources ?? relationship.sourceElement)
  const targets = referenceIds(relationship.target ?? relationship.targets ?? relationship.targetElement)
  return { sources, targets }
}

export async function projectSysmlCommit(projectId: string, commitId: string, actorId: string) {
  const elements = await sysmlV2.listElements(projectId, commitId)
  const projected = elements
    .map((element) => ({ element, elementId: recordId(element), targetType: projectionTargetForElement(element) }))
    .filter((x): x is { element: SysmlRecord; elementId: string; targetType: string } => Boolean(x.elementId && x.targetType))

  const typeCache = new Map<string, any>()
  const objectByElementId = new Map<string, { entry: any; typeApiName: string; typeId: string }>()

  for (const item of projected) {
    let objectType = typeCache.get(item.targetType)
    if (!objectType) {
      objectType = await ensureObjectType(item.targetType)
      typeCache.set(item.targetType, objectType)
    }
    const pk = `SYSML:${projectId}:${commitId}:${item.elementId}`
    const data = {
      sourceSystem: 'sysml-v2',
      sysmlProjectId: projectId,
      sysmlCommitId: commitId,
      sysmlElementId: item.elementId,
      sysmlElementType: elementType(item.element),
      sourceQualifiedName: qualifiedName(item.element),
      sourcePayload: item.element,
    }
    const entry = await db.objectEntry.upsert({
      where: { objectTypeId_pk: { objectTypeId: objectType.id, pk } },
      create: { objectTypeId: objectType.id, pk, title: elementName(item.element, item.elementId), dataJson: JSON.stringify(data) },
      update: { title: elementName(item.element, item.elementId), dataJson: JSON.stringify(data), updatedAt: new Date() },
    })
    objectByElementId.set(item.elementId, { entry, typeApiName: item.targetType, typeId: objectType.id })
  }

  const relationshipById = new Map<string, SysmlRecord>()
  for (const elementId of objectByElementId.keys()) {
    const rows = await sysmlV2.listRelationships(projectId, commitId, elementId, 'both')
    for (const relationship of rows) {
      const id = recordId(relationship)
      if (id) relationshipById.set(id, relationship)
    }
  }

  let linkCount = 0
  for (const [relationshipId, relationship] of relationshipById) {
    const { sources, targets } = relationshipEnds(relationship)
    for (const sourceElementId of sources) {
      for (const targetElementId of targets) {
        const source = objectByElementId.get(sourceElementId)
        const target = objectByElementId.get(targetElementId)
        if (!source || !target || source.entry.id === target.entry.id) continue
        const apiName = projectionLinkApiName(source.typeApiName, target.typeApiName)
        const linkType = await ensureLinkType(apiName, source.typeId, target.typeId)
        const sourceRef = `${projectId}:${commitId}:${relationshipId}`
        await db.linkEntry.upsert({
          where: {
            linkTypeId_sourceObjectId_targetObjectId_sourceRef: {
              linkTypeId: linkType.id,
              sourceObjectId: source.entry.id,
              targetObjectId: target.entry.id,
              sourceRef,
            },
          },
          create: {
            linkTypeId: linkType.id,
            sourceObjectId: source.entry.id,
            targetObjectId: target.entry.id,
            sourceSystem: 'sysml-v2',
            sourceRef,
            propertiesJson: JSON.stringify({
              sysmlProjectId: projectId,
              sysmlCommitId: commitId,
              sysmlRelationshipId: relationshipId,
              sysmlRelationshipType: elementType(relationship),
              sourceElementId,
              targetElementId,
            }),
          },
          update: {
            propertiesJson: JSON.stringify({
              sysmlProjectId: projectId,
              sysmlCommitId: commitId,
              sysmlRelationshipId: relationshipId,
              sysmlRelationshipType: elementType(relationship),
              sourceElementId,
              targetElementId,
            }),
          },
        })
        linkCount += 1
      }
    }
  }

  await db.activityEvent.create({
    data: {
      actor: actorId,
      module: 'Ontology',
      message: `SysML v2 semantic projection ${projectId}@${commitId}: ${projected.length} objects / ${linkCount} links`,
    },
  })

  return {
    source: { standard: 'OMG Systems Modeling API and Services 1.0', projectId, commitId },
    fetchedElements: elements.length,
    projectedObjects: projected.length,
    projectedLinks: linkCount,
    objectTypes: Object.fromEntries([...typeCache.keys()].map((key) => [key, [...objectByElementId.values()].filter((x) => x.typeApiName === key).length])),
  }
}
