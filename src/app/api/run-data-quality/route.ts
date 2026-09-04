import { NextRequest, NextResponse } from 'next/server'
import { getCase01StateMachine } from '@/lib/case01-state-machine'
import { executeRunDataQualityOperation, runDataQualityRequiredForStep, type RunDataQualityOperation, type RunDataQualityStepId } from '@/lib/run-data-quality'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { operation?: RunDataQualityOperation; stepId?: string; actorId?: string }
  try {
    if (!body.stepId || !runDataQualityRequiredForStep(body.stepId)) return NextResponse.json({ error: '当前步骤不属于Run Data Quality治理范围' }, { status: 400 })
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    if (!body.operation || !['reconstruct', 'remediate-reconstruct'].includes(body.operation)) return NextResponse.json({ error: '未知Run Data Quality operation' }, { status: 400 })
    await executeRunDataQualityOperation(body.stepId as RunDataQualityStepId, body.operation, actorId)
    return NextResponse.json(await getCase01StateMachine(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Run Data Quality操作失败' }, { status: 409 })
  }
}
