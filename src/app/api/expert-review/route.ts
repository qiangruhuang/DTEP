import { NextRequest, NextResponse } from 'next/server'
import { executeExpertReviewOperation, getExpertReviewState, type ExpertReviewOperation } from '@/lib/expert-review'
import { getCase01StateMachine } from '@/lib/case01-state-machine'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function GET(req: NextRequest) {
  try {
    const supplied = req.nextUrl.searchParams.get('actorId')
    const actorId = supplied || process.env.DTEP_AUTH_MODE === 'oidc' ? await resolveGovernanceActorId(req, supplied) : supplied
    return NextResponse.json(await getExpertReviewState(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '专家合议读取失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { operation?: ExpertReviewOperation; actorId?: string; disposition?: string; challengeType?: string; reason?: string; supplementalComment?: string }
  try {
    if (!body.operation) return NextResponse.json({ error: '缺少 operation' }, { status: 400 })
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    await executeExpertReviewOperation(body.operation, actorId, body as Record<string, any>)
    return NextResponse.json(await getCase01StateMachine(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '专家合议操作失败' }, { status: 409 })
  }
}
