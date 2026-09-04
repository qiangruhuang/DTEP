import { NextResponse } from 'next/server'
import { buildChinaTeGovernanceSnapshot } from '@/lib/china-te-governance'

export async function GET() {
  try {
    return NextResponse.json(await buildChinaTeGovernanceSnapshot())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '试验鉴定治理快照生成失败' },
      { status: 500 },
    )
  }
}
