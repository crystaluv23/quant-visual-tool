"use client"

import { useState } from "react"
import { searchPatterns, PATTERN_SUGGESTIONS, type PatternMatch, type Archetype } from "@/lib/patterns"
import { Sparkline } from "./charts/sparkline"

type SearchState = { archetype: Archetype; matches: PatternMatch[] } | null

export function PatternSearch() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchState>(null)
  const [loading, setLoading] = useState(false)

  function run(q: string) {
    const text = q.trim()
    if (!text) return
    setQuery(text)
    setLoading(true)
    // Simulated "LLM" latency for the reveal animation.
    setTimeout(() => {
      setResult(searchPatterns(text))
      setLoading(false)
    }, 550)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-panel border border-border bg-panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[11px] text-faint">semantic.query</span>
          <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
            LLM 语义检索
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(query)
          }}
          className="flex items-center gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='描述一段行情，例如「暴跌后快速反弹」'
            className="h-11 flex-1 rounded-lg border border-border-strong bg-bg px-4 text-[14px] text-text outline-none transition-colors placeholder:text-faint focus:border-accent/50"
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-lg bg-accent px-5 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
          >
            检索历史形态
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {PATTERN_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="rounded-full border border-border bg-elevated/50 px-3 py-1.5 text-[12px] text-dim transition-colors hover:border-border-strong hover:text-text"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-panel border border-border bg-panel py-16 text-dim">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-accent" />
          <span className="font-mono text-[13px]">正在检索历史上相似的走势…</span>
        </div>
      )}

      {result && !loading && (
        <div className="fade-rise flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-panel border border-border bg-panel px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-faint">匹配形态</span>
              <span className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[13px] font-medium text-accent">
                {result.archetype.label}
              </span>
            </div>
            <span className="text-[12px] text-dim">{result.archetype.annotation}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {result.matches.map((m, i) => (
              <article
                key={m.id}
                className="fade-rise group rounded-panel border border-border bg-panel p-4 transition-colors hover:border-border-strong"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-text">{m.symbol}</span>
                      <span className="text-[12px] text-dim">{m.name}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-faint">
                      {m.market} · {m.period}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[15px] font-semibold text-accent">{m.similarity}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-faint">相似度</span>
                  </div>
                </div>

                <Sparkline data={m.series} matchStart={m.matchStart} matchEnd={m.matchEnd} height={88} />

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${m.similarity}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-border bg-panel/50 py-20 text-center">
          <div className="font-mono text-[13px] text-dim">输入一句话，检索历史上真实发生过的相似走势</div>
          <div className="text-[12px] text-faint">系统会识别你描述的形态，并按相似度返回多段历史行情</div>
        </div>
      )}
    </div>
  )
}
