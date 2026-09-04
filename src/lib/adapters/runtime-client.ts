export type EngineeringAdapterResult = Record<string, any> & { decision?: string; adapter?: string }

function adapterBaseUrl() {
  return (process.env.DTEP_ADAPTER_DAEMON_URL || '').replace(/\/$/, '')
}

export async function runEngineeringAdapter(endpoint: 'fmi/conformance' | 'sal/conformance' | 'lvc/federation', count: number): Promise<EngineeringAdapterResult | null> {
  const base = adapterBaseUrl()
  if (!base) return null
  try {
    const res = await fetch(`${base}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
      cache: 'no-store',
      signal: AbortSignal.timeout(Number(process.env.DTEP_ADAPTER_TIMEOUT_MS || 10000)),
    })
    const body = await res.json().catch(() => ({})) as EngineeringAdapterResult
    if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}: ${JSON.stringify(body)}`)
    return body
  } catch (error) {
    if ((process.env.DTEP_REQUIRE_ENGINEERING_ADAPTERS || '').toLowerCase() === 'true') {
      throw new Error(`工程Adapter执行失败(${endpoint})：${error instanceof Error ? error.message : String(error)}`)
    }
    return { decision: 'UNAVAILABLE', adapter: endpoint, error: error instanceof Error ? error.message : String(error) }
  }
}
