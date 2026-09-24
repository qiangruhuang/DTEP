import { NextRequest, NextResponse } from 'next/server'
import { CASE01_STEPS, executeCase01Step, getCase01StateMachine, resetCase01Demo, type Case01StepId } from '@/lib/case01-state-machine'
import { approveStep, requestStepApproval } from '@/lib/case01-governance'
import { executeReadinessReview, readinessApprovalContext, readinessRequiredForStep, type ReadinessStepId } from '@/lib/test-readiness-review'
import { expertReviewApprovalContext } from '@/lib/expert-review'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function GET(req: NextRequest) {
  try {
    const supplied = req.nextUrl.searchParams.get('actorId')
    const actorId = supplied || process.env.DTEP_AUTH_MODE === 'oidc' ? await resolveGovernanceActorId(req, supplied) : supplied
    return NextResponse.json(await getCase01StateMachine(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '状态机读取失败' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    operation?: 'reset' | 'run-readiness' | 'request-approval' | 'approve' | 'execute'
    stepId?: Case01StepId
    actorId?: string
  }
  try {
    if (body.operation === 'reset') {
      if (process.env.DTEP_AUTH_MODE === 'oidc') {
        const resetActorId = await resolveGovernanceActorId(req, body.actorId ?? null)
        if (resetActorId !== 'ACT-QIN') return NextResponse.json({ error: '工程/生产模式仅鉴定批准人可执行Demo Reset' }, { status: 403 })
      }
      return NextResponse.json(await resetCase01Demo())
    }
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    if (!body.stepId || !CASE01_STEPS.some((step) => step.id === body.stepId)) return NextResponse.json({ error: '缺少或未知 stepId' }, { status: 400 })

    if (body.operation === 'run-readiness') {
      if (!readinessRequiredForStep(body.stepId)) return NextResponse.json({ error: '当前步骤不需要 Readiness Review' }, { status: 400 })
      await executeReadinessReview(body.stepId as ReadinessStepId, actorId)
      return NextResponse.json(await getCase01StateMachine(actorId))
    }
    if (body.operation === 'request-approval') {
      const readinessContext = readinessRequiredForStep(body.stepId) ? await readinessApprovalContext(body.stepId) : null
      const expertReviewContext = body.stepId === 'freeze-conclusion' ? await expertReviewApprovalContext() : null
      await requestStepApproval(body.stepId, actorId, expertReviewContext ?? readinessContext)
      return NextResponse.json(await getCase01StateMachine(actorId))
    }
    if (body.operation === 'approve') {
      await approveStep(body.stepId, actorId)
      return NextResponse.json(await getCase01StateMachine(actorId))
    }
    if (body.operation === 'execute') return NextResponse.json(await executeCase01Step(body.stepId, actorId))
    return NextResponse.json({ error: '未知 operation' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '受控状态迁移失败'
    const status = /身份|Bearer|OIDC|actorId/.test(message) ? 401 : 409
    return NextResponse.json({ error: message }, { status })
  }
}
