import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 证据链追溯（对应美军 T&E 需求-试验-证据追溯矩阵 RTM）：
// 试验任务(TEMP) → 鉴定指标(MOP/MOE) → 试验事件(DT/OT/LVC) → 试验数据(原始/判读) → 鉴定报告
export async function GET() {
  const [programType, measureType, eventType, reportType, datasets] = await Promise.all([
    db.objectType.findUnique({ where: { apiName: 'TestProgram' }, include: { entries: true } }),
    db.objectType.findUnique({ where: { apiName: 'Measure' }, include: { entries: true } }),
    db.objectType.findUnique({ where: { apiName: 'TestEvent' }, include: { entries: true } }),
    db.objectType.findUnique({ where: { apiName: 'Report' }, include: { entries: true } }),
    db.testDataset.findMany(),
  ])

  const nodes: any[] = []
  const edges: any[] = []
  const layerX = { program: 0, measure: 1, event: 2, data: 3, report: 4 }

  const programs = (programType?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))
  const measures = (measureType?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))
  const events = (eventType?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))
  const reports = (reportType?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))

  // 层1：试验任务
  programs.forEach((p, i) => {
    nodes.push({ id: `p-${p.pk}`, label: p.data.name ?? p.pk, sub: `${p.data.phase ?? ''} · ${p.data.eventsDone ?? 0}/${p.data.eventsTotal ?? 0} 事件`, layer: layerX.program, idx: i, kind: 'program', status: p.data.phase })
  })
  // 层2：鉴定指标
  measures.forEach((m, i) => {
    nodes.push({ id: `m-${m.pk}`, label: m.data.name ?? m.pk, sub: `${m.data.status ?? ''} · 实测 ${m.data.measured ?? '—'}`, layer: layerX.measure, idx: i, kind: 'measure', status: m.data.status })
  })
  // 层3：试验事件
  events.forEach((e, i) => {
    const lvc = `${(e.data.liveCount ?? 0)}L/${(e.data.virtualCount ?? 0)}V/${(e.data.constructiveCount ?? 0)}C`
    nodes.push({ id: `e-${e.pk}`, label: e.data.name ?? e.pk, sub: `${e.data.phase ?? ''} · ${lvc} · ${e.data.status ?? ''}`, layer: layerX.event, idx: i, kind: 'event', status: e.data.status })
  })
  // 层4：试验数据
  datasets.forEach((d, i) => {
    nodes.push({ id: `d-${d.id}`, label: d.name, sub: `${(d.rowCount / 1000).toFixed(1)}k 行 · ${d.domain}`, layer: layerX.data, idx: i, kind: 'data', health: d.qualityScore, path: d.path })
  })
  // 层5：鉴定报告
  reports.forEach((r, i) => {
    nodes.push({ id: `r-${r.pk}`, label: r.data.title ?? r.pk, sub: `${r.data.type ?? ''} · ${r.data.status ?? ''}`, layer: layerX.report, idx: i, kind: 'report', status: r.data.status })
  })

  // 边：任务 → 指标
  for (const m of measures) {
    if (m.data.programId) edges.push({ from: `p-${m.data.programId}`, to: `m-${m.pk}` })
  }
  // 边：指标 ← 事件（事件考核指标）
  for (const e of events) {
    for (const mc of e.data.assesses ?? []) {
      edges.push({ from: `e-${e.pk}`, to: `m-${mc}` })
    }
  }
  // 边：事件 → 数据（事件产出数据）
  for (const e of events) {
    for (const path of e.data.produces ?? []) {
      const ds = datasets.find((d) => d.path === path)
      if (ds) edges.push({ from: `e-${e.pk}`, to: `d-${ds.id}` })
    }
  }
  // 边：数据 → 报告（报告引用数据）
  for (const r of reports) {
    for (const path of r.data.basedOnDatasets ?? []) {
      const ds = datasets.find((d) => d.path === path)
      if (ds) edges.push({ from: `d-${ds.id}`, to: `r-${r.pk}` })
    }
  }

  return NextResponse.json({ nodes, edges })
}
