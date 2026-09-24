import { NextRequest, NextResponse } from 'next/server'
import { buildChinaTeGovernanceSnapshotV231 } from '@/lib/china-te-governance-v231'

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId') || 'CASE-01'
  try {
    return NextResponse.json(await buildChinaTeGovernanceSnapshotV231(caseId))
  } catch (error) {
    const message = error instanceof Error ? error.message : '试验鉴定治理快照生成失败'
    return NextResponse.json(
      { error: message },
      { status: /不存在/.test(message) ? 404 : 500 },
    )
  }
}
