import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 最近平台活动
export async function GET() {
  const activities = await db.activityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  return NextResponse.json({
    activities: activities.map((a) => ({ id: a.id, actor: a.actor, module: a.module, message: a.message, createdAt: a.createdAt })),
  })
}
