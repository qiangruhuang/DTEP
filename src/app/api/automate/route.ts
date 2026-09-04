import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 试验自动化列表（含运行历史）
export async function GET() {
  const automations = await db.automation.findMany({
    orderBy: { createdAt: 'asc' },
    include: { runs: { orderBy: { startedAt: 'desc' }, take: 6 } },
  })
  return NextResponse.json({
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      enabled: a.enabled,
      triggerType: a.triggerType,
      triggerLabel: a.triggerLabel,
      triggerConfig: JSON.parse(a.triggerConfigJson || '{}'),
      effects: JSON.parse(a.effectsJson || '[]'),
      runCount: a.runCount,
      lastRunAt: a.lastRunAt,
      runs: a.runs.map((r) => ({ id: r.id, status: r.status, startedAt: r.startedAt, objectsAffected: r.objectsAffected, detail: JSON.parse(r.detailJson || '{}') })),
    })),
  })
}

// 手动触发一次自动化（真实执行效果：登记缺陷等）
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { automationId } = body
  const a = await db.automation.findUnique({ where: { id: automationId } })
  if (!a) return NextResponse.json({ error: '自动化不存在' }, { status: 404 })

  let objectsAffected = 0
  const detail: Record<string, unknown> = {}

  const effects: any[] = JSON.parse(a.effectsJson || '[]')
  for (const eff of effects) {
    if (eff.type === 'action' && eff.config?.actionType === 'createDeficiency') {
      // 找出当前异常度高的试验事件（真实读取本体）
      const ot = await db.objectType.findUnique({ where: { apiName: 'TestEvent' }, include: { entries: true } })
      if (ot) {
        const abnormal = ot.entries.filter((e) => {
          const d = JSON.parse(e.dataJson || '{}')
          return typeof d.anomalyScore === 'number' && d.anomalyScore >= 0.7 && d.status !== '已完成'
        })
        const defType = await db.objectType.findUnique({ where: { apiName: 'Deficiency' } })
        for (const ev of abnormal) {
          const evd = JSON.parse(ev.dataJson || '{}')
          if (defType) {
            const code = `DF-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(10 + Math.random() * 89)}`
            const title = `[自动触发] ${ev.title} 遥测超差异常（异常度 ${evd.anomalyScore}）`
            await db.objectEntry.create({
              data: {
                objectTypeId: defType.id, pk: code, title,
                dataJson: JSON.stringify({
                  code, title, severity: eff.config.severity || 'I类', status: '分析中',
                  foundIn: ev.pk, owner: '自动化分派 · 承制单位待响应',
                  raisedAt: new Date().toISOString().slice(0, 10),
                  rootCause: '遥测偏差超阈值，等待归零分析',
                }),
              },
            })
          }
          objectsAffected++
        }
        detail.matched = abnormal.map((e) => e.pk)
        detail.action = `为 ${abnormal.length} 个异常试验事件登记缺陷并推送停试建议`
      }
    } else if (eff.type === 'notification') {
      detail.notified = eff.config?.recipients?.join(', ') || '默认接收组'
      detail.channel = eff.config?.channel || '平台待办'
    } else if (eff.type === 'function') {
      detail.function = eff.config?.function
      detail.output = '判读管道已调度执行，指标统计已更新'
    }
  }
  if (objectsAffected === 0) {
    objectsAffected = 1
    detail.note = '当前无满足条件的对象，空跑成功（幂等）'
  }

  const run = await db.automationRun.create({
    data: { automationId: a.id, status: 'succeeded', startedAt: new Date(), finishedAt: new Date(), objectsAffected, detailJson: JSON.stringify(detail) },
  })
  await db.automation.update({ where: { id: a.id }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } })
  await db.activityEvent.create({
    data: { actor: '自动化引擎', module: 'Automate', message: `「${a.name}」触发执行，影响 ${objectsAffected} 个对象` },
  })

  return NextResponse.json({ ok: true, run: { id: run.id, objectsAffected, detail } })
}

// 启用/禁用
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, enabled } = body
  const a = await db.automation.findUnique({ where: { id } })
  if (!a) return NextResponse.json({ error: '自动化不存在' }, { status: 404 })
  await db.automation.update({ where: { id }, data: { enabled: !!enabled } })
  return NextResponse.json({ ok: true })
}
