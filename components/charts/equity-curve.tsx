"use client"

import { useMemo, useState } from "react"

type Props = {
  equity: number[]
  bench: number[]
  incomplete: boolean
}

const W = 720
const H = 300
const PAD_L = 44
const PAD_B = 22
const PAD_T = 16
const PAD_R = 12

export function EquityCurve({ equity, bench, incomplete }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const { stratD, benchD, areaD, bandD, y, x, min, max, n } = useMemo(() => {
    const n = equity.length
    const all = [...equity, ...bench]
    const min = Math.min(...all, 1)
    const max = Math.max(...all, 1)
    const range = max - min || 1
    const x = (i: number) => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R)
    const y = (v: number) => PAD_T + (1 - (v - min) / range) * (H - PAD_T - PAD_B)
    const line = (arr: number[]) =>
      arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
    const stratD = line(equity)
    const benchD = line(bench)
    const areaD =
      `M ${x(0)} ${y(equity[0])} ` +
      equity.map((v, i) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ") +
      ` L ${x(n - 1)} ${H - PAD_B} L ${x(0)} ${H - PAD_B} Z`
    // Uncertainty band for incomplete results.
    const spread = (i: number) => (incomplete ? 0.03 + 0.05 * (i / n) : 0)
    const bandTop = equity.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v * (1 + spread(i))).toFixed(1)}`).join(" ")
    const bandBot = equity
      .map((v, i) => `L ${x(n - 1 - i).toFixed(1)} ${y(equity[n - 1 - i] * (1 - spread(n - 1 - i))).toFixed(1)}`)
      .join(" ")
    const bandD = `${bandTop} ${bandBot} Z`
    return { stratD, benchD, areaD, bandD, y, x, min, max, n }
  }, [equity, bench, incomplete])

  const baselineY = y(1)
  const ticks = [max, (max + min) / 2, min]
  const stratColor = "var(--color-accent)"

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="select-none"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect()
        if (!rect) return
        const rx = ((e.clientX - rect.left) / rect.width) * W
        const i = Math.round(((rx - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1))
        setHover(Math.max(0, Math.min(n - 1, i)))
      }}
    >
      <defs>
        <linearGradient id="equityfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stratColor} stopOpacity={incomplete ? 0.12 : 0.24} />
          <stop offset="100%" stopColor={stratColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={PAD_L - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">
            {t.toFixed(2)}
          </text>
        </g>
      ))}

      {/* baseline at 1.0 */}
      <line x1={PAD_L} x2={W - PAD_R} y1={baselineY} y2={baselineY} stroke="rgba(255,255,255,0.14)" strokeDasharray="2 3" />

      {incomplete && <path d={bandD} fill="rgba(255,176,32,0.10)" stroke="none" />}
      <path d={areaD} fill="url(#equityfill)" />

      {/* benchmark */}
      <path d={benchD} fill="none" stroke="var(--color-faint)" strokeWidth={1.2} strokeDasharray="4 4" />

      {/* strategy */}
      <path
        d={stratD}
        fill="none"
        stroke={stratColor}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeDasharray={incomplete ? "6 5" : undefined}
        className={incomplete ? "dash-flow" : undefined}
        opacity={incomplete ? 0.9 : 1}
      />

      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={H - PAD_B} stroke="rgba(255,255,255,0.18)" />
          <circle cx={x(hover)} cy={y(equity[hover])} r={3.5} fill={stratColor} />
          <circle cx={x(hover)} cy={y(bench[hover])} r={2.5} fill="var(--color-faint)" />
          <g transform={`translate(${Math.min(x(hover) + 8, W - 120)}, ${PAD_T + 6})`}>
            <rect width="112" height="42" rx="6" fill="var(--color-elevated)" stroke="var(--color-border-strong)" />
            <text x="8" y="16" fontSize="10" fill="var(--color-dim)" fontFamily="var(--font-mono)">
              {`day ${hover + 1}`}
            </text>
            <text x="8" y="30" fontSize="11" fill={stratColor} fontFamily="var(--font-mono)">
              {`策略 ${((equity[hover] - 1) * 100).toFixed(1)}%`}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}
