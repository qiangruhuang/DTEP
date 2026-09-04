import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deriveRunAudit } from '@/lib/run-instance'

async function entries(apiName: string) {
  const type = await db.objectType.findUnique({ where: { apiName }, include: { entries: true } })
  return (type?.entries ?? []).map((entry) => ({
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}') as Record<string, any>,
  }))
}

export async function GET() {
  const [runs, packages, ruleSets] = await Promise.all([
    entries('TestRun'),
    entries('EvidencePackage'),
    entries('EvidenceGateRuleSet'),
  ])

  return NextResponse.json({
    runs: runs.filter((r) => r.data.caseId === 'CASE-01').map((r) => ({ ...r, data: { ...r.data, audit: deriveRunAudit(r.data) } })),
    packages: packages.filter((p) => p.data.caseId === 'CASE-01'),
    ruleSets: ruleSets.filter((r) => r.data.caseId === 'CASE-01'),
  })
}
