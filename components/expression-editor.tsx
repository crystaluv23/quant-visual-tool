"use client"

import { useMemo } from "react"
import { VARIABLES, FUNCTIONS } from "@/lib/factor-engine"

type Props = {
  value: string
  onChange: (v: string) => void
}

const FN_NAMES = new Set(Object.keys(FUNCTIONS))
const VAR_NAMES = new Set<string>(VARIABLES as unknown as string[])

type Piece = { text: string; kind: "fn" | "var" | "num" | "hole" | "op" | "plain" }

// Lightweight syntax highlighter shown behind a transparent textarea.
function highlight(src: string): Piece[] {
  const pieces: Piece[] = []
  const re = /(\s+|[A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|\?|[+\-*/(),])/g
  let m: RegExpExecArray | null
  let last = 0
  while ((m = re.exec(src))) {
    if (m.index > last) pieces.push({ text: src.slice(last, m.index), kind: "plain" })
    const tok = m[0]
    if (/^\s+$/.test(tok)) pieces.push({ text: tok, kind: "plain" })
    else if (tok === "?") pieces.push({ text: tok, kind: "hole" })
    else if (/^[+\-*/(),]$/.test(tok)) pieces.push({ text: tok, kind: "op" })
    else if (/^\d/.test(tok)) pieces.push({ text: tok, kind: "num" })
    else if (FN_NAMES.has(tok)) pieces.push({ text: tok, kind: "fn" })
    else if (VAR_NAMES.has(tok)) pieces.push({ text: tok, kind: "var" })
    else pieces.push({ text: tok, kind: "plain" })
    last = re.lastIndex
  }
  if (last < src.length) pieces.push({ text: src.slice(last), kind: "plain" })
  return pieces
}

const colorFor: Record<Piece["kind"], string> = {
  fn: "var(--color-info)",
  var: "var(--color-accent)",
  num: "#d6b3ff",
  hole: "var(--color-hole)",
  op: "var(--color-dim)",
  plain: "var(--color-text)",
}

export function ExpressionEditor({ value, onChange }: Props) {
  const pieces = useMemo(() => highlight(value), [value])

  function insertHole() {
    onChange(value ? `${value.trimEnd()} ? ` : "? ")
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] text-faint">factor.expr</span>
        <button
          onClick={insertHole}
          className="rounded-md border border-hole/40 bg-hole/10 px-2 py-1 font-mono text-[11px] text-hole transition-colors hover:bg-hole/20"
        >
          + 插入 hole ?
        </button>
      </div>
      <div className="relative rounded-lg border border-border-strong bg-bg">
        {/* highlight layer */}
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-[15px] leading-6"
        >
          {pieces.map((p, i) => (
            <span
              key={i}
              className={p.kind === "hole" ? "rounded-[3px] px-0.5" : undefined}
              style={{
                color: colorFor[p.kind],
                background: p.kind === "hole" ? "rgba(255,176,32,0.14)" : undefined,
                fontWeight: p.kind === "fn" || p.kind === "hole" ? 600 : 400,
              }}
            >
              {p.text}
            </span>
          ))}
          {"\n"}
        </pre>
        {/* input layer */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={3}
          placeholder="close / delay(close, 20) - 1"
          className="relative block w-full resize-none bg-transparent p-4 font-mono text-[15px] leading-6 text-transparent caret-white outline-none placeholder:text-faint"
          style={{ WebkitTextFillColor: "transparent" }}
        />
      </div>
    </div>
  )
}
