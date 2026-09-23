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

export type CaseOntologyContext = {
  currentCase: {
    id: string
    pk: string
    title: string
    data: Record<string, any>
  }
  relationCount: number
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

const CASE_RELATIONS = {
  caseUsesMissionThread: 'missionThreads',
  caseUsesScenario: 'scenarios',
  caseUsesEvent: 'events',
  caseAssessesMeasure: 'measures',
  caseUsesModel: 'models',
  caseControlledByGate: 'evidenceGates',
  caseHasRun: 'runs',
  caseHasEvidencePackage: 'evidencePackages',
  caseHasDeficiency: 'deficiencies',
  caseHasReport: 'reports',
  caseUsesModelBaseline: 'modelBaselines',
  caseUsesModelAssembly: 'assemblies',
  caseUsesInterfaceContract: 'interfaces',
} as const

type RelationBucket = (typeof CASE_RELATIONS)[keyof typeof CASE_RELATIONS]

function parseJson(value: string | null | undefined) {
  try {
    return JSON.parse(value || '{}') as Record<string, any>
  } catch {
    return {}
  }
}

function serializeRelated(row: any): CaseRelationEntry {
  return {
    id: row.targetObject.id,
    pk: row.targetObject.pk,
    title: row.targetObject.title,
    data: parseJson(row.targetObject.dataJson),
    relation: {
      apiName: row.linkType.apiName,
      properties: parseJson(row.propertiesJson),
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

  const relationNames = Object.keys(CASE_RELATIONS)
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

  for (const row of rows) {
    const bucket = CASE_RELATIONS[row.linkType.apiName as keyof typeof CASE_RELATIONS]
    if (!bucket) continue
    buckets[bucket].push(serializeRelated(row))
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
    ...buckets,
    datasets,
  }
}
