import { NextRequest, NextResponse } from 'next/server'
import { buildChinaTeGovernanceSnapshot } from '@/lib/china-te-governance'

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId') || 'CASE-01'
  try {
    return NextResponse.json(await buildChinaTeGovernanceSnapshot(caseId))
  } catch (error) {
    const message = error instanceof Error ? error.message : '试验鉴定治理快照生成失败'
    return NextResponse.json(
      { error: message },
      { status: message.includes('不存在') ? 404 : 500 },
    )
  }
}
