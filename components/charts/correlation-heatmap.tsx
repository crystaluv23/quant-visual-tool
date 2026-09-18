"use client"

type Props = {
  data: { name: string; value: number }[]
  incomplete: boolean
}

// Map a correlation in [-1,1] to a temperature color: neg=pink, ~0=slate, pos=accent.
function tempColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v))
  if (t >= 0) {
    // slate -> accent green
    const a = t
    return `color-mix(in oklab, var(--color-accent) ${Math.round(a * 100)}%, #2b313b)`
  }
  const a = -t
  return `color-mix(in oklab, var(--color-neg) ${Math.round(a * 100)}%, #2b313b)`
}

export function CorrelationHeatmap({ data, incomplete }: Props) {
  return (
    <div className="flex flex-col gap-2" style={{ opacity: incomplete ? 0.8 : 1 }}>
      {data.map((d) => {
        const pct = Math.round(Math.abs(d.value) * 100)
        return (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-24 shrink-0 font-mono text-[11px] text-dim">{d.name}</div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md border border-border bg-bg">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <div
                className="absolute inset-y-0 transition-all duration-500"
                style={{
                  background: tempColor(d.value),
                  width: `${pct / 2}%`,
                  left: d.value >= 0 ? "50%" : `${50 - pct / 2}%`,
                }}
              />
            </div>
            <div
              className="w-12 shrink-0 text-right font-mono text-[11px]"
              style={{ color: tempColor(d.value) }}
            >
              {d.value >= 0 ? "+" : ""}
              {d.value.toFixed(2)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
