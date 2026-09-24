import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 判读管道详情（含节点 + 运行历史）
export async function GET() {
  const pipelines = await db.testPipeline.findMany({
    include: {
      nodes: { orderBy: { order: 'asc' } },
      builds: { orderBy: { startedAt: 'desc' }, take: 8 },
    },
  })
  return NextResponse.json({
    pipelines: pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      schedule: p.schedule,
      lastBuildStatus: p.lastBuildStatus,
      lastBuildAt: p.lastBuildAt,
      nodes: p.nodes.map((n) => ({ id: n.id, type: n.nodeType, label: n.label, config: JSON.parse(n.configJson || '{}'), x: n.x, y: n.y, order: n.order })),
      builds: p.builds.map((b) => ({ id: b.id, status: b.status, startedAt: b.startedAt, finishedAt: b.finishedAt, rowsProcessed: b.rowsProcessed, durationSec: b.durationSec, logs: JSON.parse(b.logsJson || '[]') })),
    })),
  })
}

// 触发判读运行（模拟真实过程：插入 running → 完成记录）
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { pipelineId } = body
  const pipeline = await db.testPipeline.findUnique({ where: { id: pipelineId }, include: { nodes: true } })
  if (!pipeline) return NextResponse.json({ error: '判读管道不存在' }, { status: 404 })

  const rows = 11000 + Math.floor(Math.random() * 18000)
  const duration = 15 + Math.floor(Math.random() * 25)
  const logs = [
    { t: '+0s', level: 'info', msg: `判读作业启动：解析 ${pipeline.nodes.length} 个节点，调度计算集群` },
    { t: '+4s', level: 'info', msg: '读取原始数据集 raw/telemetry/F-2207（28,800 帧，IRIG-B 时统）' },
    { t: '+9s', level: 'info', msg: '时统校正完成，剔除异常帧 23 帧，光测/雷测/遥测对齐' },
    { t: `+${Math.floor(duration * 0.6)}s`, level: 'info', msg: `多源融合解算完成，输出 ${rows.toLocaleString()} 点` },
    { t: `+${duration - 2}s`, level: 'info', msg: '指标统计写入 stg/evaluation/metrics，数据质量校验通过（时统残差/完整性/冗余度）' },
  ]

  const build = await db.testBuild.create({
    data: { pipelineId, status: 'succeeded', startedAt: new Date(), finishedAt: new Date(), rowsProcessed: rows, durationSec: duration, logsJson: JSON.stringify(logs) },
  })
  await db.testPipeline.update({ where: { id: pipelineId }, data: { lastBuildStatus: 'succeeded', lastBuildAt: new Date() } })
  await db.activityEvent.create({
    data: { actor: '数据分析组', module: 'Pipeline', message: `「${pipeline.name}」判读运行成功（${rows.toLocaleString()} 点，${duration}s），指标统计已更新` },
  })
  return NextResponse.json({
    build: { id: build.id, status: 'succeeded', rowsProcessed: rows, durationSec: duration, logs },
  })
}
