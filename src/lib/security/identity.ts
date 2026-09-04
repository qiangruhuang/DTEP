import { createPublicKey, verify as cryptoVerify } from 'crypto'
import type { NextRequest } from 'next/server'

export type AuthenticatedIdentity = {
  subject: string
  issuer: string
  audience: string[]
  displayName: string
  email?: string
  actorId?: string
  roles: string[]
  groups: string[]
  assurance: string
  authenticatedAt: string
  tokenId?: string
}

type Jwk = Record<string, any>
type JwtPayload = Record<string, any>

function b64urlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : ''
  return Buffer.from(normalized + pad, 'base64')
}

function parseJwt(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('JWT格式错误')
  const header = JSON.parse(b64urlDecode(parts[0]).toString('utf8')) as Record<string, any>
  const payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8')) as JwtPayload
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: b64urlDecode(parts[2]) }
}

function normalizeAudience(aud: unknown): string[] {
  if (Array.isArray(aud)) return aud.map(String)
  if (typeof aud === 'string') return [aud]
  return []
}

function claimList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(/[ ,]+/).filter(Boolean)
  return []
}

async function fetchJwks(uri: string): Promise<{ keys: Jwk[] }> {
  const res = await fetch(uri, { cache: 'no-store' })
  if (!res.ok) throw new Error(`OIDC JWKS获取失败: ${res.status}`)
  return await res.json() as { keys: Jwk[] }
}

export async function verifyOidcToken(token: string, nowSec = Math.floor(Date.now() / 1000)): Promise<AuthenticatedIdentity> {
  const issuer = process.env.DTEP_OIDC_ISSUER?.replace(/\/$/, '')
  const audience = process.env.DTEP_OIDC_AUDIENCE
  const jwksUri = process.env.DTEP_OIDC_JWKS_URI || (issuer ? `${issuer}/jwks` : '')
  if (!issuer || !audience || !jwksUri) throw new Error('OIDC未配置：DTEP_OIDC_ISSUER/AUDIENCE/JWKS_URI')

  const parsed = parseJwt(token)
  if (parsed.header.alg !== 'RS256') throw new Error(`仅允许RS256 OIDC token，当前=${parsed.header.alg ?? 'unknown'}`)
  if (!parsed.header.kid) throw new Error('OIDC token缺少kid')
  const jwks = await fetchJwks(jwksUri)
  const jwk = jwks.keys.find((key) => key.kid === parsed.header.kid && key.kty === 'RSA')
  if (!jwk) throw new Error('OIDC token对应JWK不存在')
  const key = createPublicKey({ key: jwk, format: 'jwk' })
  const ok = cryptoVerify('RSA-SHA256', Buffer.from(parsed.signingInput), key, parsed.signature)
  if (!ok) throw new Error('OIDC token签名校验失败')

  const payload = parsed.payload
  if (payload.iss !== issuer) throw new Error('OIDC issuer不匹配')
  const audiences = normalizeAudience(payload.aud)
  if (!audiences.includes(audience)) throw new Error('OIDC audience不匹配')
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) throw new Error('OIDC token已过期')
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 30) throw new Error('OIDC token尚未生效')
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 30) throw new Error('OIDC token签发时间异常')
  if (!payload.sub) throw new Error('OIDC token缺少sub')

  const roleClaim = process.env.DTEP_OIDC_ROLE_CLAIM || 'roles'
  const groupClaim = process.env.DTEP_OIDC_GROUP_CLAIM || 'groups'
  const actorClaim = process.env.DTEP_OIDC_ACTOR_CLAIM || 'dtep_actor_id'
  return {
    subject: String(payload.sub),
    issuer,
    audience: audiences,
    displayName: String(payload.name || payload.preferred_username || payload.email || payload.sub),
    email: payload.email ? String(payload.email) : undefined,
    actorId: payload[actorClaim] ? String(payload[actorClaim]) : undefined,
    roles: claimList(payload[roleClaim]),
    groups: claimList(payload[groupClaim]),
    assurance: claimList(payload.amr).join('+') || String(payload.acr || 'OIDC-RS256'),
    authenticatedAt: new Date((typeof payload.auth_time === 'number' ? payload.auth_time : payload.iat || nowSec) * 1000).toISOString(),
    tokenId: payload.jti ? String(payload.jti) : undefined,
  }
}

export async function resolveRequestIdentity(req: NextRequest): Promise<AuthenticatedIdentity | null> {
  const mode = (process.env.DTEP_AUTH_MODE || 'demo').toLowerCase()
  if (mode === 'demo') return null
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) throw new Error('缺少Bearer身份令牌')
  return verifyOidcToken(header.slice(7).trim())
}

export async function resolveGovernanceActorId(req: NextRequest, suppliedActorId?: string | null): Promise<string> {
  const identity = await resolveRequestIdentity(req)
  if (!identity) {
    if (process.env.DTEP_ALLOW_DEMO_ROLE_SWITCH === 'false') throw new Error('DEMO身份切换已禁用')
    if (!suppliedActorId) throw new Error('缺少actorId')
    return suppliedActorId
  }
  if (!identity.actorId) throw new Error('OIDC身份未映射dtep_actor_id')
  if (suppliedActorId && suppliedActorId !== identity.actorId) throw new Error('请求actorId与认证身份不一致')
  return identity.actorId
}
