"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { VARIABLES, FUNCTIONS } from "@/lib/factor-engine"

type Props = {
  value: string
  onChange: (v: string) => void
}

const FN_NAMES = new Set(Object.keys(FUNCTIONS))
const VAR_NAMES = new Set<string>(VARIABLES as unknown as string[])

type Kind = "fn" | "var" | "num" | "hole" | "op" | "plain"
type Piece = { text: string; kind: Kind }

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

const colorFor: Record<Kind, string> = {
  fn: "var(--color-info)",
  var: "var(--color-accent)",
  num: "#d6b3ff",
  hole: "var(--color-hole)",
  op: "var(--color-dim)",
  plain: "var(--color-text)",
}

export function ExpressionEditor({ value, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [caret, setCaret] = useState(0)
  const [focused, setFocused] = useState(false)

  // Expand tokens into per-character cells so the caret can be injected anywhere.
  const cells = useMemo(() => {
    const arr: { ch: string; kind: Kind }[] = []
    for (const p of highlight(value)) for (const ch of p.text) arr.push({ ch, kind: p.kind })
    return arr
  }, [value])

  function syncCaret(el: HTMLTextAreaElement) {
    setCaret(el.selectionStart)
  }

  // Apply a programmatic caret position after value updates (e.g. hole insertion).
  useEffect(() => {
    if (pendingCaret.current != null && taRef.current) {
      const pos = pendingCaret.current
      taRef.current.focus()
      taRef.current.setSelectionRange(pos, pos)
      setCaret(pos)
      pendingCaret.current = null
    }
  }, [value])

  function insertHole() {
    const el = taRef.current
    const pos = el ? el.selectionStart : value.length
    const before = value.slice(0, pos)
    const after = value.slice(pos)
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before)
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after)
    const insert = `${needsSpaceBefore ? " " : ""}?${needsSpaceAfter ? " " : ""}`
    const holeIndex = pos + (needsSpaceBefore ? 1 : 0)
    pendingCaret.current = holeIndex // land the caret on the LEFT of the new hole → shows <□
    onChange(before + insert + after)
  }

  // The caret element: bracket "<" or ">" when it sits beside a hole, else a thin bar.
  function Caret() {
    const nextHole = cells[caret]?.kind === "hole"
    const prevHole = cells[caret - 1]?.kind === "hole"
    if (nextHole || prevHole) {
      return (
        <span
          className="caret-blink"
          style={{
            color: "var(--color-hole)",
            fontWeight: 700,
            textShadow: "0 0 10px var(--color-hole)",
          }}
        >
          {nextHole ? "<" : ">"}
        </span>
      )
    }
    return (
      <span
        className="caret-blink"
        style={{
          display: "inline-block",
          width: 0,
          height: "1.05em",
          verticalAlign: "-0.16em",
          borderLeft: "1.5px solid var(--color-accent)",
          marginInline: "-0.75px",
        }}
      />
    )
  }

  const nodes: React.ReactNode[] = []
  cells.forEach((c, i) => {
    if (focused && caret === i) nodes.push(<Caret key="caret" />)
    nodes.push(
      <span
        key={`c${i}`}
        className={c.kind === "hole" ? "rounded-[3px] px-0.5" : undefined}
        style={{
          color: colorFor[c.kind],
          background: c.kind === "hole" ? "rgba(255,176,32,0.16)" : undefined,
          fontWeight: c.kind === "fn" || c.kind === "hole" ? 600 : 400,
        }}
      >
        {c.kind === "hole" ? "□" : c.ch}
      </span>,
    )
  })
  if (focused && caret >= cells.length) nodes.push(<Caret key="caret" />)

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] text-faint">factor.expr</span>
        <button
          onClick={insertHole}
          className="rounded-md border border-hole/40 bg-hole/10 px-2 py-1 font-mono text-[11px] text-hole transition-colors hover:bg-hole/20"
        >
          + hole □
        </button>
      </div>
      <div className="relative rounded-lg border border-border-strong bg-bg">
        {/* highlight + caret layer */}
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-[15px] leading-6"
        >
          {nodes.map((n, i) => (
            <Fragment key={i}>{n}</Fragment>
          ))}
          {"\n"}
        </pre>
        {/* input layer (transparent text + hidden native caret) */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            syncCaret(e.currentTarget)
          }}
          onSelect={(e) => syncCaret(e.currentTarget)}
          onClick={(e) => syncCaret(e.currentTarget)}
          onKeyUp={(e) => syncCaret(e.currentTarget)}
          onFocus={(e) => {
            setFocused(true)
            syncCaret(e.currentTarget)
          }}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          rows={3}
          placeholder="close / delay(close, 20) - 1"
          className="relative block w-full resize-none bg-transparent p-4 font-mono text-[15px] leading-6 caret-transparent outline-none placeholder:text-faint"
          style={{ WebkitTextFillColor: "transparent", color: "transparent" }}
        />
      </div>
    </div>
  )
}
