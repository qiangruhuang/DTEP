import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { stableJson, sha256Digest } from './canonical'

export type DigitalSignatureEnvelope = {
  scheme: 'ED25519-DETACHED-v1'
  keyId: string
  publicKeyPem: string
  publicKeyFingerprint: string
  signatureValue: string
  signedPayload: Record<string, unknown>
}

function keyRoot() {
  return process.env.DTEP_LOCAL_SIGNING_KEY_DIR || path.join(process.cwd(), '.runtime', 'pki', 'actors')
}

function publicKeyFingerprint(publicKeyPem: string) {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer
  return sha256Digest({ spkiDerBase64: der.toString('base64') })
}

function actorKeyPaths(actorId: string) {
  const safe = actorId.replace(/[^A-Za-z0-9_.-]/g, '_')
  return {
    privateKeyPath: path.join(keyRoot(), `${safe}.ed25519.private.pem`),
    publicKeyPath: path.join(keyRoot(), `${safe}.ed25519.public.pem`),
  }
}

export async function signGovernancePayload(actorId: string, payload: Record<string, unknown>): Promise<DigitalSignatureEnvelope> {
  const mode = (process.env.DTEP_SIGNING_MODE || 'local-ed25519').toLowerCase()
  if (mode === 'remote-http') {
    const url = process.env.DTEP_SIGNER_URL
    if (!url) throw new Error('DTEP_SIGNER_URL未配置')
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (process.env.DTEP_SIGNER_API_TOKEN) headers.Authorization = `Bearer ${process.env.DTEP_SIGNER_API_TOKEN}`
    const res = await fetch(`${url.replace(/\/$/, '')}/sign`, { method: 'POST', headers, body: JSON.stringify({ actorId, payload }) })
    if (!res.ok) throw new Error(`远程签名服务失败: ${res.status}`)
    const envelope = await res.json() as DigitalSignatureEnvelope
    if (!verifyDigitalSignatureEnvelope(envelope)) throw new Error('远程签名服务返回的签名无法验证')
    return envelope
  }
  if (mode !== 'local-ed25519') throw new Error(`未配置可用签名适配器: ${mode}`)
  const paths = actorKeyPaths(actorId)
  let privateKeyPem: string
  let publicKeyPem: string
  try {
    privateKeyPem = readFileSync(paths.privateKeyPath, 'utf8')
    publicKeyPem = readFileSync(paths.publicKeyPath, 'utf8')
  } catch {
    throw new Error(`未找到${actorId}工程PKI密钥；先执行 scripts/bootstrap_engineering_pki.py`)
  }
  const privateKey = createPrivateKey(privateKeyPem)
  const canonical = Buffer.from(stableJson(payload), 'utf8')
  const signatureValue = cryptoSign(null, canonical, privateKey).toString('base64')
  return {
    scheme: 'ED25519-DETACHED-v1',
    keyId: `local-engineering:${actorId}`,
    publicKeyPem,
    publicKeyFingerprint: publicKeyFingerprint(publicKeyPem),
    signatureValue,
    signedPayload: payload,
  }
}

export function verifyDigitalSignatureEnvelope(envelope: Partial<DigitalSignatureEnvelope>): boolean {
  try {
    if (envelope.scheme !== 'ED25519-DETACHED-v1' || !envelope.publicKeyPem || !envelope.signatureValue || !envelope.signedPayload) return false
    if (publicKeyFingerprint(envelope.publicKeyPem) !== envelope.publicKeyFingerprint) return false
    const key = createPublicKey(envelope.publicKeyPem)
    return cryptoVerify(null, Buffer.from(stableJson(envelope.signedPayload), 'utf8'), key, Buffer.from(envelope.signatureValue, 'base64'))
  } catch {
    return false
  }
}
