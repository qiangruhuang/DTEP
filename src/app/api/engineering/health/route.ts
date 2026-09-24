import { NextResponse } from 'next/server'
import { ENGINEERING_ADAPTERS } from '@/lib/adapters/contracts'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const dbCheck = await db.objectType.count()
    return NextResponse.json({
      status: 'ok',
      architecture: 'v2.1-frozen',
      engineeringBaseline: 'v2.1.1',
      authMode: process.env.DTEP_AUTH_MODE || 'demo',
      signingMode: process.env.DTEP_SIGNING_MODE || 'local-ed25519',
      objectTypes: dbCheck,
      adapters: ENGINEERING_ADAPTERS,
      runtime: { node: process.version, pid: process.pid },
    })
  } catch (error) {
    return NextResponse.json({ status: 'degraded', error: error instanceof Error ? error.message : String(error) }, { status: 503 })
  }
}
