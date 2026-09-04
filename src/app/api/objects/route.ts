import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authorizationResponse, authorizeObjectWrite } from '@/lib/security/ontology-policy'

// 对象实例查询（对象检索模块数据源）
export async function GET(req: NextRequest) {
  const typeApiName = req.nextUrl.searchParams.get('type') || 'TestEvent'
  const search = req.nextUrl.searchParams.get('q') || ''

  const ot = await db.objectType.findUnique({ where: { apiName: typeApiName }, include: { properties: true } })
  if (!ot) return NextResponse.json({ error: '对象类型不存在' }, { status: 404 })

  const entries = await db.objectEntry.findMany({ where: { objectTypeId: ot.id }, orderBy: { pk: 'asc' } })
  const all = entries.map((e) => ({ id: e.id, pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}'), updatedAt: e.updatedAt }))
  const objects = search
    ? all.filter((o) => JSON.stringify(o).toLowerCase().includes(search.toLowerCase()))
    : all

  return NextResponse.json({
    objectType: { apiName: ot.apiName, displayName: ot.displayName, icon: ot.icon, description: ot.description, objectCount: all.length },
    properties: ot.properties.map((p) => ({ apiName: p.apiName, displayName: p.displayName, dataType: p.dataType, isDerived: p.isDerived })),
    objects,
  })
}

// 更新对象：actor 只能来自服务端认证身份，且必须通过 Object policy。
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, data } = body
  const entry = await db.objectEntry.findUnique({ where: { id }, include: { objectType: true } })
  if (!entry) return NextResponse.json({ error: '对象不存在' }, { status: 404 })

  let actor
  try {
    actor = await authorizeObjectWrite(req, entry.objectType.apiName)
  } catch (error) {
    const auth = authorizationResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : '身份认证失败' }, { status: 401 })
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return NextResponse.json({ error: 'data 必须为对象' }, { status: 400 })
  }
  const merged = { ...JSON.parse(entry.dataJson || '{}'), ...data }
  await db.objectEntry.update({ where: { id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
  await db.activityEvent.create({
    data: { actor: actor.actorId, module: 'Ontology', message: `对象 ${entry.pk} 属性已更新（${Object.keys(data).join(', ')}）` },
  })
  return NextResponse.json({ ok: true, data: merged, performedBy: actor.actorId })
}
