import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

// 更新对象（写回示例）
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, data } = body
  const entry = await db.objectEntry.findUnique({ where: { id } })
  if (!entry) return NextResponse.json({ error: '对象不存在' }, { status: 404 })
  const merged = { ...JSON.parse(entry.dataJson || '{}'), ...data }
  await db.objectEntry.update({ where: { id }, data: { dataJson: JSON.stringify(merged), updatedAt: new Date() } })
  await db.activityEvent.create({
    data: { actor: '系统管理员', module: 'Ontology', message: `对象 ${entry.pk} 属性已更新（${Object.keys(data).join(', ')}）` },
  })
  return NextResponse.json({ ok: true, data: merged })
}
