import type { NextRequest } from 'next/server'
import { resolveRequestIdentity, type AuthenticatedIdentity } from '@/lib/security/identity'

export type OntologyActor = {
  actorId: string
  displayName: string
  roles: string[]
  groups: string[]
  identity: AuthenticatedIdentity | null
}

export class OntologyAuthorizationError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.name = 'OntologyAuthorizationError'
    this.status = status
  }
}

const ACTION_ROLES: Record<string, string[]> = {
  issueTestOrder: ['test-director', 'test-executor'],
  closeDeficiency: ['test-director', 'evaluation-authority'],
  submitReport: ['evaluation-authority', 'final-approver'],
  createDeficiency: ['test-executor', 'test-director', 'evidence-manager'],
  authorizeLiveFire: ['test-director'],
}

const OBJECT_WRITE_ROLES = new Set([
  'configuration-manager',
  'model-owner',
  'evidence-manager',
  'test-director',
  'evaluation-authority',
  'qualification-authority',
  'accreditation-authority',
])

const SYSML_PROJECTION_ROLES = new Set([
  'configuration-manager',
  'model-owner',
  'qualification-authority',
  'accreditation-authority',
])

function hasAnyRole(actor: OntologyActor, allowed: Iterable<string>) {
  const roles = new Set(actor.roles)
  for (const role of allowed) if (roles.has(role)) return true
  return false
}

export async function resolveOntologyActor(req: NextRequest): Promise<OntologyActor> {
  const identity = await resolveRequestIdentity(req)
  if (!identity) {
    if ((process.env.DTEP_AUTH_MODE || 'demo').toLowerCase() !== 'demo') {
      throw new OntologyAuthorizationError('Ontology 写操作需要认证身份', 401)
    }
    return {
      actorId: 'DEMO-OPERATOR',
      displayName: '演示操作员',
      roles: ['demo-admin'],
      groups: ['DTEP-DEMO'],
      identity: null,
    }
  }
  if (!identity.actorId) throw new OntologyAuthorizationError('OIDC 身份未映射 dtep_actor_id', 403)
  return {
    actorId: identity.actorId,
    displayName: identity.displayName,
    roles: identity.roles,
    groups: identity.groups,
    identity,
  }
}

export async function authorizeOntologyAction(req: NextRequest, actionApiName: string): Promise<OntologyActor> {
  const actor = await resolveOntologyActor(req)
  if (actor.roles.includes('demo-admin')) return actor
  const allowed = ACTION_ROLES[actionApiName]
  if (!allowed || !hasAnyRole(actor, allowed)) {
    throw new OntologyAuthorizationError(`身份 ${actor.actorId} 无权执行 Ontology Action ${actionApiName}`)
  }
  return actor
}

export async function authorizeObjectWrite(req: NextRequest, objectTypeApiName: string): Promise<OntologyActor> {
  const actor = await resolveOntologyActor(req)
  if (actor.roles.includes('demo-admin')) return actor
  if (!hasAnyRole(actor, OBJECT_WRITE_ROLES)) {
    throw new OntologyAuthorizationError(`身份 ${actor.actorId} 无权修改 Ontology Object ${objectTypeApiName}`)
  }
  return actor
}

export async function authorizeSysmlProjection(req: NextRequest): Promise<OntologyActor> {
  const actor = await resolveOntologyActor(req)
  if (actor.roles.includes('demo-admin')) return actor
  if (!hasAnyRole(actor, SYSML_PROJECTION_ROLES)) {
    throw new OntologyAuthorizationError(`身份 ${actor.actorId} 无权写入 SysML v2 T&E semantic projection`)
  }
  return actor
}

export function authorizationResponse(error: unknown) {
  if (error instanceof OntologyAuthorizationError) {
    return { status: error.status, body: { error: error.message } }
  }
  return null
}
