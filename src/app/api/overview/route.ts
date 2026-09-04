import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 试验总览：任务/事件/指标/缺陷统计 + 判读管道 + 活动 + 告警
async function getEntryMap(apiName: string) {
  const ot = await db.objectType.findUnique({ where: { apiName }, include: { entries: true } })
  return (ot?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))
}

export async function GET() {
  const [resources, datasets, pipelines, objectTypes, automations, alerts, recentBuilds, activities, events, measures, deficiencies, programs] =
    await Promise.all([
      db.testResource.findMany(),
      db.testDataset.findMany(),
      db.testPipeline.findMany({ include: { builds: { orderBy: { startedAt: 'desc' }, take: 10 } } }),
      db.objectType.findMany({ include: { properties: true, entries: true } }),
      db.automation.findMany({ include: { runs: { orderBy: { startedAt: 'desc' }, take: 3 } } }),
      db.testAlert.findMany({ orderBy: { raisedAt: 'desc' }, take: 20 }),
      db.testBuild.findMany({ orderBy: { startedAt: 'desc' }, take: 6 }),
      db.activityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
      getEntryMap('TestEvent'),
      getEntryMap('Measure'),
      getEntryMap('Deficiency'),
      getEntryMap('TestProgram'),
    ])

  const totalObjects = objectTypes.reduce((s, t) => s + t.entries.length, 0)
  const openAlerts = alerts.filter((a) => a.status === 'open').length
  const totalRows = datasets.reduce((s, d) => s + d.rowCount, 0)

  // 指标统计
  const measuresMet = measures.filter((m) => m.data.status === '达标').length
  const measuresPending = measures.filter((m) => m.data.status === '统计中').length
  const openDeficiencies = deficiencies.filter((d) => d.data.status !== '已闭环').length

  return NextResponse.json({
    stats: {
      programs: programs.length,
      activeEvents: events.filter((e) => ['执行中', '数据分析中'].includes(e.data.status)).length,
      pendingEvents: events.filter((e) => e.data.status === '待执行').length,
      resources: resources.length,
      onlineResources: resources.filter((r) => r.status === 'online' || r.status === 'busy').length,
      datasets: datasets.length,
      totalRows,
      pipelines: pipelines.length,
      objectTypes: objectTypes.length,
      totalObjects,
      actionTypes: await db.actionType.count(),
      automations: automations.filter((a) => a.enabled).length,
      openAlerts,
      measuresTotal: measures.length,
      measuresMet,
      measuresPending,
      openDeficiencies,
      lastBuildStatus: pipelines[0]?.lastBuildStatus ?? 'succeeded',
    },
    measures: measures.map((m) => ({ pk: m.pk, title: m.title, data: m.data })),
    events: events.map((e) => ({ pk: e.pk, title: e.title, data: e.data })),
    pipelines: pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      schedule: p.schedule,
      lastBuildStatus: p.lastBuildStatus,
      lastBuildAt: p.lastBuildAt,
      recentBuilds: p.builds.slice(0, 5).map((b) => ({ status: b.status, startedAt: b.startedAt, durationSec: b.durationSec, rowsProcessed: b.rowsProcessed })),
    })),
    recentBuilds: recentBuilds.map((b) => ({ id: b.id, status: b.status, startedAt: b.startedAt, durationSec: b.durationSec, rowsProcessed: b.rowsProcessed })),
    activities,
    alerts: alerts.slice(0, 6),
  })
}
