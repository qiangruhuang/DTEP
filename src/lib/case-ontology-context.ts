import { db } from '@/lib/db'

export type CaseRelationEntry = {
  id: string
  pk: string
  title: string
  data: Record<string, any>
  relation: {
    apiName: string
    properties: Record<string, any>
    sourceRef: string
  }
}

export type CaseRelationIntegrityIssue = {
  code: 'REL-TYPE-MISMATCH' | 'REL-CROSS-CASE' | 'REL-ROLE-NOT-ALLOWED' | 'REL-ROLE-CONFLICT'
  relationApiName: string
  targetPk: string
  detail: string
}

export type CaseOntologyContext = {
  currentCase: {
    id: string
    pk: string
    title: string
    data: Record<string, any>
  }
  relationCount: number
  integrity: {
    status: 'valid' | 'invalid'
    acceptedRelationCount: number
    rejectedRelationCount: number
    hardErrors: CaseRelationIntegrityIssue[]
  }
  missionThreads: CaseRelationEntry[]
  scenarios: CaseRelationEntry[]
  events: CaseRelationEntry[]
  measures: CaseRelationEntry[]
  models: CaseRelationEntry[]
  evidenceGates: CaseRelationEntry[]
  runs: CaseRelationEntry[]
  evidencePackages: CaseRelationEntry[]
  deficiencies: CaseRelationEntry[]
  reports: CaseRelationEntry[]
  modelBaselines: CaseRelationEntry[]
  assemblies: CaseRelationEntry[]
  interfaces: CaseRelationEntry[]
  datasets: Array<{
    path: string
    name: string
    domain: string
    origin: string
    qualityScore: number
  }>
}

const CASE_RELATION_CONTRACTS = {
  caseUsesMissionThread: { bucket: 'missionThreads', targetType: 'MissionThread' },
  caseUsesScenario: { bucket: 'scenarios', targetType: 'TestScenario' },
  caseUsesEvent: {
    bucket: 'events',
    targetType: 'TestEvent',
    governanceRoles: ['qualification-performance-anchor', 'operational-evidence-anchor'],
  },
  caseAssessesMeasure: {
    bucket: 'measures',
    targetType: 'Measure',
    governanceRoles: ['qualification-performance-measure', 'operational-effectiveness-measure'],
  },
  caseUsesModel: {
    bucket: 'models',
    targetType: 'ModelAsset',
    governanceRoles: ['formal-digital-model-review-input'],
  },
  caseControlledByGate: { bucket: 'evidenceGates', targetType: 'EvidenceGate' },
  caseHasRun: { bucket: 'runs', targetType: 'TestRun' },
  caseHasEvidencePackage: { bucket: 'evidencePackages', targetType: 'EvidencePackage' },
  caseHasDeficiency: { bucket: 'deficiencies', targetType: 'Deficiency' },
  caseHasReport: { bucket: 'reports', targetType: 'Report' },
  caseUsesModelBaseline: { bucket: 'modelBaselines', targetType: 'ModelBaseline' },
  caseUsesModelAssembly: { bucket: 'assemblies', targetType: 'TestModelAssembly' },
  caseUsesInterfaceContract: { bucket: 'interfaces', targetType: 'InterfaceContract' },
} as const

type RelationApiName = keyof typeof CASE_RELATION_CONTRACTS
type RelationBucket = (typeof CASE_RELATION_CONTRACTS)[RelationApiName]['bucket']

function parseJson(value: string | null | undefined) {
  try {
    return JSON.parse(value || '{}') as Record<string, any>
  } catch {
    return {}
  }
}

function serializeRelated(row: any, properties: Record<string, any>): CaseRelationEntry {
  return {
    id: row.targetObject.id,
    pk: row.targetObject.pk,
    title: row.targetObject.title,
    data: parseJson(row.targetObject.dataJson),
    relation: {
      apiName: row.linkType.apiName,
      properties,
      sourceRef: row.sourceRef,
    },
  }
}

export function governanceRole(items: CaseRelationEntry[], role: string) {
  return items.filter((item) => item.relation.properties.governanceRole === role)
}

