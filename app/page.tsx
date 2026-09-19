"use client"

import { useState } from "react"
import { FactorLab } from "@/components/factor-lab"
import { PatternSearch } from "@/components/pattern-search"

type Mode = "lab" | "search"
type Skin = "v1" | "v2" | "v3"

const SKINS: { id: Skin; label: string }[] = [
  { id: "v1", label: "终端" },
  { id: "v2", label: "极光" },
  { id: "v3", label: "蓝图" },
]

export default function Page() {
  const [mode, setMode] = useState<Mode>("lab")
  const [skin, setSkin] = useState<Skin>("v1")

  return (
    <main data-skin={skin} className="relative min-h-screen">
      <div className="bg-fx" />

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
            <span className="font-mono text-[15px] font-bold text-accent">α</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-text">Alphascope</div>
            <div className="font-mono text-[10px] text-faint">quant research playground</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-border bg-panel p-1">
            <ModeButton active={mode === "lab"} onClick={() => setMode("lab")} label="因子实验室" sub="expr → result" />
            <ModeButton
              active={mode === "search"}
              onClick={() => setMode("search")}
              label="形态检索"
              sub="text → history"
            />
          </div>

          <div className="flex items-center rounded-xl border border-border bg-panel p-1">
            {SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkin(s.id)}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: skin === s.id ? "var(--color-elevated)" : "transparent",
                  boxShadow: skin === s.id ? "inset 0 0 0 1px var(--color-border-strong)" : "none",
                  color: skin === s.id ? "var(--color-text)" : "var(--color-faint)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-6 pt-1">{mode === "lab" ? <FactorLab /> : <PatternSearch />}</div>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-center">
        <p className="font-mono text-[10px] text-faint">
          Alphascope · incomplete equation → incomplete result · 数据为程序化模拟
        </p>
      </footer>
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
