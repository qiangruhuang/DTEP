import { NextRequest, NextResponse } from 'next/server'
import { getCase01StateMachine } from '@/lib/case01-state-machine'
import { executeRunControlOperation, runControlRequiredForStep, type RunControlOperation, type RunControlStepId } from '@/lib/run-control-monitoring'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { operation?: RunControlOperation; stepId?: string; actorId?: string }
  try {
    if (!body.stepId || !runControlRequiredForStep(body.stepId)) return NextResponse.json({ error: '当前步骤不属于Run Control治理范围' }, { status: 400 })
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    if (!body.operation || !['start', 'monitor', 'pause', 'remediate', 'resume', 'prepare-complete', 'abort'].includes(body.operation)) return NextResponse.json({ error: '未知Run Control operation' }, { status: 400 })
    await executeRunControlOperation(body.stepId as RunControlStepId, body.operation, actorId)
    return NextResponse.json(await getCase01StateMachine(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Run Control操作失败' }, { status: 409 })
  }
}
