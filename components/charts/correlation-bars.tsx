"use client"

type Item = { name: string; value: number }

// Maps [-1,1] correlation to a temperature color: neg=pink, pos=accent green.
function tempColor(v: number): string {
  const c = Math.max(-1, Math.min(1, v))
  if (c >= 0) {
    const a = 0.15 + c * 0.75
    return `rgba(163, 230, 53, ${a})`
  }
  const a = 0.15 + Math.abs(c) * 0.75
  return `rgba(255, 92, 122, ${a})`
}

export function CorrelationBars({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => {
        const pct = (Math.abs(it.value) * 50).toFixed(0)
        const positive = it.value >= 0
        return (
          <div key={it.name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-[11px] text-dim">{it.name}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-elevated">
              {/* center line */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-border-strong" />
              <div
                className="absolute top-0 h-full rounded-md transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  left: positive ? "50%" : undefined,
                  right: positive ? undefined : "50%",
                  background: tempColor(it.value),
                }}
              />
            </div>
            <span
              className="w-12 shrink-0 text-right font-mono text-[11px]"
              style={{ color: positive ? "var(--color-accent)" : "var(--color-neg)" }}
            >
              {it.value >= 0 ? "+" : ""}
              {it.value.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
