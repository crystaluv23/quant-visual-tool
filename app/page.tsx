"use client"

import { useState } from "react"
import { FactorLab } from "@/components/factor-lab"
import { PatternSearch } from "@/components/pattern-search"

type Mode = "lab" | "search"

export default function Page() {
  const [mode, setMode] = useState<Mode>("lab")

  return (
    <main className="min-h-screen">
      <div className="grid-lines">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
              <span className="font-mono text-[15px] font-bold text-accent">α</span>
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-text">Alphascope</div>
              <div className="font-mono text-[10px] text-faint">quant research playground</div>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-panel p-1">
            <ModeButton active={mode === "lab"} onClick={() => setMode("lab")} label="因子实验室" sub="expr → result" />
            <ModeButton
              active={mode === "search"}
              onClick={() => setMode("search")}
              label="形态检索"
              sub="text → history"
            />
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 pb-6">
          <div className="mb-5 max-w-2xl">
            {mode === "lab" ? (
              <p className="text-[13px] leading-relaxed text-dim">
                在表达式里写下你的因子。留一个{" "}
                <span className="font-mono text-hole">hole ?</span> 也没关系 —— 不完整的表达式不会报错，而是给出
                <span className="text-hole"> 不完整的近似结果</span>，让你实时感受每一次改动对回测与相关性的影响。
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed text-dim">
                用自然语言描述一段行情走势，系统会理解你的意图，并从历史中检索出
                <span className="text-accent"> 真实发生过的、形态相似</span>的多段股价走势。
              </p>
            )}
          </div>

          {mode === "lab" ? <FactorLab /> : <PatternSearch />}
        </div>

        <footer className="mx-auto max-w-6xl px-5 py-8 text-center">
          <p className="font-mono text-[10px] text-faint">
            Alphascope · incomplete equation → incomplete result · 数据为程序化模拟，仅供研究界面演示
          </p>
        </footer>
      </div>
    </main>
  )
}

function ModeButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-lg px-4 py-2 text-left transition-colors"
      style={{
        background: active ? "var(--color-elevated)" : "transparent",
        boxShadow: active ? "inset 0 0 0 1px var(--color-border-strong)" : "none",
      }}
    >
      <div className={`text-[13px] font-medium ${active ? "text-text" : "text-dim"}`}>{label}</div>
      <div className={`font-mono text-[9px] ${active ? "text-accent" : "text-faint"}`}>{sub}</div>
    </button>
  )
}
