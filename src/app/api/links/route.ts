import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Direction = 'out' | 'in' | 'both'

function serializeObject(entry: any) {
  return {
    id: entry.id,
    type: entry.objectType.apiName,
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}'),
  }
}

export async function GET(req: NextRequest) {
  const objectId = req.nextUrl.searchParams.get('id')
  const type = req.nextUrl.searchParams.get('type')
  const pk = req.nextUrl.searchParams.get('pk')
  const linkType = req.nextUrl.searchParams.get('linkType')
  const direction = (req.nextUrl.searchParams.get('direction') || 'both') as Direction
  const depth = Math.min(3, Math.max(1, Number(req.nextUrl.searchParams.get('depth') || 1)))

  if (!['out', 'in', 'both'].includes(direction)) {
    return NextResponse.json({ error: 'direction 必须为 out / in / both' }, { status: 400 })
  }

  let root
  if (objectId) {
    root = await db.objectEntry.findUnique({ where: { id: objectId }, include: { objectType: true } })
  } else if (type && pk) {
    const objectType = await db.objectType.findUnique({ where: { apiName: type } })
    if (!objectType) return NextResponse.json({ error: '对象类型不存在' }, { status: 404 })
    root = await db.objectEntry.findUnique({
      where: { objectTypeId_pk: { objectTypeId: objectType.id, pk } },
      include: { objectType: true },
    })
  } else {
    return NextResponse.json({ error: '需要 id，或 type + pk' }, { status: 400 })
  }
  if (!root) return NextResponse.json({ error: '对象不存在' }, { status: 404 })

  const visited = new Set<string>([root.id])
  let frontier = new Set<string>([root.id])
  const links: any[] = []
  const nodes = new Map<string, any>([[root.id, serializeObject(root)]])

  for (let level = 1; level <= depth && frontier.size; level += 1) {
    const ids = [...frontier]
    const clauses: any[] = []
    if (direction === 'out' || direction === 'both') clauses.push({ sourceObjectId: { in: ids } })
    if (direction === 'in' || direction === 'both') clauses.push({ targetObjectId: { in: ids } })
    const rows = await db.linkEntry.findMany({
      where: {
        OR: clauses,
        ...(linkType ? { linkType: { apiName: linkType } } : {}),
      },
      include: {
        linkType: true,
        sourceObject: { include: { objectType: true } },
        targetObject: { include: { objectType: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const next = new Set<string>()
    for (const row of rows) {
      if (!links.some((x) => x.id === row.id)) {
        links.push({
          id: row.id,
          type: row.linkType.apiName,
          displayName: row.linkType.displayName,
          sourceObjectId: row.sourceObjectId,
          targetObjectId: row.targetObjectId,
          sourceSystem: row.sourceSystem,
          sourceRef: row.sourceRef,
          properties: JSON.parse(row.propertiesJson || '{}'),
          level,
        })
      }
      nodes.set(row.sourceObjectId, serializeObject(row.sourceObject))
      nodes.set(row.targetObjectId, serializeObject(row.targetObject))
      for (const id of [row.sourceObjectId, row.targetObjectId]) {
        if (!visited.has(id)) {
          visited.add(id)
          next.add(id)
        }
      }
    }
    frontier = next
  }

  return NextResponse.json({
    root: serializeObject(root),
    direction,
    depth,
    linkType: linkType || null,
    nodes: [...nodes.values()],
    links,
  })
}
