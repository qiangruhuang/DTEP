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
  code:
    | 'REL-TYPE-MISMATCH'
    | 'REL-CROSS-CASE'
    | 'REL-ROLE-NOT-ALLOWED'
    | 'REL-ROLE-CONFLICT'
    | 'REL-REUSE-AUTH-MISSING'
    | 'REL-REUSE-AUTH-MISMATCH'
    | 'REL-REUSE-AUTH-INACTIVE'
    | 'REL-REUSE-DOMAIN-MISMATCH'
    | 'REL-REUSE-PROVENANCE-INCOMPLETE'
  relationApiName: string
  targetPk: string
  detail: string
}

export type CrossCaseReuseTrace = {
  authorizationRef: string
  sourceCaseId: string
  targetCaseId: string
  relationApiName: string
  targetPk: string
  governanceRole: string | null
  provenanceRef: string
  sourceSnapshotRef: string
  requalificationTriggers: string[]
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
  crossCaseReuse: {
    authorizationCount: number
    acceptedReuseCount: number
    accepted: CrossCaseReuseTrace[]
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
  reuseAuthorizations: CaseRelationEntry[]
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
  caseHasReuseAuthorization: {
    bucket: 'reuseAuthorizations',
    targetType: 'EvidenceReuseAuthorization',
  },
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
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
  const rootData = parseJson(root.dataJson)

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

  const rawReuseAuthorizations = new Map<string, Record<string, any>>()
  for (const row of rows) {
    if (
      row.linkType.apiName === 'caseHasReuseAuthorization'
      && row.targetObject.objectType.apiName === 'EvidenceReuseAuthorization'
    ) {
      rawReuseAuthorizations.set(row.targetObject.pk, parseJson(row.targetObject.dataJson))
    }
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
    reuseAuthorizations: [],
  }
  const hardErrors: CaseRelationIntegrityIssue[] = []
  const accepted: Array<{ bucket: RelationBucket; item: CaseRelationEntry }> = []
  const acceptedReuse: CrossCaseReuseTrace[] = []
  const now = Date.now()

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

    if (apiName !== 'caseHasReuseAuthorization') {
      const ownershipKey = `${apiName}::${row.targetObjectId}`
      const otherOwners = foreignOwners.get(ownershipKey) ?? []
      const declaredCaseId = targetData.caseId
      const sourceCaseIds = new Set(
        otherOwners.map((owner) => owner.caseId).filter((ownerCaseId) => ownerCaseId !== caseId),
      )
      if (nonEmptyString(declaredCaseId) && declaredCaseId !== caseId) {
        sourceCaseIds.add(declaredCaseId)
      }

      if (sourceCaseIds.size > 0) {
        if (properties.sharedAcrossCases !== true) {
          hardErrors.push({
            code: 'REL-CROSS-CASE',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `${apiName} 指向其他 Case（${[...sourceCaseIds].sort().join(', ')}）的对象，且未声明受控跨 Case 复用`,
          })
          continue
        }

        const authorizationRef = properties.reuseAuthorizationRef
        if (!nonEmptyString(authorizationRef)) {
          hardErrors.push({
            code: 'REL-REUSE-AUTH-MISSING',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `${apiName}/${row.targetObject.pk} 声明跨 Case 复用，但缺少 reuseAuthorizationRef`,
          })
          continue
        }

        const authorization = rawReuseAuthorizations.get(authorizationRef)
        if (!authorization) {
          hardErrors.push({
            code: 'REL-REUSE-AUTH-MISSING',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `未找到接收 Case 关联的 EvidenceReuseAuthorization/${authorizationRef}`,
          })
          continue
        }

        const authorizedSource = authorization.sourceCaseId
        const authorizedRoleList = stringArray(authorization.allowedGovernanceRoles)
        const mismatch =
          !nonEmptyString(authorizedSource)
          || sourceCaseIds.size !== 1
          || !sourceCaseIds.has(authorizedSource)
          || authorization.targetCaseId !== caseId
          || authorization.sourceObjectType !== targetType
          || authorization.sourceObjectPk !== row.targetObject.pk
          || authorization.relationApiName !== apiName
          || (nonEmptyString(role) && !authorizedRoleList.includes(role))

        if (mismatch) {
          hardErrors.push({
            code: 'REL-REUSE-AUTH-MISMATCH',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `EvidenceReuseAuthorization/${authorizationRef} 与来源 Case、目标 Case、对象、关系或治理角色不一致`,
          })
          continue
        }

        const validFrom = Date.parse(String(authorization.validFrom ?? ''))
        const validTo = Date.parse(String(authorization.validTo ?? ''))
        const activeWindow =
          Number.isFinite(validFrom)
          && Number.isFinite(validTo)
          && validFrom <= now
          && now <= validTo
        if (
          authorization.status !== 'approved'
          || authorization.decision !== 'accept-for-reuse'
          || !activeWindow
        ) {
          hardErrors.push({
            code: 'REL-REUSE-AUTH-INACTIVE',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `EvidenceReuseAuthorization/${authorizationRef} 未批准、已撤销/过期或尚未生效`,
          })
          continue
        }

        const targetTaskTypes = stringArray(authorization.targetTaskTypes)
        const targetTaskType = rootData.taskType
        if (!nonEmptyString(targetTaskType) || !targetTaskTypes.includes(targetTaskType)) {
          hardErrors.push({
            code: 'REL-REUSE-DOMAIN-MISMATCH',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `EvidenceReuseAuthorization/${authorizationRef} 未覆盖当前 Case taskType=${targetTaskType ?? '未定义'}`,
          })
          continue
        }

        const requalificationTriggers = stringArray(authorization.requalificationTriggers)
        const provenanceComplete =
          nonEmptyString(authorization.equivalenceBasis)
          && nonEmptyString(authorization.provenanceRef)
          && nonEmptyString(authorization.sourceSnapshotRef)
          && nonEmptyString(authorization.sourceApprovedBy)
          && nonEmptyString(authorization.targetApprovedBy)
          && nonEmptyString(authorization.approvedAt)
          && requalificationTriggers.length > 0
        if (!provenanceComplete) {
          hardErrors.push({
            code: 'REL-REUSE-PROVENANCE-INCOMPLETE',
            relationApiName: apiName,
            targetPk: row.targetObject.pk,
            detail: `EvidenceReuseAuthorization/${authorizationRef} 缺少等效性依据、来源快照、双侧批准或重新鉴定触发条件`,
          })
          continue
        }

        acceptedReuse.push({
          authorizationRef,
          sourceCaseId: authorizedSource,
          targetCaseId: caseId,
          relationApiName: apiName,
          targetPk: row.targetObject.pk,
          governanceRole: nonEmptyString(role) ? role : null,
          provenanceRef: authorization.provenanceRef,
          sourceSnapshotRef: authorization.sourceSnapshotRef,
          requalificationTriggers,
        })
      }
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
      data: rootData,
    },
    relationCount: rows.length,
    integrity: {
      status: hardErrors.length ? 'invalid' : 'valid',
      acceptedRelationCount,
      rejectedRelationCount: rows.length - acceptedRelationCount,
      hardErrors,
    },
    crossCaseReuse: {
      authorizationCount: rawReuseAuthorizations.size,
      acceptedReuseCount: acceptedReuse.length,
      accepted: acceptedReuse,
    },
    ...buckets,
    datasets,
  }
}
