import { NextRequest, NextResponse } from 'next/server'
import { getCase01StateMachine } from '@/lib/case01-state-machine'
import { automatedAdjudicationRequiredForStep, executeAutomatedAdjudicationOperation, type AutomatedAdjudicationOperation, type EventToMeasureStepId } from '@/lib/event-to-measure'
import { resolveGovernanceActorId } from '@/lib/security/identity'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { operation?: AutomatedAdjudicationOperation; stepId?: string; actorId?: string }
  try {
    if (!body.stepId || !automatedAdjudicationRequiredForStep(body.stepId)) return NextResponse.json({ error: '当前步骤不属于Event-to-Measure自动判读范围' }, { status: 400 })
    const actorId = await resolveGovernanceActorId(req, body.actorId ?? null)
    if (body.operation !== 'adjudicate') return NextResponse.json({ error: '未知Automated Adjudication operation' }, { status: 400 })
    await executeAutomatedAdjudicationOperation(body.stepId as EventToMeasureStepId, body.operation, actorId)
    return NextResponse.json(await getCase01StateMachine(actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Event-to-Measure自动判读失败' }, { status: 409 })
  }
}
