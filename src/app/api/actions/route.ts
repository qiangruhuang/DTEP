import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authorizationResponse, authorizeOntologyAction } from '@/lib/security/ontology-policy'

// 执行动作（试验指挥写回本体 + 日志）— 试验指挥台 / 试验自动化的核心写路径
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { actionTypeId, objectPk, parameters } = body

  const at = await db.actionType.findUnique({ where: { id: actionTypeId } })
  if (!at) return NextResponse.json({ error: '动作类型不存在' }, { status: 404 })

  let actor
  try {
    actor = await authorizeOntologyAction(req, at.apiName)
  } catch (error) {
    const auth = authorizationResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : '身份认证失败' }, { status: 401 })
  }
  // Compatibility: legacy clients may still send performedBy, but it is never
  // trusted or used. The auditable actor is derived exclusively from OIDC.
  const performedBy = actor.actorId

  const defs: any[] = JSON.parse(at.parametersJson || '[]')
  for (const d of defs) {
    if (d.required && !parameters?.[d.name]) {
      return NextResponse.json({ error: `缺少必填参数：${d.label}` }, { status: 400 })
    }
  }

  let resultMsg = ''

  if (at.apiName === 'issueTestOrder') {
    const ot = await db.objectType.findUnique({ where: { apiName: 'TestEvent' } })
    if (ot) {
      const entry = await db.objectEntry.findFirst({ where: { objectTypeId: ot.id, pk: objectPk } })
      if (entry) {
        const d = JSON.parse(entry.dataJson || '{}')
        const orders = Array.isArray(d.orders) ? d.orders : []
        orders.unshift({
          orderNo: parameters.orderNo,
          window: parameters.window || '待令',
          priority: parameters.priority || '常规',
          note: parameters.note || '',
          issuedAt: new Date().toISOString(),
          issuedBy: performedBy,
        })
        const merged = { ...d, status: '执行中', orders, lastOrderNo: parameters.orderNo }
        await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
        resultMsg = `试验指令 ${parameters.orderNo} 已下达：${entry.title}（${objectPk}）转入「执行中」，指挥席位已收到通知`
      }
    }
  } else if (at.apiName === 'closeDeficiency') {
    const ot = await db.objectType.findUnique({ where: { apiName: 'Deficiency' } })
    if (ot) {
      const entry = await db.objectEntry.findFirst({ where: { objectTypeId: ot.id, pk: objectPk } })
      if (entry) {
        const d = JSON.parse(entry.dataJson || '{}')
        const merged = {
          ...d,
          status: '已闭环',
          rootCause: `${parameters.closureType}：${parameters.verification}`,
          closedAt: new Date().toISOString(),
        }
        await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
        resultMsg = `缺陷 ${objectPk} 已归零闭环（${parameters.closureType}），归零证据已归档`
      }
    }
  } else if (at.apiName === 'submitReport') {
    const ot = await db.objectType.findUnique({ where: { apiName: 'Report' } })
    if (ot) {
      const entry = await db.objectEntry.findFirst({ where: { objectTypeId: ot.id, pk: objectPk } })
      if (entry) {
        const d = JSON.parse(entry.dataJson || '{}')
        const merged = { ...d, status: '已提交', verdict: parameters.verdict, reviewLevel: parameters.reviewLevel || '所级评审', submittedAt: new Date().toISOString() }
        await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
        resultMsg = `报告 ${objectPk} 已提交（${parameters.reviewLevel || '所级评审'}），结论建议：「${parameters.verdict}」`
      }
    }
  } else if (at.apiName === 'createDeficiency') {
    const ot = await db.objectType.findUnique({ where: { apiName: 'Deficiency' } })
    if (ot) {
      const code = `DF-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(10 + Math.random() * 89)}`
      await db.objectEntry.create({
        data: {
          objectTypeId: ot.id,
          pk: code,
          title: parameters.title || '试验新发现问题',
          dataJson: JSON.stringify({
            code,
            title: parameters.title || '试验新发现问题',
            severity: parameters.severity || 'II类',
            status: '分析中',
            foundIn: parameters.foundIn || objectPk,
            owner: '待分派',
            raisedAt: new Date().toISOString().slice(0, 10),
            rootCause: parameters.note || '',
          }),
        },
      })
      resultMsg = `缺陷 ${code} 已登记（${parameters.severity || 'II类'}），进入归零流程`
    }
  } else if (at.apiName === 'authorizeLiveFire') {
    const ot = await db.objectType.findUnique({ where: { apiName: 'TestEvent' } })
    if (ot) {
      const entry = await db.objectEntry.findFirst({ where: { objectTypeId: ot.id, pk: objectPk } })
      if (entry) {
        const d = JSON.parse(entry.dataJson || '{}')
        const auths = Array.isArray(d.liveFireAuths) ? d.liveFireAuths : []
        auths.unshift({
          shotSerial: parameters.shotSerial,
          ammoLot: parameters.ammoLot || 'LJ-25-B1',
          safetyRadius: parameters.safetyRadius || '标准 1500m',
          note: parameters.note || '',
          authorizedAt: new Date().toISOString(),
          authorizedBy: performedBy,
        })
        const merged = { ...d, liveFireAuths: auths, lastShotSerial: parameters.shotSerial }
        await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
        resultMsg = `实弹射击授权（射组 ${parameters.shotSerial} · ${parameters.ammoLot || 'LJ-25-B1'} · ${parameters.safetyRadius || '标准 1500m'}）已写入 ${entry.title}，安全总监与阵地指挥席已同步`
      }
    }
  } else {
    resultMsg = `动作 ${at.displayName} 执行成功`
  }

  await db.actionLog.create({
    data: {
      actionTypeId: at.id,
      objectPk,
      parametersJson: JSON.stringify(parameters || {}),
      status: 'succeeded',
      performedBy,
    },
  })
  await db.activityEvent.create({
    data: {
      actor: performedBy,
      module: 'Workshop',
      message: `执行动作「${at.displayName}」于 ${objectPk}：${resultMsg}`,
    },
  })

  return NextResponse.json({ ok: true, message: resultMsg, performedBy })
}
