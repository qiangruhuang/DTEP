import { NextRequest, NextResponse } from 'next/server'
import { resolveOntologyActor } from '@/lib/security/ontology-policy'
import { sysmlV2 } from '@/lib/sysml-v2-client'

export async function GET(req: NextRequest) {
  try {
    await resolveOntologyActor(req)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '身份认证失败' }, { status: 401 })
  }

  const resource = req.nextUrl.searchParams.get('resource') || 'projects'
  const projectId = req.nextUrl.searchParams.get('projectId') || ''
  const commitId = req.nextUrl.searchParams.get('commitId') || ''
  const elementId = req.nextUrl.searchParams.get('elementId') || ''
  const direction = (req.nextUrl.searchParams.get('direction') || 'both') as 'in' | 'out' | 'both'

  try {
    if (resource === 'projects') {
      return NextResponse.json({ standard: 'OMG Systems Modeling API and Services 1.0', projects: await sysmlV2.listProjects() })
    }
    if (resource === 'commits') {
      if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })
      return NextResponse.json({ projectId, commits: await sysmlV2.listCommits(projectId) })
    }
    if (resource === 'elements') {
      if (!projectId || !commitId) return NextResponse.json({ error: '缺少 projectId / commitId' }, { status: 400 })
      return NextResponse.json({ projectId, commitId, elements: await sysmlV2.listElements(projectId, commitId) })
    }
    if (resource === 'element') {
      if (!projectId || !commitId || !elementId) return NextResponse.json({ error: '缺少 projectId / commitId / elementId' }, { status: 400 })
      return NextResponse.json({ projectId, commitId, element: await sysmlV2.getElement(projectId, commitId, elementId) })
    }
    if (resource === 'relationships') {
      if (!projectId || !commitId || !elementId) return NextResponse.json({ error: '缺少 projectId / commitId / elementId' }, { status: 400 })
      if (!['in', 'out', 'both'].includes(direction)) return NextResponse.json({ error: 'direction 必须为 in / out / both' }, { status: 400 })
      return NextResponse.json({
        projectId,
        commitId,
        elementId,
        direction,
        relationships: await sysmlV2.listRelationships(projectId, commitId, elementId, direction),
      })
    }
    return NextResponse.json({ error: 'resource 必须为 projects / commits / elements / element / relationships' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SysML v2 API 调用失败' }, { status: 502 })
  }
}
