import { NextRequest, NextResponse } from 'next/server'
import { authorizationResponse, authorizeSysmlProjection } from '@/lib/security/ontology-policy'
import { projectSysmlCommit } from '@/lib/sysml-v2-projection'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const projectId = String(body.projectId || '')
  const commitId = String(body.commitId || '')
  if (!projectId || !commitId) {
    return NextResponse.json({ error: '缺少 projectId / commitId' }, { status: 400 })
  }

  let actor
  try {
    actor = await authorizeSysmlProjection(req)
  } catch (error) {
    const auth = authorizationResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : '身份认证失败' }, { status: 401 })
  }

  try {
    return NextResponse.json(await projectSysmlCommit(projectId, commitId, actor.actorId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SysML v2 semantic projection 失败' }, { status: 502 })
  }
}
