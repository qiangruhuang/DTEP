import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 鉴定助手：基于试验本体数据接地（grounding）的 LLM 问答
async function getEntries(apiName: string) {
  const ot = await db.objectType.findUnique({ where: { apiName }, include: { entries: true } })
  return (ot?.entries ?? []).map((e) => ({ pk: e.pk, title: e.title, data: JSON.parse(e.dataJson || '{}') }))
}

async function buildGrounding(): Promise<string> {
  const [programs, suts, events, measures, deficiencies, reports, models, alerts, automations, builds] = await Promise.all([
    getEntries('TestProgram'),
    getEntries('SUT'),
    getEntries('TestEvent'),
    getEntries('Measure'),
    getEntries('Deficiency'),
    getEntries('Report'),
    getEntries('ModelAsset'),
    db.testAlert.findMany({ orderBy: { raisedAt: 'desc' }, take: 8 }),
    db.automation.findMany(),
    db.testBuild.findMany({ orderBy: { startedAt: 'desc' }, take: 3 }),
  ])

  const programRows = programs.map((p) => `${p.pk}「${p.data.name}」阶段=${p.data.phase}，进度=${p.data.progress}%，事件 ${p.data.eventsDone}/${p.data.eventsTotal}，达标指标 ${p.data.measuresMet}/${p.data.measuresTotal}`)
  const sutRows = suts.map((s) => `${s.pk}「${s.data.name}」批次=${s.data.version}，孪生同步度=${s.data.twinSync}%，状态=${s.data.status}`)
  const eventRows = events.map((e) => `${e.pk}「${e.data.name}」${e.data.phase}/${e.data.type}，状态=${e.data.status}，LVC=${e.data.liveCount}L/${e.data.virtualCount}V/${e.data.constructiveCount}C，考核指标=${(e.data.assesses ?? []).join('、')}，异常度=${e.data.anomalyScore}`)
  const measureRows = measures.map((m) => `${m.pk}「${m.data.name}」${m.data.category}，阈值=${m.data.threshold}${m.data.unit ?? ''}，实测=${m.data.measured ?? '统计中'}，状态=${m.data.status}，考核事件=${(m.data.coveredBy ?? []).join('、')}`)
  const defRows = deficiencies.map((d) => `${d.pk}「${d.data.title}」${d.data.severity}，状态=${d.data.status}，发现于=${d.data.foundIn}，责任=${d.data.owner}`)
  const reportRows = reports.map((r) => `${r.pk}「${r.data.title}」${r.data.type}，状态=${r.data.status}，结论=${r.data.verdict ?? '待形成'}`)
  const modelRows = models.map((m) => `${m.pk}「${m.data.name}」${m.data.kind}，VV&A=${m.data.vvaStatus}，应用于=${(m.data.usedIn ?? []).join('、')}`)
  const alertRows = alerts.map((a) => `${a.runId} ${a.severity}级 [${a.status}] ${a.message}`)
  const buildRows = builds.map((b) => `${b.status} ${b.rowsProcessed} 行 ${b.durationSec}s`)

  return `## 试验鉴定平台实时数据上下文（Grounding）

### 试验任务（共 ${programs.length} 项）
${programRows.join('\n')}

### 被试系统
${sutRows.join('\n')}

### 试验事件（共 ${events.length} 个）
${eventRows.join('\n')}

### 鉴定指标（共 ${measures.length} 项）
${measureRows.join('\n')}

### 试验缺陷（共 ${deficiencies.length} 项）
${defRows.join('\n')}

### 鉴定报告
${reportRows.join('\n')}

### 数字模型（VV&A）
${modelRows.join('\n')}

### 活跃试验告警（近 24h）
${alertRows.join('\n') || '无'}

### 自动化工作流
${automations.map((a) => `${a.name}（${a.enabled ? '启用' : '停用'}，累计 ${a.runCount} 次触发）`).join('\n')}

### 判读管道最近运行
${buildRows.join('\n')}`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { question, history } = body
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: '请输入问题' }, { status: 400 })
  }

  const grounding = await buildGrounding()

  const systemPrompt = `你是「鉴定助手」—— 运行在数字化试验鉴定平台（T&E 体系，参照美军 DoD 试验鉴定方法：DT&E/OT&E、LFT&E 实弹试验（杀伤力/生存性）、LVC 联合试验、纯数字化 OT&E（DOT）、TEMP 总体计划、VV&A、需求-指标-试验-证据追溯）上的智能助手，回答必须严格基于下方「试验鉴定平台实时数据上下文」。
规则：
1. 优先引用具体对象（任务编号、事件编号 TE-xx、指标编号 M-xx、缺陷编号 DF-xx、实弹射组/数字化运行号 LF-xx/DOT-xx）。
2. 涉及鉴定建议时给出可执行的下一步（如下达试验指令、实弹射击授权、缺陷归零、补充样本、提交报告、孪生模型校准）。
3. 若上下文中没有答案，如实说明并建议用户在哪个模块查询。
4. 用中文回答，简洁分点，控制在 300 字内。

${grounding}`

  try {
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: 'user', content: question },
    ]
    const completion = await zai.chat.completions.create({ messages })
    const answer = completion.choices?.[0]?.message?.content ?? '（无返回）'
    await db.activityEvent.create({
      data: { actor: '鉴定助手', module: 'AIP', message: `回答提问：「${question.slice(0, 40)}」` },
    })
    return NextResponse.json({ answer })
  } catch (e) {
    return NextResponse.json({ error: `鉴定助手调用失败：${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
  }
}
