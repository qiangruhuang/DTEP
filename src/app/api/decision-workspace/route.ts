import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getEntries(apiName: string) {
  const type = await db.objectType.findUnique({ where: { apiName }, include: { entries: true } })
  return (type?.entries ?? []).map((entry) => ({
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}') as Record<string, unknown>,
  }))
}

export async function GET() {
  const [programs, events, measures, models, missionThreads, scenarios, evidenceGates, assemblies, environments, federations, baselines, artifacts, contracts, resources, datasets] = await Promise.all([
    getEntries('TestProgram'),
    getEntries('TestEvent'),
    getEntries('Measure'),
    getEntries('ModelAsset'),
    getEntries('MissionThread'),
    getEntries('TestScenario'),
    getEntries('EvidenceGate'),
    getEntries('TestModelAssembly'),
    getEntries('TestEnvironmentAssembly'),
    getEntries('LVCFederationConfiguration'),
    getEntries('ModelBaseline'),
    getEntries('ModelArtifact'),
    getEntries('InterfaceContract'),
    db.testResource.findMany({ select: { code: true, name: true, kind: true, site: true, status: true, description: true } }),
    db.testDataset.findMany({ select: { name: true, path: true, domain: true, origin: true, qualityScore: true, rowCount: true } }),
  ])

  return NextResponse.json({
    programs,
    events,
    measures,
    models,
    missionThreads,
    scenarios,
    evidenceGates,
    assemblies,
    environments,
    federations,
    baselines,
    artifacts,
    contracts,
    resources,
    datasets,
  })
}