export async function resolveCaseOntologyContext(caseId: string): Promise<CaseOntologyContext> {
  const caseType = await db.objectType.findUnique({ where: { apiName: 'DigitalTestCase' } })
  if (!caseType) throw new Error('DigitalTestCase Ontology 类型不存在')

  const root = await db.objectEntry.findUnique({
    where: { objectTypeId_pk: { objectTypeId: caseType.id, pk: caseId } },
  })
  if (!root) throw new Error(`DigitalTestCase/${caseId} 不存在`)

  const relationNames = Object.keys(CASE_RELATION_CONTRACTS)
  const rows = await db.linkEntry.findMany({
    where: {
      sourceObjectId: root.id,
      linkType: { apiName: { in: relationNames } },
    },
    include: {
      linkType: true,
      targetObject: { include: { objectType: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const targetIds = [...new Set(rows.map((row) => row.targetObjectId))]
  const foreignCaseLinks = targetIds.length
    ? await db.linkEntry.findMany({
        where: {
          targetObjectId: { in: targetIds },
          sourceObjectId: { not: root.id },
          linkType: { apiName: { in: relationNames } },
          sourceObject: { objectTypeId: caseType.id },
        },
        include: {
          linkType: true,
          sourceObject: true,
        },
      })
    : []

  const foreignOwners = new Map<string, Array<{ caseId: string; properties: Record<string, any> }>>()
  for (const link of foreignCaseLinks) {
    const key = `${link.linkType.apiName}::${link.targetObjectId}`
    const owners = foreignOwners.get(key) ?? []
    owners.push({
      caseId: link.sourceObject.pk,
      properties: parseJson(link.propertiesJson),
    })
    foreignOwners.set(key, owners)
  }

  const buckets: Record<RelationBucket, CaseRelationEntry[]> = {
    missionThreads: [],
    scenarios: [],
    events: [],
    measures: [],
    models: [],
    evidenceGates: [],
    runs: [],
    evidencePackages: [],
    deficiencies: [],
    reports: [],
    modelBaselines: [],
    assemblies: [],
    interfaces: [],
  }
  const hardErrors: CaseRelationIntegrityIssue[] = []
  const accepted: Array<{ bucket: RelationBucket; item: CaseRelationEntry }> = []

  for (const row of rows) {
    const apiName = row.linkType.apiName as RelationApiName
    const contract = CASE_RELATION_CONTRACTS[apiName]
    if (!contract) continue

    const targetData = parseJson(row.targetObject.dataJson)
    const properties = parseJson(row.propertiesJson)
    const targetType = row.targetObject.objectType.apiName

    if (targetType !== contract.targetType) {
      hardErrors.push({
        code: 'REL-TYPE-MISMATCH',
        relationApiName: apiName,
        targetPk: row.targetObject.pk,
        detail: `${apiName} 期望目标类型 ${contract.targetType}，实际为 ${targetType}`,
      })
      continue
    }

    const declaredCaseId = targetData.caseId
    if (typeof declaredCaseId === 'string' && declaredCaseId && declaredCaseId !== caseId) {
      hardErrors.push({
        code: 'REL-CROSS-CASE',
        relationApiName: apiName,
        targetPk: row.targetObject.pk,
        detail: `${apiName} 指向显式归属于 ${declaredCaseId} 的对象，不能作为 ${caseId} 的治理证据`,
      })
      continue
    }

    const ownershipKey = `${apiName}::${row.targetObjectId}`
    const otherOwners = foreignOwners.get(ownershipKey) ?? []
    const currentExplicitlyShared = properties.sharedAcrossCases === true
    const foreignExplicitlyShared = otherOwners.length > 0
      && otherOwners.every((owner) => owner.properties.sharedAcrossCases === true)
    if (otherOwners.length > 0 && !(currentExplicitlyShared && foreignExplicitlyShared)) {
      hardErrors.push({
        code: 'REL-CROSS-CASE',
        relationApiName: apiName,
        targetPk: row.targetObject.pk,
        detail: `${apiName} 的目标对象同时被其他 Case（${otherOwners.map((owner) => owner.caseId).sort().join(', ')}）引用；未形成双方显式 sharedAcrossCases 许可`,
      })
      continue
    }

    const role = properties.governanceRole
    const allowedRoles = 'governanceRoles' in contract ? contract.governanceRoles : undefined
    if (typeof role === 'string' && (!allowedRoles || !(allowedRoles as readonly string[]).includes(role))) {
      hardErrors.push({
        code: 'REL-ROLE-NOT-ALLOWED',
        relationApiName: apiName,
        targetPk: row.targetObject.pk,
        detail: `${apiName} 不允许 governanceRole=${role}`,
      })
      continue
    }

    accepted.push({
      bucket: contract.bucket,
      item: serializeRelated(row, properties),
    })
  }

  const rolesByTarget = new Map<string, Set<string>>()
  for (const { item } of accepted) {
    const role = item.relation.properties.governanceRole
    if (typeof role !== 'string' || !role) continue
    const key = `${item.relation.apiName}::${item.id}`
    const roles = rolesByTarget.get(key) ?? new Set<string>()
    roles.add(role)
    rolesByTarget.set(key, roles)
  }

  const conflictedTargets = new Set<string>()
  for (const [key, roles] of rolesByTarget) {
    if (roles.size <= 1) continue
    conflictedTargets.add(key)
    const sample = accepted.find(({ item }) => `${item.relation.apiName}::${item.id}` === key)?.item
    if (!sample) continue
    hardErrors.push({
      code: 'REL-ROLE-CONFLICT',
      relationApiName: sample.relation.apiName,
      targetPk: sample.pk,
      detail: `${sample.pk} 同时绑定互斥治理角色：${[...roles].sort().join(' / ')}`,
    })
  }

  const dedupe = new Set<string>()
  let acceptedRelationCount = 0
  for (const { bucket, item } of accepted) {
    const role = item.relation.properties.governanceRole ?? ''
    const semanticRole = item.relation.properties.semanticRole ?? ''
    const identity = `${item.relation.apiName}::${item.id}::${role}::${semanticRole}`
    const conflictKey = `${item.relation.apiName}::${item.id}`
    if (conflictedTargets.has(conflictKey) || dedupe.has(identity)) continue
    dedupe.add(identity)
    buckets[bucket].push(item)
    acceptedRelationCount += 1
  }

  const datasetRefs = new Set<string>()
  for (const item of [...buckets.runs, ...buckets.evidencePackages]) {
    for (const key of ['inputDatasetRefs', 'outputDatasetRefs', 'datasetRefs']) {
      const values = item.data[key]
      if (!Array.isArray(values)) continue
      for (const value of values) if (typeof value === 'string') datasetRefs.add(value)
    }
  }

  const datasets = datasetRefs.size
    ? await db.testDataset.findMany({
        where: { path: { in: [...datasetRefs] } },
        select: { path: true, name: true, domain: true, origin: true, qualityScore: true },
        orderBy: { path: 'asc' },
      })
    : []

  return {
    currentCase: {
      id: root.id,
      pk: root.pk,
      title: root.title,
      data: parseJson(root.dataJson),
    },
    relationCount: rows.length,
    integrity: {
      status: hardErrors.length ? 'invalid' : 'valid',
      acceptedRelationCount,
      rejectedRelationCount: rows.length - acceptedRelationCount,
      hardErrors,
    },
    ...buckets,
    datasets,
  }
}
