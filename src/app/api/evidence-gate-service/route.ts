import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateEvidencePackage, type GateRule } from '@/lib/evidence-gate-service'

async function entries(apiName: string) {
  const type = await db.objectType.findUnique({ where: { apiName }, include: { entries: true } })
  return (type?.entries ?? []).map((entry) => ({
    id: entry.id,
    pk: entry.pk,
    title: entry.title,
    data: JSON.parse(entry.dataJson || '{}') as Record<string, any>,
  }))
}

async function evaluate(packageId: string, ruleSetId: string) {
  const [packages, ruleSets, runs, models, measures, datasets] = await Promise.all([
    entries('EvidencePackage'),
    entries('EvidenceGateRuleSet'),
    entries('TestRun'),
    entries('ModelAsset'),
    entries('Measure'),
    db.testDataset.findMany({ select: { path: true, name: true, qualityScore: true, domain: true, origin: true } }),
  ])
  const evidencePackage = packages.find((p) => p.pk === packageId)
  const ruleSet = ruleSets.find((r) => r.pk === ruleSetId)
  if (!evidencePackage) throw new Error(`Evidence Package ${packageId} 不存在`)
  if (!ruleSet) throw new Error(`Rule Set ${ruleSetId} 不存在`)
  return evaluateEvidencePackage({ evidencePackage, ruleSet, runs, models, measures, datasets })
}

function nextDraftVersion(version: unknown) {
  const match = String(version ?? '1.0').match(/^(\d+)(?:\.(\d+))?/)
  const major = Number(match?.[1] ?? 1)
  const minor = Number(match?.[2] ?? 0) + 1
  return `${major}.${minor}`
}

