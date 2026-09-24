import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 试验资源列表（靶场/测控/仿真节点/威胁模拟）
export async function GET() {
  const resources = await db.testResource.findMany({ orderBy: { createdAt: 'asc' }, include: { datasets: true } })
  return NextResponse.json({
    resources: resources.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      kind: r.kind,
      site: r.site,
      description: r.description,
      status: r.status,
      utilization: r.utilization,
      lastHeartbeat: r.lastHeartbeat,
      dataVolume: r.dataVolume,
      heartbeatInterval: r.heartbeatInterval,
      datasetCount: r.datasets.length,
    })),
  })
}

// 接入新试验资源
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { name, kind, site, description, heartbeatInterval } = body
  if (!name || !kind) {
    return NextResponse.json({ error: '请填写资源名称与资源类型' }, { status: 400 })
  }
  const code = `R-${Math.floor(10 + Math.random() * 89)}`
  const resource = await db.testResource.create({
    data: {
      code,
      name,
      kind,
      site: site || '',
      description: description || '',
      heartbeatInterval: heartbeatInterval || '每 30 秒',
      status: 'online',
      lastHeartbeat: new Date(),
    },
  })
  await db.activityEvent.create({
    data: { actor: '试验总师', module: 'Data Resource', message: `接入试验资源「${name}」（${code}），资源心跳与数据通道已建立` },
  })
  return NextResponse.json({ resource })
}

// 心跳检测 / 注销
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, action } = body
  const resource = await db.testResource.findUnique({ where: { id } })
  if (!resource) return NextResponse.json({ error: '试验资源不存在' }, { status: 404 })

  if (action === 'ping') {
    const newVolume = resource.dataVolume + Math.floor(500 + Math.random() * 3000)
    await db.testResource.update({
      where: { id },
      data: { status: resource.status === 'offline' ? 'online' : resource.status, lastHeartbeat: new Date(), dataVolume: newVolume },
    })
    await db.activityEvent.create({
      data: { actor: '试验总师', module: 'Data Resource', message: `资源「${resource.name}」心跳检测正常，新增采集 ${(newVolume - resource.dataVolume).toLocaleString()} 数据点` },
    })
    return NextResponse.json({ ok: true, dataVolume: newVolume })
  }
  if (action === 'delete') {
    await db.testResource.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
