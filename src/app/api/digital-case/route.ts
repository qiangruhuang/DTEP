import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Entry = { pk: string; title: string; data: Record<string, any> }

async function getEntries(apiName: string): Promise<Entry[]> {
  // The frozen demo database intentionally preserves legacy rows created by
  // earlier prototype versions. Some of those rows store SQLite DATETIME
  // columns as millisecond integers. Prisma 6.19 decodes DateTime eagerly and
  // raises P2023 even though this endpoint does not use those timestamp fields.
  // Select only the business fields required by the Digital Case projection so
  // the frozen evidence baseline is not mutated merely to satisfy a UI read.
  const ot = await db.objectType.findUnique({
    where: { apiName },
    select: {
      entries: {
        select: {
          pk: true,
          title: true,
          dataJson: true,
        },
      },
    },
  })
  return (ot?.entries ?? []).map((entry) => ({
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}'),
  }))
}

function pick(entries: Entry[], ids: string[]) {
  const set = new Set(ids)
  return entries.filter((entry) => set.has(entry.pk))
}

export async function GET() {
  const [cases, programs, threads, scenarios, events, measures, models, gates, deficiencies, reports, resources, datasets] = await Promise.all([
    getEntries('DigitalTestCase'),
    getEntries('TestProgram'),
    getEntries('MissionThread'),
    getEntries('TestScenario'),
    getEntries('TestEvent'),
    getEntries('Measure'),
    getEntries('ModelAsset'),
    getEntries('EvidenceGate'),
    getEntries('Deficiency'),
    getEntries('Report'),
    db.testResource.findMany({ orderBy: { code: 'asc' } }),
    db.testDataset.findMany({ orderBy: { path: 'asc' } }),
  ])

  const currentCase = cases.find((entry) => entry.pk === 'CASE-01') ?? null
  const program = programs.find((entry) => entry.pk === 'TP-25-01') ?? null
  const missionThread = threads.find((entry) => entry.pk === 'MT-01') ?? null
  const caseScenarios = pick(scenarios, ['SC-BASE', 'SC-COA-01'])
  const caseEvents = pick(events, ['TE-25-002', 'TE-25-004', 'TE-25-006', 'TE-25-009'])
  const caseMeasures = pick(measures, ['M-03', 'M-05', 'M-07', 'M-08', 'M-13', 'M-14'])
  const caseModels = pick(models, ['MD-01', 'MD-02', 'MD-03', 'MD-05', 'MD-07', 'MD-08'])
  const caseGates = pick(gates, ['EG-M03', 'EG-M13'])
  const caseDeficiencies = pick(deficiencies, ['DF-25-01'])
  const caseReports = pick(reports, ['RP-25-03', 'RP-25-05'])

  const caseResourceCodes = new Set(['R-01', 'R-04', 'R-05', 'R-06', 'R-09'])
  const caseDatasetPaths = new Set([
    'raw/telemetry/F-2206',
    'raw/environment/range-A',
    'raw/simulation/lvc-01',
    'stg/evaluation/lvc-score',
    'raw/simulation/mp-01',
    'raw/simulation/twin-F-2207',
    'raw/simulation/dot-01',
    'stg/evaluation/metrics',
    'raw/telemetry/F-2206-R2',
    'raw/simulation/lvc-02',
    'stg/evaluation/lvc-score-v2',
    'raw/simulation/dot-stress-v2',
    'stg/evaluation/metrics-stress-v2',
  ])

  return NextResponse.json({
    case: currentCase,
    program,
    missionThread,
    scenarios: caseScenarios,
    events: caseEvents,
    measures: caseMeasures,
    models: caseModels,
    evidenceGates: caseGates,
    deficiencies: caseDeficiencies,
    reports: caseReports,
    resources: resources.filter((resource) => caseResourceCodes.has(resource.code)),
    datasets: datasets.filter((dataset) => caseDatasetPaths.has(dataset.path)),
    demo: {
      currentConclusion: currentCase?.data.decision ?? 'CASE-01 尚未形成结论。',
      candidateResult: {
        missionSuccess: Number(caseMeasures.find((m) => m.pk === 'M-13')?.data.measured ?? 0),
        threshold: Number(caseMeasures.find((m) => m.pk === 'M-13')?.data.threshold ?? 85),
        twinNrmse: Number(caseMeasures.find((m) => m.pk === 'M-14')?.data.measured ?? 0),
        highStressNrmse: Number(caseMeasures.find((m) => m.pk === 'M-14')?.data.measured ?? 0),
      },
      closurePlan: [
        `${caseEvents.find((e) => e.pk === 'TE-25-002')?.data.status === '已完成' ? '✓' : '○'} TE-25-002 故障归零并完成 3 组强干扰正式复试，恢复 Live Anchor`,
        `${caseEvents.find((e) => e.pk === 'TE-25-004')?.data.status === '已完成' ? '✓' : '○'} TE-25-004 完成 36 个正式 LVC 任务线程 Run，补齐 S3/S4 交互锚点`,
        `${['MD-02','MD-07','MD-08'].every((id) => caseModels.find((m) => m.pk === id)?.data.accreditation === '已认可') ? '✓' : '○'} MD-02 / MD-07 / MD-08 扩展高压 Validation Domain 并完成认可`,
        `${caseEvents.find((e) => e.pk === 'TE-25-009')?.data.status === '已完成' ? '✓' : '○'} 冻结配置并完成 RUN-DOT-S-02：5,000 次正式数字化高压 Run`,
        `${currentCase?.data.status === '正式结论已冻结' ? '✓' : '○'} EP-CASE01-M13-V0.4 冻结后由原 STRICT-V1 复评并冻结正式性能结论`,
      ],
    },
  })
}
