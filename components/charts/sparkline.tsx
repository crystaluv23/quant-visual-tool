"use client"

type Props = {
  data: number[]
  width?: number
  height?: number
  matchStart?: number
  matchEnd?: number
  className?: string
}

// Compact price sparkline with an optional highlighted "match" window.
export function Sparkline({ data, width = 260, height = 96, matchStart, matchEnd, className }: Props) {
  if (data.length === 0) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const dx = width / (data.length - 1)
  const y = (v: number) => height - ((v - min) / range) * (height - 8) - 4
  const x = (i: number) => i * dx

  const pathD = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ")

  const hasMatch = matchStart !== undefined && matchEnd !== undefined
  const areaD = hasMatch
    ? `M ${x(matchStart!)} ${height} ` +
      data
        .slice(matchStart!, matchEnd! + 1)
        .map((v, i) => `L ${x(matchStart! + i).toFixed(2)} ${y(v).toFixed(2)}`)
        .join(" ") +
      ` L ${x(Math.min(matchEnd!, data.length - 1))} ${height} Z`
    : ""

  const up = data[data.length - 1] >= data[0]
  const stroke = up ? "var(--color-accent)" : "var(--color-neg)"

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none" width="100%">
      <defs>
        <linearGradient id="matchfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {hasMatch && (
        <>
          <rect
            x={x(matchStart!)}
            y={0}
            width={x(matchEnd!) - x(matchStart!)}
            height={height}
            fill="rgba(163,230,53,0.06)"
          />
          <path d={areaD} fill="url(#matchfill)" />
        </>
      )}
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      {hasMatch && (
        <path
          d={data
            .slice(matchStart!, matchEnd! + 1)
            .map((v, i) => `${i === 0 ? "M" : "L"} ${x(matchStart! + i).toFixed(2)} ${y(v).toFixed(2)}`)
            .join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
