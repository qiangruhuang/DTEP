'use client'

// 鉴定助手：基于试验本体数据接地的 LLM 问答
import { useEffect, useRef, useState } from 'react'
import { post } from '@/lib/platform'
import { ModuleHeader } from './shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Bot, Send, Loader2, User, Database, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type Msg = { role: 'user' | 'assistant'; content: string; grounded?: boolean }

const SUGGESTIONS = [
  '当前哪些鉴定指标未达标或统计中？',
  'TE-25-002 为什么暂停？下一步怎么处置？',
  '帮我汇总试验缺陷与归零进展',
  'LVC 联合试验准备情况如何？',
  'LFT&E 实弹试验杀伤力与生存性结论如何？',
  '纯数字化作战试验进展与孪生一致性如何？',
]

export function AipModule() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    setInput('')
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setBusy(true)
    try {
      const d = await post<{ answer: string }>('/api/aip', { question, history })
      setMessages((prev) => [...prev, { role: 'assistant', content: d.answer, grounded: true }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `抱歉，调用失败：${e instanceof Error ? e.message : '未知错误'}` }])
      toast({ title: '鉴定助手调用失败', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        title="鉴定助手"
        desc="鉴定助手将大语言模型接入试验鉴定业务：每次回答都基于试验本体实时数据（Grounding），可引用具体任务、事件、指标与缺陷，并给出鉴定处置建议。"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,290px]">
        {/* 对话区 */}
        <div className="flex h-[620px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {/* 消息流 */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                  <Bot className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">鉴定助手已就绪</h2>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                    我已接入试验本体（试验任务、试验事件、鉴定指标、缺陷与报告数据），
                    可以直接查询试验态势并给出鉴定处置建议。
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    m.role === 'assistant' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-800 text-zinc-200',
                  )}
                >
                  {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-3.5 w-3.5" />}
                </span>
                <div
                  className={cn(
                    'max-w-[82%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'assistant' ? 'bg-zinc-50 text-zinc-800' : 'bg-zinc-900 text-zinc-50',
                  )}
                >
                  {m.content}
                  {m.grounded && (
                    <p className="mt-2 flex items-center gap-1 border-t border-zinc-200/70 pt-1.5 text-[10px] text-zinc-400">
                      <Database className="h-3 w-3" />
                      基于试验本体实时数据生成 · 可在对象检索中验证
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {busy && (
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span className="text-xs text-zinc-500">正在检索试验本体对象集并生成回答…</span>
                </div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="border-t border-zinc-200 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                placeholder="询问试验态势，如「哪些指标存在鉴定风险？」"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask(input)
                  }
                }}
                className="max-h-32 min-h-[52px] resize-none text-sm"
                aria-label="输入问题"
              />
              <Button className="h-10" onClick={() => ask(input)} disabled={busy || !input.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* 右侧说明 */}
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
              <Database className="h-4 w-4 text-emerald-600" />
              接地的数据上下文
            </h3>
            <ul className="mt-2.5 space-y-2 text-xs text-zinc-600">
              {[
                'TestProgram：3 项试验任务与阶段进度',
                'TestEvent：9 个试验事件（DT/OT/LFT 实弹/纯数字化）',
                'Measure：14 项鉴定指标（阈值/实测/状态）',
                'Deficiency：试验缺陷与归零状态',
                'Report / ModelAsset：报告与 VV&A 状态',
                'TestAlert：活跃试验告警（近 24h）',
              ].map((t) => (
                <li key={t} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <Sparkles className="h-4 w-4" />
              鉴定助手特性
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-emerald-900/80">
              <li>· <b>接地（Grounding）</b>：回答前实时读取试验本体，避免幻觉</li>
              <li>· <b>可验证</b>：引用对象可在对象检索中交叉验证</li>
              <li>· <b>处置建议</b>：建议直接关联动作（下达指令/缺陷归零/提交报告）</li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
              <BookOpen className="h-4 w-4 text-zinc-400" />
              方法依据
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              参照美军 T&E 智能化方向（DOT&E 数字化转型、AI/自主系统试验 DoDM 5000.101）与
              AIP 的本体增强生成（Ontology Augmented Generation）设计：LLM 通过试验本体获得业务上下文。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
