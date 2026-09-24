import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 试验告警列表 + 确认/解决
export async function GET() {
  const alerts = await db.testAlert.findMany({ orderBy: [{ status: 'asc' }, { raisedAt: 'desc' }] })
  return NextResponse.json({
    alerts: alerts.map((a) => ({ id: a.id, runId: a.runId, parameter: a.parameter, severity: a.severity, message: a.message, status: a.status, raisedAt: a.raisedAt })),
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, status } = body
  if (!['open', 'acknowledged', 'resolved'].includes(status)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 })
  }
  const a = await db.testAlert.findUnique({ where: { id } })
  if (!a) return NextResponse.json({ error: '告警不存在' }, { status: 404 })
  await db.testAlert.update({ where: { id }, data: { status } })
  const label = status === 'acknowledged' ? '已确认' : status === 'resolved' ? '已解决' : '重新打开'
  await db.activityEvent.create({ data: { actor: '现场指挥', module: 'Time Series', message: `架次 ${a.runId} 告警「${a.message.slice(0, 24)}…」状态更新为 ${label}` } })
  return NextResponse.json({ ok: true })
}
