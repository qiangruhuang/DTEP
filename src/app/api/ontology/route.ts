import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 试验本体定义：对象类型（任务/被试系统/事件/指标/缺陷/报告/模型）+ 链接类型 + 动作类型 + 执行日志
export async function GET() {
  const [objectTypes, linkTypes, actionTypes, actionLogs] = await Promise.all([
    db.objectType.findMany({ orderBy: { createdAt: 'asc' }, include: { properties: { orderBy: { apiName: 'asc' } }, entries: true } }),
    db.linkType.findMany(),
    db.actionType.findMany(),
    db.actionLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { actionType: true } }),
  ])

  const typeById = Object.fromEntries(objectTypes.map((t) => [t.id, t]))

  return NextResponse.json({
    objectTypes: objectTypes.map((t) => ({
      id: t.id,
      apiName: t.apiName,
      displayName: t.displayName,
      description: t.description,
      icon: t.icon,
      objectCount: t.entries.length,
      properties: t.properties.map((p) => ({ apiName: p.apiName, displayName: p.displayName, dataType: p.dataType, description: p.description, isDerived: p.isDerived })),
    })),
    linkTypes: linkTypes.map((l) => ({
      id: l.id,
      apiName: l.apiName,
      displayName: l.displayName,
      cardinality: l.cardinality,
      source: typeById[l.sourceTypeId]?.apiName ?? '?',
      target: typeById[l.targetTypeId]?.apiName ?? '?',
    })),
    actionTypes: actionTypes.map((a) => ({
      id: a.id,
      apiName: a.apiName,
      displayName: a.displayName,
      appliesTo: typeById[a.objectTypeId]?.apiName ?? '?',
      parameters: JSON.parse(a.parametersJson || '[]'),
      description: a.description,
      status: a.status,
    })),
    actionLogs: actionLogs.map((l) => ({
      id: l.id,
      actionType: l.actionType.displayName,
      objectPk: l.objectPk,
      parameters: JSON.parse(l.parametersJson || '{}'),
      status: l.status,
      performedBy: l.performedBy,
      createdAt: l.createdAt,
    })),
  })
}
