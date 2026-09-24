import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestIdentity } from '@/lib/security/identity'

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveRequestIdentity(req)
    if (!identity) return NextResponse.json({ authenticated: false, mode: 'demo' })
    return NextResponse.json({ authenticated: true, mode: 'oidc', identity })
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: error instanceof Error ? error.message : '身份解析失败' }, { status: 401 })
  }
}