function shortHash(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`
}

export async function GET(req: NextRequest) {
  const packageId = req.nextUrl.searchParams.get('packageId') ?? 'EP-CASE01-M13-V0.4'
  const ruleSetId = req.nextUrl.searchParams.get('ruleSetId') ?? 'GRS-CASE01-STRICT-V1'
  try {
    return NextResponse.json(await evaluate(packageId, ruleSetId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '门控评估失败' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { packageId?: string; ruleSetId?: string; commit?: boolean; performedBy?: string }
  const packageId = body.packageId ?? 'EP-CASE01-M13-V0.4'
  const ruleSetId = body.ruleSetId ?? 'GRS-CASE01-STRICT-V1'
  try {
    const result = await evaluate(packageId, ruleSetId)
    if (!body.commit) return NextResponse.json(result)
    if (packageId === 'EP-CASE01-M13-V0.4') {
      return NextResponse.json({ error: 'EP-CASE01-M13-V0.4 的正式门控写回由 CASE-01 状态机控制，请执行“运行 STRICT-V1”步骤' }, { status: 409 })
    }
    if (result.assessmentMode !== '正式准入评估') {
      return NextResponse.json({ error: '只有证据包绑定的已发布规则集才能记录正式门控判定' }, { status: 409 })
    }

    const packageType = await db.objectType.findUnique({ where: { apiName: 'EvidencePackage' } })
    if (!packageType) return NextResponse.json({ error: 'EvidencePackage 类型不存在' }, { status: 404 })
    const pkg = await db.objectEntry.findFirst({ where: { objectTypeId: packageType.id, pk: packageId } })
    if (!pkg) return NextResponse.json({ error: 'Evidence Package 不存在' }, { status: 404 })
    const data = JSON.parse(pkg.dataJson || '{}') as Record<string, any>
    if (!String(data.status ?? '').startsWith('已冻结')) {
      return NextResponse.json({ error: '正式门控判定只能写回已冻结 Evidence Package' }, { status: 409 })
    }

    const recordedAt = new Date().toISOString()
    const snapshot = { ...result, recordedAt, performedBy: body.performedBy ?? '鉴定规则委员会 · 孙立' }
    const next = { ...data, gateDecision: result.decision, gateEvaluatedAt: recordedAt, lastGateEvaluation: snapshot }
    await db.objectEntry.update({ where: { id: pkg.id }, data: { dataJson: JSON.stringify(next) } })

    const actionType = await db.actionType.findFirst({ where: { apiName: 'evaluateEvidencePackage' } })
    if (actionType) {
      await db.actionLog.create({
        data: {
          actionTypeId: actionType.id,
          objectPk: packageId,
          parametersJson: JSON.stringify({ ruleSetId, decision: result.decision, score: result.score, hardFailures: result.hardFailures.map((x) => x.id), softFailures: result.softFailures.map((x) => x.id) }),
          status: 'succeeded',
          performedBy: body.performedBy ?? '鉴定规则委员会 · 孙立',
        },
      })
    }

    return NextResponse.json({ ...result, committed: true, recordedAt })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '正式门控写回失败' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    operation?: 'cloneDraft' | 'updateRule' | 'publishDraft'
    ruleSetId?: string
    ruleId?: string
    enabled?: boolean
    severity?: 'hard' | 'soft'
    minQuality?: number
    performedBy?: string
  }
  if (!body.ruleSetId) return NextResponse.json({ error: '缺少 ruleSetId' }, { status: 400 })

  const type = await db.objectType.findUnique({ where: { apiName: 'EvidenceGateRuleSet' } })
  if (!type) return NextResponse.json({ error: 'EvidenceGateRuleSet 类型不存在' }, { status: 404 })
  const entry = await db.objectEntry.findFirst({ where: { objectTypeId: type.id, pk: body.ruleSetId } })
  if (!entry) return NextResponse.json({ error: '规则集不存在' }, { status: 404 })

  const data = JSON.parse(entry.dataJson || '{}') as Record<string, any>
  const operation = body.operation ?? 'updateRule'

  if (operation === 'cloneDraft') {
    const familyRuleSetRef = String(data.parentRuleSetRef ?? body.ruleSetId)
    const all = await db.objectEntry.findMany({ where: { objectTypeId: type.id } })
    const reusable = all.find((candidate) => {
      const d = JSON.parse(candidate.dataJson || '{}') as Record<string, any>
      return d.parentRuleSetRef === familyRuleSetRef && String(d.status).startsWith('草案')
    })
    if (reusable) return NextResponse.json({ ruleSetId: reusable.pk, reused: true })

    const version = nextDraftVersion(data.version)
    const draftPk = `${familyRuleSetRef}-DRAFT-${version.replace('.', '_')}`
    const now = new Date().toISOString()
    const draftData = {
      ...data,
      code: draftPk,
      version,
      status: '草案',
      parentRuleSetRef: familyRuleSetRef,
      updatedAt: now,
      versionNote: `从 ${body.ruleSetId} 派生的受控草案；规则族 ${familyRuleSetRef}；未发布前仅用于对比评估。`,
      publishedAt: null,
      publishedBy: null,
      publishedHash: null,
    }
    await db.objectEntry.create({
      data: {
        objectTypeId: type.id,
        pk: draftPk,
        title: `${data.name ?? entry.title} · v${version} 草案`,
        dataJson: JSON.stringify(draftData),
      },
    })
    await db.objectType.update({ where: { id: type.id }, data: { objectCount: { increment: 1 } } })

    const actionType = await db.actionType.findFirst({ where: { apiName: 'configureGateRuleSet' } })
    if (actionType) {
      await db.actionLog.create({ data: { actionTypeId: actionType.id, objectPk: draftPk, parametersJson: JSON.stringify({ operation: 'cloneDraft', source: body.ruleSetId, version }), status: 'succeeded', performedBy: body.performedBy ?? '试验鉴定规则管理员' } })
    }
    return NextResponse.json({ ruleSetId: draftPk, version, status: '草案' })
  }

  if (operation === 'publishDraft') {
    if (!String(data.status ?? '').startsWith('草案')) return NextResponse.json({ error: '只有草案规则集可以发布' }, { status: 409 })
    const publishedAt = new Date().toISOString()
    const publishedHash = shortHash({ scope: data.scope, purpose: data.purpose, version: data.version, rules: data.rules, decisionPolicy: data.decisionPolicy })
    const next = { ...data, status: '已发布/原型', publishedAt, publishedBy: body.performedBy ?? '鉴定规则委员会 · 孙立', publishedHash, updatedAt: publishedAt, versionNote: `v${data.version} 已发布；后续修改必须再次派生新草案。` }
    await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(next), title: `${data.name ?? entry.title} · v${data.version}` } })
    const actionType = await db.actionType.findFirst({ where: { apiName: 'configureGateRuleSet' } })
    if (actionType) {
      await db.actionLog.create({ data: { actionTypeId: actionType.id, objectPk: body.ruleSetId, parametersJson: JSON.stringify({ operation: 'publishDraft', publishedHash, version: data.version }), status: 'succeeded', performedBy: body.performedBy ?? '鉴定规则委员会 · 孙立' } })
    }
    return NextResponse.json({ ruleSetId: body.ruleSetId, status: next.status, publishedHash })
  }

  if (!String(data.status ?? '').startsWith('草案')) {
    return NextResponse.json({ error: '已发布规则集不可原地修改；请先“复制为新草案”' }, { status: 409 })
  }
  if (!body.ruleId) return NextResponse.json({ error: '缺少 ruleId' }, { status: 400 })

  const rules: GateRule[] = Array.isArray(data.rules) ? data.rules : []
  const index = rules.findIndex((r) => r.id === body.ruleId)
  if (index < 0) return NextResponse.json({ error: '规则不存在' }, { status: 404 })

  const oldRule = rules[index]
  const nextRule: GateRule = {
    ...oldRule,
    ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
    ...(body.severity ? { severity: body.severity } : {}),
    params: {
      ...(oldRule.params ?? {}),
      ...(typeof body.minQuality === 'number' && oldRule.type === 'datasetQuality' ? { minQuality: Math.max(0, Math.min(100, Math.round(body.minQuality))) } : {}),
    },
  }
  rules[index] = nextRule
  data.rules = rules
  data.updatedAt = new Date().toISOString()
  data.versionNote = `v${data.version} 草案正在编辑；正式包不会自动改用此规则。`

  await db.objectEntry.update({ where: { id: entry.id }, data: { dataJson: JSON.stringify(data) } })
  const actionType = await db.actionType.findFirst({ where: { apiName: 'configureGateRuleSet' } })
  if (actionType) {
    await db.actionLog.create({
      data: {
        actionTypeId: actionType.id,
        objectPk: body.ruleSetId,
        parametersJson: JSON.stringify({ operation: 'updateRule', ruleId: body.ruleId, before: oldRule, after: nextRule }),
        status: 'succeeded',
        performedBy: body.performedBy ?? '试验鉴定规则管理员',
      },
    })
  }

  return NextResponse.json({ ruleSetId: body.ruleSetId, rule: nextRule })
}
