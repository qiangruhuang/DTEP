import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`
}

async function getType(apiName: string) {
  return db.objectType.findUnique({ where: { apiName } })
}

async function getEntries(apiName: string, ids: string[]) {
  if (!ids.length) return []
  const type = await getType(apiName)
  if (!type) throw new Error(`${apiName} 本体未初始化`)
  return db.objectEntry.findMany({ where: { objectTypeId: type.id, pk: { in: ids } } })
}

function refs(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function ensureResolved(label: string, wanted: string[], found: { pk?: string; path?: string }[]) {
  const keys = new Set(found.map((item) => String(item.pk ?? item.path ?? '')))
  const missing = wanted.filter((id) => !keys.has(id))
  if (missing.length) throw new Error(`${label} 存在无法解析引用：${missing.join('、')}`)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { packageId?: string; frozenBy?: string }
  if (!body.packageId) return NextResponse.json({ error: '缺少 packageId' }, { status: 400 })
  if (body.packageId === 'EP-CASE01-M13-V0.4') {
    return NextResponse.json({ error: 'EP-CASE01-M13-V0.4 由 CASE-01 状态机受控冻结，请执行状态机当前步骤' }, { status: 409 })
  }

  try {
    const packageType = await getType('EvidencePackage')
    if (!packageType) return NextResponse.json({ error: 'Evidence Package 本体未初始化' }, { status: 404 })
    const pkg = await db.objectEntry.findFirst({ where: { objectTypeId: packageType.id, pk: body.packageId } })
    if (!pkg) return NextResponse.json({ error: 'Evidence Package 不存在' }, { status: 404 })

    const data = JSON.parse(pkg.dataJson || '{}') as Record<string, any>
    if (String(data.status).startsWith('已冻结')) return NextResponse.json({ packageId: body.packageId, data, unchanged: true })

    const runIds = refs(data.runRefs)
    const datasetPaths = refs(data.datasetRefs)
    const modelIds = refs(data.modelRefs)
    const scenarioIds = refs(data.scenarioRefs)
    const measureIds = refs(data.measureRefs)
    const ruleSetId = String(data.ruleSetRef ?? '')

    if (!runIds.length) return NextResponse.json({ error: '证据包没有 Run，不能冻结' }, { status: 409 })
    if (!ruleSetId) return NextResponse.json({ error: '证据包未绑定 Evidence Gate Rule Set，不能冻结' }, { status: 409 })

    const [runEntries, datasets, modelEntries, scenarioEntries, measureEntries, ruleEntries] = await Promise.all([
      getEntries('TestRun', runIds),
      db.testDataset.findMany({ where: { path: { in: datasetPaths } } }),
      getEntries('ModelAsset', modelIds),
      getEntries('TestScenario', scenarioIds),
      getEntries('Measure', measureIds),
      getEntries('EvidenceGateRuleSet', [ruleSetId]),
    ])

    ensureResolved('Run', runIds, runEntries)
    ensureResolved('Dataset', datasetPaths, datasets)
    ensureResolved('ModelAsset', modelIds, modelEntries)
    ensureResolved('TestScenario', scenarioIds, scenarioEntries)
    ensureResolved('Measure', measureIds, measureEntries)
    ensureResolved('EvidenceGateRuleSet', [ruleSetId], ruleEntries)

    const ruleData = JSON.parse(ruleEntries[0].dataJson || '{}') as Record<string, any>
    if (!String(ruleData.status ?? '').startsWith('已发布')) {
      return NextResponse.json({ error: `规则集 ${ruleSetId} 不是已发布版本，不能冻结正式证据包` }, { status: 409 })
    }

    const snapshotEntry = (entry: { pk: string; title: string; dataJson: string }) => ({
      pk: entry.pk,
      title: entry.title,
      data: JSON.parse(entry.dataJson || '{}'),
    })

    const manifest = {
      schema: 'dtep/evidence-package-manifest/v1',
      packageId: body.packageId,
      version: data.version,
      scope: data.scope,
      runRefs: runIds,
      datasetRefs: datasetPaths,
      modelRefs: modelIds,
      scenarioRefs: scenarioIds,
      measureRefs: measureIds,
      liveAnchorRefs: refs(data.liveAnchorRefs),
      ruleSetRef: ruleSetId,
      analysis: data.analysis ?? {},
      conclusionCandidate: data.conclusionCandidate ?? '',
      limitations: refs(data.limitations),
      runSnapshots: runEntries.sort((a, b) => a.pk.localeCompare(b.pk)).map(snapshotEntry),
      datasetSnapshots: datasets.sort((a, b) => a.path.localeCompare(b.path)).map((dataset) => ({
        path: dataset.path,
        name: dataset.name,
        domain: dataset.domain,
        origin: dataset.origin,
        status: dataset.status,
        rowCount: dataset.rowCount,
        sizeMb: dataset.sizeMb,
        qualityScore: dataset.qualityScore,
        schemaJson: dataset.schemaJson,
        lastBuiltAt: dataset.lastBuiltAt?.toISOString() ?? null,
      })),
      modelSnapshots: modelEntries.sort((a, b) => a.pk.localeCompare(b.pk)).map(snapshotEntry),
      scenarioSnapshots: scenarioEntries.sort((a, b) => a.pk.localeCompare(b.pk)).map(snapshotEntry),
      measureSnapshots: measureEntries.sort((a, b) => a.pk.localeCompare(b.pk)).map(snapshotEntry),
      ruleSetSnapshot: snapshotEntry(ruleEntries[0]),
    }
    const packageHash = sha256(manifest)
    const frozenAt = new Date().toISOString()
    const next = { ...data, status: '已冻结', packageHash, frozenAt, frozenBy: body.frozenBy ?? '试验总师 · 周衡', manifest }
    await db.objectEntry.update({ where: { id: pkg.id }, data: { dataJson: JSON.stringify(next) } })

    const actionType = await db.actionType.findFirst({ where: { apiName: 'freezeEvidencePackage' } })
    if (actionType) {
      await db.actionLog.create({
        data: {
          actionTypeId: actionType.id,
          objectPk: body.packageId,
          parametersJson: JSON.stringify({
            packageHash,
            frozenAt,
            runCount: runIds.length,
            datasetCount: datasetPaths.length,
            modelCount: modelIds.length,
            scenarioCount: scenarioIds.length,
            measureCount: measureIds.length,
            ruleSetRef: ruleSetId,
          }),
          status: 'succeeded',
          performedBy: body.frozenBy ?? '试验总师 · 周衡',
        },
      })
    }

    return NextResponse.json({ packageId: body.packageId, data: next })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '证据包冻结失败' }, { status: 409 })
  }
}
