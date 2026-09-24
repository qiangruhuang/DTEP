import { NextRequest, NextResponse } from 'next/server'
import { DP30_STEPS, approveDp30Step, executeDp30Step, getDp30State, requestDp30Approval, resetDp30Demo, type Dp30StepId } from '@/lib/dp30-intake'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function GET(req: NextRequest) {
  try { const supplied=req.nextUrl.searchParams.get('actorId'); const actorId = supplied || process.env.DTEP_AUTH_MODE === 'oidc' ? await resolveGovernanceActorId(req, supplied) : supplied; return NextResponse.json(await getDp30State(actorId)) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '3.0接收Case读取失败' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { operation?: 'reset' | 'request-approval' | 'approve' | 'execute'; stepId?: Dp30StepId; actorId?: string }
  try {
    if (body.operation === 'reset') {
      if (process.env.DTEP_AUTH_MODE === 'oidc') {
        const resetActorId = await resolveGovernanceActorId(req, body.actorId ?? null)
        if (resetActorId !== 'DPA-ZHAO') return NextResponse.json({ error: '工程/生产模式仅模型资格认可授权人可执行3.0接收Demo Reset' }, { status: 403 })
      }
      return NextResponse.json(await resetDp30Demo())
    }
    if (!body.stepId || !DP30_STEPS.some((x) => x.id === body.stepId)) return NextResponse.json({ error: '缺少或未知 stepId' }, { status: 400 })
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    if (body.operation === 'request-approval') return NextResponse.json(await requestDp30Approval(body.stepId, actorId))
    if (body.operation === 'approve') return NextResponse.json(await approveDp30Step(body.stepId, actorId))
    if (body.operation === 'execute') return NextResponse.json(await executeDp30Step(body.stepId, actorId))
    return NextResponse.json({ error: '未知 operation' }, { status: 400 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '受控状态迁移失败' }, { status: 409 }) }
}
