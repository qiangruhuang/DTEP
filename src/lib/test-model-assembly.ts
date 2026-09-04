import { createHash } from 'crypto'
import { db } from '@/lib/db'

export const CASE01_BASE_ASSEMBLY = 'TMA-CASE01-BASE-v1'
export const CASE01_STRESS_ASSEMBLY_V1 = 'TMA-CASE01-STRESS-v1'
export const CASE01_STRESS_ASSEMBLY_V2 = 'TMA-CASE01-STRESS-v2'
export const DP30_BASELINE = 'BL-X9A-DP30-001'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
export function sha256(value: unknown) { return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}` }

async function objectType(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) throw new Error(`${apiName} 本体未初始化`)
  return t
}
async function ensureType(apiName: string, displayName: string, description: string, icon: string) {
  const existing = await db.objectType.findUnique({ where: { apiName } })
  return existing ?? db.objectType.create({ data: { apiName, displayName, description, icon } })
}
async function entry(apiName: string, pk: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return null
  const row = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (!row) return null
  return { ...row, data: JSON.parse(row.dataJson || '{}') as Record<string, any> }
}
async function upsert(apiName: string, pk: string, title: string, data: Record<string, any>) {
  const t = await objectType(apiName)
  const current = await db.objectEntry.findFirst({ where: { objectTypeId: t.id, pk } })
  if (current) return db.objectEntry.update({ where: { id: current.id }, data: { title, dataJson: JSON.stringify(data) } })
  const created = await db.objectEntry.create({ data: { objectTypeId: t.id, pk, title, dataJson: JSON.stringify(data) } })
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: { increment: 1 } } })
  return created
}
async function patch(apiName: string, pk: string, values: Record<string, any>) {
  const current = await entry(apiName, pk)
  if (!current) throw new Error(`${apiName}/${pk} 不存在`)
  return upsert(apiName, pk, current.title, { ...current.data, ...values })
}
async function link(apiName: string, displayName: string, sourceApi: string, targetApi: string) {
  if (await db.linkType.findFirst({ where: { apiName } })) return
  const [source, target] = await Promise.all([objectType(sourceApi), objectType(targetApi)])
  await db.linkType.create({ data: { apiName, displayName, sourceTypeId: source.id, targetTypeId: target.id, cardinality: '一对多' } })
}

export async function ensureTestModelAssemblyOntology() {
  await ensureType('TestModelAssembly', '试验模型装配', '面向某一试验场景冻结模型、数字样机3.0来源、接口契约与VV&A状态的模型装配对象。', 'boxes')
  for (const spec of [
    ['baselineInstantiatesAssembly', '基地基线—试验模型装配', 'ModelBaseline', 'TestModelAssembly'],
    ['assemblyUsesArtifact', '试验模型装配—3.0交付物', 'TestModelAssembly', 'ModelArtifact'],
    ['assemblyUsesModel', '试验模型装配—试验模型', 'TestModelAssembly', 'ModelAsset'],
    ['assemblyUsesContract', '试验模型装配—接口契约', 'TestModelAssembly', 'InterfaceContract'],
    ['scenarioUsesAssembly', '试验场景—模型装配', 'TestScenario', 'TestModelAssembly'],
    ['runUsesAssembly', '试验Run—模型装配', 'TestRun', 'TestModelAssembly'],
    ['runUsesPrototypeBaseline', '试验Run—数字样机基地基线', 'TestRun', 'ModelBaseline'],
  ] as const) await link(...spec)
}

function modelIdFromSnapshot(value: string) { return value.split('@')[0] }
function modelVersionFromSnapshot(value: string) { return value.includes('@') ? value.split('@').slice(1).join('@') : null }

function artifactContracts(baselineManifest: Record<string, any>, artifactRef: string | null) {
  if (!artifactRef) return []
  const contracts = Array.isArray(baselineManifest.contractSnapshots) ? baselineManifest.contractSnapshots : []
  return contracts
    .filter((c: any) => Array.isArray(c.data?.artifactRefs) && c.data.artifactRefs.includes(artifactRef))
    .map((c: any) => ({ contractRef: c.pk, kind: c.data.kind, version: c.data.version, conformanceStatus: c.data.conformanceStatus ?? c.data.status ?? null }))
}

function artifactSnapshot(baselineManifest: Record<string, any>, artifactRef: string | null) {
  if (!artifactRef) return null
  const artifacts = Array.isArray(baselineManifest.artifactSnapshots) ? baselineManifest.artifactSnapshots : []
  const art = artifacts.find((a: any) => a.pk === artifactRef)
  return art ? { pk: art.pk, title: art.title, data: art.data } : null
}

async function buildBinding(modelSnapshot: string, baseline: Record<string, any>) {
  const modelRef = modelIdFromSnapshot(modelSnapshot)
  const requestedVersion = modelVersionFromSnapshot(modelSnapshot)
  const model = await entry('ModelAsset', modelRef)
  if (!model) throw new Error(`Test Model Assembly 引用模型不存在：${modelRef}`)
  const artifactRef = model.data.sourceArtifactRef ?? null
  const fromPrototype = model.data.sourceBaselineRef === DP30_BASELINE && !!artifactRef
  const artSnapshot = artifactSnapshot(baseline.manifest ?? {}, artifactRef)
  return {
    modelRef,
    modelVersion: requestedVersion ?? model.data.version ?? null,
    currentModelVersion: model.data.version ?? null,
    role: model.data.category ?? model.data.type ?? '试验模型',
    sourceKind: fromPrototype ? 'DigitalPrototype3.0' : 'TestBaseModelLibrary',
    sourceDeliveryRef: fromPrototype ? model.data.sourceDeliveryRef ?? null : null,
    sourcePrototypeRef: fromPrototype ? model.data.sourcePrototypeRef ?? null : null,
    sourceBaselineRef: fromPrototype ? model.data.sourceBaselineRef ?? null : null,
    sourceArtifactRef: artifactRef,
    artifactSnapshot: artSnapshot,
    interfaceContracts: artifactContracts(baseline.manifest ?? {}, artifactRef),
    vvaSnapshot: {
      vvaStatus: model.data.vvaStatus ?? null,
      verification: model.data.verification ?? null,
      validation: model.data.validation ?? null,
      accreditation: model.data.accreditation ?? null,
      intendedUse: model.data.intendedUse ?? null,
      validationDomain: model.data.validationDomain ?? null,
      limitations: model.data.limitations ?? [],
      lastReviewed: model.data.lastReviewed ?? null,
    },
  }
}

async function buildAssembly(pk: string, title: string, scenarioRef: string, revision: string, readiness: string) {
  await ensureTestModelAssemblyOntology()
  const baseline = await entry('ModelBaseline', DP30_BASELINE)
  if (!baseline || baseline.data.status !== '已冻结') throw new Error('试验模型装配前必须存在已冻结的数字样机3.0基地基线')
  const scenario = await entry('TestScenario', scenarioRef)
  if (!scenario) throw new Error(`Scenario 不存在：${scenarioRef}`)
  const models = Array.isArray(scenario.data.models) ? scenario.data.models.map(String) : []
  if (scenarioRef === 'SC-COA-01' && !models.some((x: string) => x.startsWith('MD-05@'))) {
    const threat = await entry('ModelAsset', 'MD-05')
    if (threat) models.push(`MD-05@${threat.data.version ?? 'current'}`)
  }
  if (!models.length) throw new Error(`${scenarioRef} 没有模型配置`)
  const bindings = await Promise.all(models.map((m: string) => buildBinding(m, baseline.data)))
  const directArtifactRefs = Array.from(new Set(bindings.map((b) => b.sourceArtifactRef).filter(Boolean)))
  const contractRefs = Array.from(new Set(bindings.flatMap((b) => b.interfaceContracts.map((c: any) => c.contractRef))))
  const supportArtifactRefs = scenarioRef === 'SC-COA-01' ? ['ART-DP30-02', 'ART-DP30-04', 'ART-DP30-10'] : ['ART-DP30-02', 'ART-DP30-04']
  const manifest = {
    schema: 'dtep/test-model-assembly/v2.0b',
    caseId: 'CASE-01', scenarioRef, revision,
    prototypeBaselineRef: DP30_BASELINE,
    prototypeBaselineHash: baseline.data.baselineHash,
    modelBindings: bindings,
    directArtifactRefs,
    supportArtifactRefs,
    contractRefs,
  }
  const assemblyHash = sha256(manifest)
  const data = {
    code: pk, caseId: 'CASE-01', scenarioRef, revision, status: readiness,
    prototypeDeliveryRef: baseline.data.sourceDeliveryRef,
    prototypeRef: baseline.data.prototypeRef,
    prototypeBaselineRef: DP30_BASELINE,
    prototypeBaselineVersion: baseline.data.version,
    prototypeBaselineHash: baseline.data.baselineHash,
    modelBindings: bindings,
    directArtifactRefs, supportArtifactRefs, contractRefs,
    assemblyHash,
    manifest,
    mutable: !String(readiness).startsWith('已冻结'),
    provenancePolicy: 'Scenario引用当前Assembly；Run创建时冻结Assembly Snapshot，后续Assembly升级不追溯改写历史Run。',
  }
  await upsert('TestModelAssembly', pk, title, data)
  await patch('TestScenario', scenarioRef, {
    testModelAssemblyRef: pk,
    prototypeBaselineRef: DP30_BASELINE,
    prototypeBaselineHash: baseline.data.baselineHash,
    modelAssemblyHash: assemblyHash,
    modelAssemblyRevision: revision,
  })
  return data
}

export async function createCase01InitialAssemblies() {
  const base = await buildAssembly(CASE01_BASE_ASSEMBLY, 'CASE-01 基线场景试验模型装配 · v1', 'SC-BASE', 'v1', '已配置 · 用途相关VV&A状态继承模型当前状态')
  const stress = await buildAssembly(CASE01_STRESS_ASSEMBLY_V1, 'CASE-01 高压场景试验模型装配 · v1', 'SC-COA-01', 'v1', '已配置 · 高压VV&A尚未闭合')
  return { base: base.code, stress: stress.code }
}

export async function createCase01StressAssemblyV2() {
  return buildAssembly(CASE01_STRESS_ASSEMBLY_V2, 'CASE-01 高压场景试验模型装配 · v2', 'SC-COA-01', 'v2', '已冻结用于正式高压Run')
}

export async function bindRunToCurrentAssembly(runData: Record<string, any>) {
  await ensureTestModelAssemblyOntology()
  const scenario = await entry('TestScenario', String(runData.scenarioId ?? ''))
  if (!scenario) throw new Error(`Run 缺少有效 Scenario：${runData.scenarioId}`)
  const assemblyRef = scenario.data.testModelAssemblyRef
  if (!assemblyRef) throw new Error(`${runData.scenarioId} 尚未绑定 TestModelAssembly；不得创建来源不完整的正式 Run`)
  const assembly = await entry('TestModelAssembly', assemblyRef)
  if (!assembly) throw new Error(`TestModelAssembly/${assemblyRef} 不存在`)
  const usedModelIds = new Set((Array.isArray(runData.modelSnapshot) ? runData.modelSnapshot : []).map((x: any) => modelIdFromSnapshot(String(x))))
  const allBindings = Array.isArray(assembly.data.modelBindings) ? assembly.data.modelBindings : []
  const usedBindings = allBindings.filter((b: any) => usedModelIds.has(String(b.modelRef)))
  const missing = Array.from(usedModelIds).filter((id) => !usedBindings.some((b: any) => b.modelRef === id))
  if (missing.length) throw new Error(`Run 模型未纳入当前 TestModelAssembly：${missing.join(', ')}`)
  const artifactProvenanceRefs = Array.from(new Set(usedBindings.map((b: any) => b.sourceArtifactRef).filter(Boolean)))
  const interfaceContractRefs = Array.from(new Set(usedBindings.flatMap((b: any) => (b.interfaceContracts ?? []).map((c: any) => c.contractRef))))
  const assemblySnapshot = {
    pk: assembly.pk,
    title: assembly.title,
    assemblyHash: assembly.data.assemblyHash,
    revision: assembly.data.revision,
    scenarioRef: assembly.data.scenarioRef,
    prototypeBaselineRef: assembly.data.prototypeBaselineRef,
    prototypeBaselineVersion: assembly.data.prototypeBaselineVersion,
    prototypeBaselineHash: assembly.data.prototypeBaselineHash,
    modelBindings: usedBindings,
    supportArtifactRefs: assembly.data.supportArtifactRefs ?? [],
    interfaceContractRefs,
  }
  const provenanceManifest = {
    schema: 'dtep/run-model-provenance/v2.0b',
    testModelAssemblyRef: assembly.pk,
    assemblyHash: assembly.data.assemblyHash,
    prototypeBaselineRef: assembly.data.prototypeBaselineRef,
    prototypeBaselineHash: assembly.data.prototypeBaselineHash,
    artifactProvenanceRefs,
    interfaceContractRefs,
    modelBindings: usedBindings,
  }
  return {
    ...runData,
    testModelAssemblyRef: assembly.pk,
    testModelAssemblyHash: assembly.data.assemblyHash,
    prototypeBaselineRef: assembly.data.prototypeBaselineRef,
    prototypeBaselineVersion: assembly.data.prototypeBaselineVersion,
    prototypeBaselineHash: assembly.data.prototypeBaselineHash,
    artifactProvenanceRefs,
    interfaceContractRefs,
    modelBindingSnapshots: usedBindings,
    assemblySnapshot,
    modelProvenanceHash: sha256(provenanceManifest),
    provenanceBindingMode: 'frozen-at-run-creation',
  }
}

export async function clearCase01Assemblies() {
  const t = await db.objectType.findUnique({ where: { apiName: 'TestModelAssembly' } })
  if (t) {
    const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
    const selected = rows.filter((row) => {
      try { return JSON.parse(row.dataJson || '{}').caseId === 'CASE-01' } catch { return false }
    })
    for (const row of selected) await db.objectEntry.delete({ where: { id: row.id } })
    await db.objectType.update({ where: { id: t.id }, data: { objectCount: await db.objectEntry.count({ where: { objectTypeId: t.id } }) } })
  }
  for (const scenarioRef of ['SC-BASE', 'SC-COA-01']) {
    const scenario = await entry('TestScenario', scenarioRef)
    if (!scenario) continue
    const next = { ...scenario.data }
    for (const key of ['testModelAssemblyRef', 'prototypeBaselineRef', 'prototypeBaselineHash', 'modelAssemblyHash', 'modelAssemblyRevision']) delete next[key]
    await upsert('TestScenario', scenarioRef, scenario.title, next)
  }
}

export async function restoreCase01AssembliesIfBaselineAvailable() {
  const baseline = await entry('ModelBaseline', DP30_BASELINE)
  if (!baseline || baseline.data.status !== '已冻结') return null
  return createCase01InitialAssemblies()
}
