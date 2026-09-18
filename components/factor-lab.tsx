"use client"

import { useMemo, useState } from "react"
import { evaluateFactor, EXAMPLE_FACTORS } from "@/lib/factor-engine"
import { generateMarketData } from "@/lib/market-data"
import { ExpressionEditor } from "./expression-editor"
import { EquityCurve } from "./charts/equity-curve"
import { CorrelationHeatmap } from "./charts/correlation-heatmap"
import { MetricCards } from "./metric-cards"

const MD = generateMarketData(42)

export function FactorLab() {
  const [expr, setExpr] = useState("close / delay(close, 20) - 1")
  const result = useMemo(() => evaluateFactor(expr, MD), [expr])
  const incomplete = result.incomplete

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Left: editor + examples */}
      <div className="flex flex-col gap-4">
        <section className="rounded-panel border border-border bg-panel p-4">
          <ExpressionEditor value={expr} onChange={setExpr} />

          <div
            className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-colors"
            style={{
              borderColor: incomplete ? "rgba(255,176,32,0.35)" : "rgba(163,230,53,0.3)",
              background: incomplete ? "rgba(255,176,32,0.07)" : "rgba(163,230,53,0.06)",
              color: incomplete ? "var(--color-hole)" : "var(--color-accent)",
            }}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${incomplete ? "hole-glow" : ""}`}
              style={{ background: incomplete ? "var(--color-hole)" : "var(--color-accent)" }}
            />
            <span className="font-mono">
              {incomplete ? "INCOMPLETE" : "COMPLETE"}
            </span>
            <span className="text-dim">·</span>
            <span className="text-dim">{result.message}</span>
          </div>
        </section>

        <section className="rounded-panel border border-border bg-panel p-4">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-faint">示例因子 · 点击载入</div>
          <div className="flex flex-col gap-2">
            {EXAMPLE_FACTORS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setExpr(ex.expr)}
                className="group flex flex-col rounded-lg border border-border bg-elevated/40 px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-elevated"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-text">{ex.label}</span>
                  <span className="font-mono text-[10px] text-faint group-hover:text-dim">载入 →</span>
                </div>
                <code className="mt-1 font-mono text-[11px] text-info/80">{ex.expr}</code>
                <span className="mt-0.5 text-[11px] text-faint">{ex.note}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Right: live visualization */}
      <div className="flex flex-col gap-4">
        <section className="rounded-panel border border-border bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-faint">回测净值 · 策略 vs 基准</div>
            {incomplete && (
              <span className="rounded-full border border-hole/40 bg-hole/10 px-2 py-0.5 font-mono text-[10px] text-hole">
                近似预览 · 不确定带
              </span>
            )}
          </div>
          <EquityCurve equity={result.equity} bench={result.benchEquity} incomplete={incomplete} />
          <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-faint">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: "var(--color-accent)" }} />
              策略
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-faint" />
              基准
            </span>
          </div>
        </section>

        <section className="rounded-panel border border-border bg-panel p-4">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-faint">绩效指标</div>
          <MetricCards metrics={result.metrics} incomplete={incomplete} />
        </section>

        <section className="rounded-panel border border-border bg-panel p-4">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-faint">风格因子相关性 · 温度</div>
          <CorrelationHeatmap data={result.correlations} incomplete={incomplete} />
        </section>
      </div>
    </div>
  )
}
