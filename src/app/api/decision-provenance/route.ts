import { NextResponse } from 'next/server'
import { getDecisionProvenance } from '@/lib/decision-provenance'

export async function GET() {
  try {
    return NextResponse.json(await getDecisionProvenance())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Decision Provenance 加载失败' }, { status: 500 })
  }
}
