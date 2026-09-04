import { createHash } from 'crypto'
import { db } from '@/lib/db'

export const CASE01_BASE_ENV_V1 = 'TEA-CASE01-BASE-v1'
export const CASE01_STRESS_ENV_V1 = 'TEA-CASE01-STRESS-v1'
export const CASE01_STRESS_ENV_V2 = 'TEA-CASE01-STRESS-v2'
export const CASE01_BASE_FED_V1 = 'LVC-FED-CASE01-BASE-v1'
export const CASE01_STRESS_FED_V1 = 'LVC-FED-CASE01-STRESS-v1'
export const CASE01_STRESS_FED_V2 = 'LVC-FED-CASE01-STRESS-v2'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
function sha256(value: unknown) { return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}` }

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

export async function ensureTestEnvironmentOntology() {
  await ensureType('TestEnvironmentAssembly', '试验环境装配', '冻结一次数字/LVC/实装试验所需模型装配、Live/Virtual/Constructive节点、网关、时统、IDL Topic、网络与场区资源。', 'network')
  await ensureType('LVCFederationConfiguration', 'LVC联合试验联邦配置', '面向LVC联合试验冻结联邦节点、协议网关、时间管理、数据对象Topic Set与运行控制规则。', 'radio')
  for (const spec of [
    ['modelAssemblyFeedsEnvironment', '模型装配—试验环境装配', 'TestModelAssembly', 'TestEnvironmentAssembly'],
    ['environmentUsesFederation', '试验环境装配—LVC联邦配置', 'TestEnvironmentAssembly', 'LVCFederationConfiguration'],
    ['scenarioUsesEnvironment', '试验场景—试验环境装配', 'TestScenario', 'TestEnvironmentAssembly'],
    ['runUsesEnvironment', '试验Run—试验环境装配', 'TestRun', 'TestEnvironmentAssembly'],
    ['runUsesFederation', '试验Run—LVC联邦配置', 'TestRun', 'LVCFederationConfiguration'],
    ['federationUsesContract', 'LVC联邦配置—接口契约', 'LVCFederationConfiguration', 'InterfaceContract'],
  ] as const) await link(...spec)
}

function resourceCode(snapshot: unknown) { return String(snapshot ?? '').split('@')[0] }
function modelId(snapshot: unknown) { return String(snapshot ?? '').split('@')[0] }

async function resourceSnapshots(codes: string[]) {
  const rows = await db.testResource.findMany({ where: { code: { in: codes } }, orderBy: { code: 'asc' } })
  const found = new Set(rows.map((x) => x.code))
  const missing = codes.filter((x) => !found.has(x))
  if (missing.length) throw new Error(`Test Environment Assembly 缺少试验资源：${missing.join(', ')}`)
  return rows.map((x) => ({ code: x.code, name: x.name, kind: x.kind, site: x.site, statusAtAssembly: x.status, description: x.description }))
}

function topicSet() {
  return {
    schema: 'IDL-CASE01-LVC-v1',
    semanticMode: 'data-object publish/subscribe',
    topics: [
      { name: 'Platform.State', version: 'v1', purpose: '位置/姿态/速度与平台状态' },
      { name: 'EW.Status', version: 'v2.1', purpose: '电磁环境、干扰与抗干扰状态' },
      { name: 'Mission.Command', version: 'v1', purpose: '任务参数、触发条件与执行状态' },
      { name: 'Sensor.Track', version: 'v1', purpose: '感知/目标航迹数据对象' },
      { name: 'Weapon.Engagement', version: 'v1', purpose: '交战事件与武器作用参数' },
      { name: 'Damage.Result', version: 'v1', purpose: '仲裁/毁伤结果' },
      { name: 'Environment.Effect', version: 'v1', purpose: '环境查询与环境效应结果' },
    ],
  }
}

function federationGateways() {
  return [
    { id: 'GW-HLA-01', protocol: 'HLA / IEEE 1516', mapping: 'HLA对象/交互 ↔ IDL Topic', role: '遗留构建仿真/联邦接入', status: 'configured' },
    { id: 'GW-DIS-01', protocol: 'DIS / IEEE 1278', mapping: 'PDU ↔ IDL Topic', role: '虚拟模拟器与实体级状态接入', status: 'configured' },
    { id: 'GW-TENA-01', protocol: 'TENA', mapping: 'TENA对象 ↔ IDL Topic', role: '靶场/试验设施接入', status: 'configured' },
    { id: 'GW-DDS-01', protocol: 'DDS', mapping: 'DDS Topic ↔ IDL Topic', role: '低时延数据对象总线与SAL运行数据面', status: 'configured' },
  ]
}

function timeService() {
  return {
    authority: 'TIME-MASTER-01',
    source: 'DEMO/SYNTHETIC：靶场时统/GPS-PTP参考源',
    logicalTimeMode: 'TSO + 周期事件混合调度',
    referenceStepMs: 50,
    syncToleranceMs: 10,
    startEpochPolicy: 'RUN_START统一置零',
    resetPolicy: '所有联邦节点回到同一初始Epoch后再允许下一Run',
  }
}

function networkAndSecurity() {
  return {
    logicalNetwork: {
      nodes: [
        { id: 'NET-LIVE', zone: 'Live Range', purpose: '实装/遥测/威胁设备接入' },
        { id: 'NET-LVC', zone: 'LVC Federation', purpose: 'Virtual/Constructive联邦运行' },
        { id: 'NET-DIGITAL', zone: 'Digital Compute', purpose: '纯数字批量运行' },
        { id: 'NET-ANALYSIS', zone: 'Analysis', purpose: '试验数据落盘与判读' },
      ],
      policy: '逻辑拓扑快照；不保存实际敏感网络地址。',
    },
    securityBoundary: {
      mode: 'DEMO/SYNTHETIC logical boundary',
      zones: ['Live Range', 'LVC Federation', 'Digital Compute', 'Analysis'],
      crossBoundaryPolicy: '仅允许批准的IDL Topic/试验数据对象跨域；不暴露模型内部实现。',
      audit: '网关事件、Topic映射、加入/退出、时统异常写入Run日志。',
    },
  }
}

async function buildFederation(pk: string, title: string, scenarioRef: string, modelAssemblyRef: string, revision: string, status: string) {
  await ensureTestEnvironmentOntology()
  const [scenario, assembly] = await Promise.all([entry('TestScenario', scenarioRef), entry('TestModelAssembly', modelAssemblyRef)])
  if (!scenario) throw new Error(`Scenario不存在：${scenarioRef}`)
  if (!assembly) throw new Error(`TestModelAssembly不存在：${modelAssemblyRef}`)
  const bindings = Array.isArray(assembly.data.modelBindings) ? assembly.data.modelBindings : []
  const constructiveNodes = bindings.map((b: any) => ({
    id: `C-${b.modelRef}`,
    kind: 'Constructive',
    modelRef: b.modelRef,
    modelVersion: b.modelVersion,
    sourceKind: b.sourceKind,
    runtimeContracts: (b.interfaceContracts ?? []).map((c: any) => `${c.kind}:${c.version ?? 'current'}`),
    role: b.role,
  }))
  const liveNodes = [
    { id: 'LIVE-X9A-01', kind: 'Live', resourceRef: 'R-01', role: 'X9A被试实装/场区节点', adapter: 'ART-DP30-10 虚实交互适配器' },
    { id: 'LIVE-TM-01', kind: 'Live', resourceRef: 'R-04', role: '遥测地面站', adapter: 'GW-TENA-01 / GW-DDS-01' },
    { id: 'LIVE-EW-01', kind: 'Live', resourceRef: 'R-06', role: '电磁威胁模拟节点', adapter: 'GW-TENA-01' },
  ]
  const virtualNodes = [
    { id: 'VIRT-C2-01', kind: 'Virtual', resourceRef: 'R-05', role: '虚拟指控/任务操作席', gatewayRef: 'GW-HLA-01' },
    { id: 'VIRT-MSN-01', kind: 'Virtual', resourceRef: 'R-05', role: '虚拟任务/平台模拟器', gatewayRef: 'GW-DIS-01' },
  ]
  const gateways = federationGateways()
  const topics = topicSet()
  const time = timeService()
  const contractRefs = Array.from(new Set([...(assembly.data.contractRefs ?? []), 'CTR-DP30-IDL-01']))
  const manifest = {
    schema: 'dtep/lvc-federation-configuration/v2.0c',
    caseId: 'CASE-01', scenarioRef, modelAssemblyRef, modelAssemblyHash: assembly.data.assemblyHash,
    revision, liveNodes, virtualNodes, constructiveNodes, gateways, topicSet: topics, timeService: time,
    contractRefs,
    federationRules: {
      initializationOrder: ['TIME-MASTER-01', 'IDL-DATA-OBJECT-PLANE', 'GATEWAYS', 'CONSTRUCTIVE', 'VIRTUAL', 'LIVE-ADAPTERS', 'READINESS-CHECK'],
      joinPolicy: '节点通过配置哈希、Topic契约与时统检查后才能加入正式Run',
      eventOrdering: '按仿真时间戳排序，关键同刻事件保留优先级',
      resetPolicy: '每个Run结束后联邦、模型和Topic缓存统一Reset；Reset失败则阻止下一Run',
      faultPolicy: '普通节点故障隔离并记录；时统主节点、关键网关或关键Topic不可用时停止正式Run',
    },
    notice: 'DEMO/SYNTHETIC：协议节点和时统阈值仅用于原型演示，不代表具体基地实际网络/设备配置。',
  }
  const federationHash = sha256(manifest)
  const data = { code: pk, caseId: 'CASE-01', scenarioRef, modelAssemblyRef, modelAssemblyHash: assembly.data.assemblyHash, revision, status, ...manifest, federationHash, mutable: !status.startsWith('已冻结') }
  await upsert('LVCFederationConfiguration', pk, title, data)
  return data
}

async function buildEnvironment(pk: string, title: string, scenarioRef: string, modelAssemblyRef: string, federationRef: string, revision: string, status: string) {
  await ensureTestEnvironmentOntology()
  const [scenario, assembly, federation] = await Promise.all([entry('TestScenario', scenarioRef), entry('TestModelAssembly', modelAssemblyRef), entry('LVCFederationConfiguration', federationRef)])
  if (!scenario || !assembly || !federation) throw new Error('Test Environment Assembly引用对象不完整')
  if (federation.data.modelAssemblyHash !== assembly.data.assemblyHash) throw new Error('Federation与TestModelAssembly哈希不一致')
  const resources = await resourceSnapshots(['R-01', 'R-04', 'R-05', 'R-06', 'R-09'])
  const net = networkAndSecurity()
  const allConstructive = Array.isArray(federation.data.constructiveNodes) ? federation.data.constructiveNodes : []
  const profiles = {
    Live: {
      profile: 'Live',
      activeResourceRefs: ['R-01', 'R-04', 'R-06'],
      activeNodeRefs: ['LIVE-X9A-01', 'LIVE-TM-01', 'LIVE-EW-01'],
      activeGatewayRefs: ['GW-TENA-01', 'GW-DDS-01'],
      topicNames: ['Platform.State', 'EW.Status', 'Mission.Command'],
      purpose: '实装复试、遥测和现实锚点',
    },
    LVC: {
      profile: 'LVC',
      activeResourceRefs: ['R-01', 'R-04', 'R-05', 'R-06'],
      activeNodeRefs: [
        ...(federation.data.liveNodes ?? []).map((x: any) => x.id),
        ...(federation.data.virtualNodes ?? []).map((x: any) => x.id),
        ...allConstructive.map((x: any) => x.id),
      ],
      activeGatewayRefs: (federation.data.gateways ?? []).map((x: any) => x.id),
      topicNames: (federation.data.topicSet?.topics ?? []).map((x: any) => x.name),
      purpose: 'Live/Virtual/Constructive联合试验与现实锚定',
    },
    Digital: {
      profile: 'Digital',
      activeResourceRefs: ['R-09'],
      activeNodeRefs: allConstructive.map((x: any) => x.id),
      activeGatewayRefs: ['GW-DDS-01'],
      topicNames: (federation.data.topicSet?.topics ?? []).map((x: any) => x.name),
      purpose: 'SAL/IDL数据对象驱动的纯数字大样本运行',
    },
  }
  const readinessChecks = [
    { id: 'MODEL-ASSEMBLY', pass: Boolean(assembly.data.assemblyHash), note: `${modelAssemblyRef} 已形成模型装配哈希` },
    { id: 'FEDERATION-CONFIG', pass: Boolean(federation.data.federationHash), note: `${federationRef} 已形成联邦配置哈希` },
    { id: 'TIME-SERVICE', pass: Boolean(federation.data.timeService?.authority), note: '正式Run具有统一时统/逻辑时间基准' },
    { id: 'IDL-TOPIC-SET', pass: (federation.data.topicSet?.topics ?? []).length >= 5, note: 'IDL数据对象Topic Set已冻结' },
    { id: 'GATEWAYS', pass: (federation.data.gateways ?? []).every((x: any) => x.status === 'configured'), note: 'HLA/DIS/TENA/DDS网关配置齐全' },
    { id: 'RESOURCES', pass: resources.length === 5, note: '场区、遥测、LVC、威胁与数字算力资源均有快照' },
    { id: 'NETWORK-BOUNDARY', pass: Boolean(net.logicalNetwork && net.securityBoundary), note: '逻辑网络与安全边界已冻结' },
  ]
  const readiness = readinessChecks.every((x) => x.pass) ? 'READY' : 'BLOCKED'
  const manifest = {
    schema: 'dtep/test-environment-assembly/v2.0c',
    caseId: 'CASE-01', scenarioRef, revision,
    modelAssemblyRef, modelAssemblyHash: assembly.data.assemblyHash,
    federationRef, federationHash: federation.data.federationHash,
    resourceSnapshots: resources,
    executionProfiles: profiles,
    logicalNetwork: net.logicalNetwork,
    securityBoundary: net.securityBoundary,
    timeService: federation.data.timeService,
    topicSet: federation.data.topicSet,
    gatewayRefs: (federation.data.gateways ?? []).map((x: any) => x.id),
    readinessChecks,
  }
  const environmentHash = sha256(manifest)
  const data = { code: pk, caseId: 'CASE-01', scenarioRef, revision, status, readiness, ...manifest, environmentHash, mutable: !status.startsWith('已冻结'), provenancePolicy: 'Scenario引用当前Environment Assembly；Run创建时冻结环境与联邦快照，后续网关、网络或模型升级不追溯改写历史Run。' }
  await upsert('TestEnvironmentAssembly', pk, title, data)
  await patch('TestScenario', scenarioRef, {
    testEnvironmentAssemblyRef: pk,
    environmentAssemblyRevision: revision,
    environmentAssemblyHash: environmentHash,
    lvcFederationConfigRef: federationRef,
    lvcFederationConfigHash: federation.data.federationHash,
  })
  return data
}

export async function createCase01InitialEnvironmentAssemblies() {
  await ensureTestEnvironmentOntology()
  const [baseScenario, stressScenario] = await Promise.all([entry('TestScenario', 'SC-BASE'), entry('TestScenario', 'SC-COA-01')])
  const baseTma = String(baseScenario?.data.testModelAssemblyRef ?? '')
  const stressTma = String(stressScenario?.data.testModelAssemblyRef ?? '')
  if (!baseTma || !stressTma) throw new Error('创建试验环境装配前必须先完成 TestModelAssembly')
  await buildFederation(CASE01_BASE_FED_V1, 'CASE-01 基线 LVC 联邦配置 · v1', 'SC-BASE', baseTma, 'v1', '已配置')
  await buildFederation(CASE01_STRESS_FED_V1, 'CASE-01 高压 LVC 联邦配置 · v1', 'SC-COA-01', stressTma, 'v1', '已配置 · 用于扩域锚定')
  const base = await buildEnvironment(CASE01_BASE_ENV_V1, 'CASE-01 基线试验环境装配 · v1', 'SC-BASE', baseTma, CASE01_BASE_FED_V1, 'v1', '已配置')
  const stress = await buildEnvironment(CASE01_STRESS_ENV_V1, 'CASE-01 高压试验环境装配 · v1', 'SC-COA-01', stressTma, CASE01_STRESS_FED_V1, 'v1', '已配置 · 用于扩域锚定')
  return { base: base.code, stress: stress.code, federations: { base: CASE01_BASE_FED_V1, stress: CASE01_STRESS_FED_V1 } }
}

export async function createCase01StressEnvironmentV2() {
  const scenario = await entry('TestScenario', 'SC-COA-01')
  const modelAssemblyRef = String(scenario?.data.testModelAssemblyRef ?? '')
  if (!modelAssemblyRef) throw new Error('SC-COA-01 尚未绑定正式 TestModelAssembly v2')
  await buildFederation(CASE01_STRESS_FED_V2, 'CASE-01 高压 LVC 联邦配置 · v2', 'SC-COA-01', modelAssemblyRef, 'v2', '已冻结用于正式Run')
  return buildEnvironment(CASE01_STRESS_ENV_V2, 'CASE-01 高压试验环境装配 · v2', 'SC-COA-01', modelAssemblyRef, CASE01_STRESS_FED_V2, 'v2', '已冻结用于正式Run')
}

export async function bindRunToCurrentEnvironment(runData: Record<string, any>) {
  await ensureTestEnvironmentOntology()
  const scenario = await entry('TestScenario', String(runData.scenarioId ?? ''))
  if (!scenario) throw new Error(`Run缺少有效Scenario：${runData.scenarioId}`)
  const environmentRef = String(scenario.data.testEnvironmentAssemblyRef ?? '')
  if (!environmentRef) throw new Error(`${runData.scenarioId} 尚未绑定 TestEnvironmentAssembly；不得创建环境来源不完整的正式Run`)
  const environment = await entry('TestEnvironmentAssembly', environmentRef)
  if (!environment) throw new Error(`TestEnvironmentAssembly/${environmentRef}不存在`)
  if (environment.data.readiness !== 'READY') throw new Error(`${environmentRef}未通过环境就绪检查`)
  if (String(runData.testModelAssemblyRef ?? '') !== String(environment.data.modelAssemblyRef ?? '') || String(runData.testModelAssemblyHash ?? '') !== String(environment.data.modelAssemblyHash ?? '')) throw new Error('Run的TestModelAssembly与TestEnvironmentAssembly引用不一致')
  const federation = await entry('LVCFederationConfiguration', String(environment.data.federationRef ?? ''))
  if (!federation) throw new Error('LVCFederationConfiguration不存在')
  const mode = String(runData.executionMode ?? '')
  const profile = environment.data.executionProfiles?.[mode]
  if (!profile) throw new Error(`${environmentRef}未定义${mode}执行Profile`)
  const envResourceCodes = new Set((environment.data.resourceSnapshots ?? []).map((x: any) => x.code))
  const runResourceCodes = (runData.resourceSnapshot ?? []).map(resourceCode)
  const missingResources = runResourceCodes.filter((x: string) => !envResourceCodes.has(x))
  if (missingResources.length) throw new Error(`Run资源未纳入当前TestEnvironmentAssembly：${missingResources.join(', ')}`)
  const constructiveByModel = new Map((federation.data.constructiveNodes ?? []).map((x: any) => [String(x.modelRef), x]))
  const runModelIds = (runData.modelSnapshot ?? []).map(modelId)
  const nodeBindings = runModelIds.map((id: string) => constructiveByModel.get(id)).filter(Boolean) as any[]
  const activeNodeRefs = Array.from(new Set([...(profile.activeNodeRefs ?? []).filter((x: string) => !String(x).startsWith('C-')), ...nodeBindings.map((x: any) => x.id)]))
  const effectiveProfile = { ...profile, activeNodeRefs }
  const resourceCodeSet = new Set(profile.activeResourceRefs ?? [])
  const activeResourceSnapshots = (environment.data.resourceSnapshots ?? []).filter((x: any) => resourceCodeSet.has(x.code))
  const gatewayRefSet = new Set(profile.activeGatewayRefs ?? [])
  const activeGateways = (federation.data.gateways ?? []).filter((x: any) => gatewayRefSet.has(x.id))
  const topicNameSet = new Set(profile.topicNames ?? [])
  const activeTopics = (federation.data.topicSet?.topics ?? []).filter((x: any) => topicNameSet.has(x.name))
  const environmentSnapshot = {
    pk: environment.pk, title: environment.title, revision: environment.data.revision,
    environmentHash: environment.data.environmentHash,
    modelAssemblyRef: environment.data.modelAssemblyRef, modelAssemblyHash: environment.data.modelAssemblyHash,
    federationRef: environment.data.federationRef, federationHash: environment.data.federationHash,
    executionProfile: effectiveProfile,
    resourceSnapshots: activeResourceSnapshots,
    logicalNetwork: environment.data.logicalNetwork,
    securityBoundary: environment.data.securityBoundary,
    timeService: environment.data.timeService,
    topicSet: { ...environment.data.topicSet, topics: activeTopics },
    activeGateways,
    constructiveNodeBindings: nodeBindings,
  }
  const federationSnapshot = {
    pk: federation.pk, title: federation.title, revision: federation.data.revision,
    federationHash: federation.data.federationHash,
    modelAssemblyRef: federation.data.modelAssemblyRef, modelAssemblyHash: federation.data.modelAssemblyHash,
    timeService: federation.data.timeService,
    topicSet: { ...federation.data.topicSet, topics: activeTopics },
    activeGateways,
    activeNodeRefs,
    federationRules: federation.data.federationRules,
  }
  const provenanceManifest = {
    schema: 'dtep/run-environment-provenance/v2.0c',
    testEnvironmentAssemblyRef: environment.pk,
    environmentHash: environment.data.environmentHash,
    lvcFederationConfigRef: federation.pk,
    federationHash: federation.data.federationHash,
    executionMode: mode,
    executionProfile: effectiveProfile,
    activeResourceSnapshots,
    activeGateways,
    activeTopics,
    timeService: federation.data.timeService,
    logicalNetwork: environment.data.logicalNetwork,
    securityBoundary: environment.data.securityBoundary,
  }
  return {
    ...runData,
    testEnvironmentAssemblyRef: environment.pk,
    testEnvironmentAssemblyHash: environment.data.environmentHash,
    testEnvironmentAssemblyRevision: environment.data.revision,
    lvcFederationConfigRef: federation.pk,
    lvcFederationConfigHash: federation.data.federationHash,
    lvcFederationConfigRevision: federation.data.revision,
    environmentProfileSnapshot: effectiveProfile,
    environmentResourceSnapshots: activeResourceSnapshots,
    federationGatewayRefs: activeGateways.map((x: any) => x.id),
    idlTopicSetSnapshot: { schema: federation.data.topicSet?.schema, topics: activeTopics },
    timeServiceSnapshot: federation.data.timeService,
    logicalNetworkSnapshot: environment.data.logicalNetwork,
    securityBoundarySnapshot: environment.data.securityBoundary,
    environmentAssemblySnapshot: environmentSnapshot,
    lvcFederationSnapshot: federationSnapshot,
    environmentProvenanceHash: sha256(provenanceManifest),
    environmentGovernanceVersion: 'v2.0c',
    environmentBindingMode: 'frozen-at-run-creation',
  }
}

async function deleteCaseObjects(apiName: string) {
  const t = await db.objectType.findUnique({ where: { apiName } })
  if (!t) return
  const rows = await db.objectEntry.findMany({ where: { objectTypeId: t.id } })
  for (const row of rows) {
    let data: Record<string, any> = {}
    try { data = JSON.parse(row.dataJson || '{}') } catch { /* ignore */ }
    if (data.caseId === 'CASE-01') await db.objectEntry.delete({ where: { id: row.id } })
  }
  await db.objectType.update({ where: { id: t.id }, data: { objectCount: await db.objectEntry.count({ where: { objectTypeId: t.id } }) } })
}

export async function clearCase01EnvironmentAssemblies() {
  await deleteCaseObjects('TestEnvironmentAssembly')
  await deleteCaseObjects('LVCFederationConfiguration')
  for (const scenarioRef of ['SC-BASE', 'SC-COA-01']) {
    const scenario = await entry('TestScenario', scenarioRef)
    if (!scenario) continue
    const next = { ...scenario.data }
    for (const key of ['testEnvironmentAssemblyRef', 'environmentAssemblyRevision', 'environmentAssemblyHash', 'lvcFederationConfigRef', 'lvcFederationConfigHash']) delete next[key]
    await upsert('TestScenario', scenarioRef, scenario.title, next)
  }
}

export async function restoreCase01EnvironmentAssembliesIfAvailable() {
  const [base, stress] = await Promise.all([entry('TestScenario', 'SC-BASE'), entry('TestScenario', 'SC-COA-01')])
  if (!base?.data.testModelAssemblyRef || !stress?.data.testModelAssemblyRef) return null
  return createCase01InitialEnvironmentAssemblies()
}
