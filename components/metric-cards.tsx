"use client"

import type { Metrics } from "@/lib/factor-engine"

type Props = {
  metrics: Metrics
  incomplete: boolean
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

export function MetricCards({ metrics, incomplete }: Props) {
  const items: { label: string; value: string; tone?: "pos" | "neg" | "accent" }[] = [
    {
      label: "Sharpe",
      value: metrics.sharpe.toFixed(2),
      tone: metrics.sharpe >= 1 ? "accent" : metrics.sharpe < 0 ? "neg" : undefined,
    },
    { label: "年化收益", value: fmtPct(metrics.annReturn), tone: metrics.annReturn >= 0 ? "pos" : "neg" },
    { label: "年化波动", value: fmtPct(metrics.annVol) },
    { label: "最大回撤", value: fmtPct(metrics.maxDrawdown), tone: "neg" },
    { label: "换手率", value: metrics.turnover.toFixed(2) },
    { label: "胜率", value: fmtPct(metrics.hitRate) },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border bg-elevated/60 px-3 py-2.5"
          style={{ opacity: incomplete ? 0.85 : 1 }}
        >
          <div className="text-[10px] uppercase tracking-wider text-faint">{it.label}</div>
          <div
            className="mt-1 font-mono text-lg tabular-nums"
            style={{
              color:
                it.tone === "accent"
                  ? "var(--color-accent)"
                  : it.tone === "pos"
                    ? "var(--color-accent)"
                    : it.tone === "neg"
                      ? "var(--color-neg)"
                      : "var(--color-text)",
            }}
          >
            {incomplete && <span className="mr-1 text-hole">~</span>}
            {it.value}
          </div>
        </div>
      ))}
    </div>
  )
}
