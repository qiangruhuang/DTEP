import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 遥测时序：支持按架次/参数过滤
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const runId = params.get('run') || 'F-2207'
  const parameter = params.get('param') // 为空则返回全部

  const where: any = { runId }
  if (parameter) where.parameter = parameter
  const readings = await db.telemetryReading.findMany({ where, orderBy: { ts: 'asc' } })

  const byParam: Record<string, { points: { ts: string; value: number }[] }> = {}
  for (const r of readings) {
    if (!byParam[r.parameter]) byParam[r.parameter] = { points: [] }
    byParam[r.parameter].points.push({ ts: r.ts.toISOString(), value: r.value })
  }

  // 超差判据（判读准则）：涵盖飞行架次 / 实弹射组 / 数字化运行
  const thresholds: Record<string, number> = { deviation: 50, linkQuality: 85, missDistance: 5, twinNrmse: 8 }

  const alerts = await db.testAlert.findMany({ where: { runId }, orderBy: { raisedAt: 'desc' } })

  return NextResponse.json({
    runId,
    series: Object.entries(byParam).map(([param, s]) => ({
      param,
      threshold: thresholds[param] ?? null,
      direction: ['deviation', 'missDistance', 'twinNrmse'].includes(param) ? 'upper' : param === 'linkQuality' ? 'lower' : null,
      points: s.points,
    })),
    alerts: alerts.map((a) => ({ id: a.id, parameter: a.parameter, severity: a.severity, message: a.message, status: a.status, raisedAt: a.raisedAt })),
  })
}
