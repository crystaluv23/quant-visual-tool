import type { MarketData } from "./market-data"

/**
 * A tiny factor-expression language, in the spirit of Hazel's philosophy:
 * incomplete code does not throw — it yields an *incomplete result*.
 *
 * Holes / probes are written with brackets:
 *   []            an empty hole  → incomplete result
 *   [ expr ]      a probe        → complete, but "under examination"; we sweep
 *                                  it to show how metrics move as it changes.
 * A bare `?` is also accepted as an empty hole (legacy).
 */

export const VARIABLES = ["close", "open", "high", "low", "volume", "returns", "vol"] as const
export type VarName = (typeof VARIABLES)[number]

export const FUNCTIONS: Record<string, { arity: number; desc: string }> = {
  ma: { arity: 2, desc: "ma(x, n) 滚动均值" },
  std: { arity: 2, desc: "std(x, n) 滚动标准差" },
  sum: { arity: 2, desc: "sum(x, n) 滚动求和" },
  delay: { arity: 2, desc: "delay(x, n) 滞后 n 期" },
  delta: { arity: 2, desc: "delta(x, n) 与 n 期前之差" },
  corr: { arity: 3, desc: "corr(x, y, n) 滚动相关性" },
  rank: { arity: 1, desc: "rank(x) 滚动分位 [-0.5,0.5]" },
  abs: { arity: 1, desc: "abs(x) 绝对值" },
  log: { arity: 1, desc: "log(x) 自然对数" },
  sign: { arity: 1, desc: "sign(x) 符号" },
  sqrt: { arity: 1, desc: "sqrt(x) 平方根" },
}

type Series = number[]

// ---------- Tokenizer ----------
type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "lb" }
  | { t: "rb" }
  | { t: "comma" }
  | { t: "hole" }

function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === " " || c === "\n" || c === "\t") {
      i++
      continue
    }
    if (c === "?") {
      toks.push({ t: "hole" })
      i++
      continue
    }
    if (c === "[") {
      toks.push({ t: "lb" })
      i++
      continue
    }
    if (c === "]") {
      toks.push({ t: "rb" })
      i++
      continue
    }
    if (c === "(") {
      toks.push({ t: "lp" })
      i++
      continue
    }
    if (c === ")") {
      toks.push({ t: "rp" })
      i++
      continue
    }
    if (c === ",") {
      toks.push({ t: "comma" })
      i++
      continue
    }
    if ("+-*/".includes(c)) {
      toks.push({ t: "op", v: c })
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      let num = ""
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++]
      toks.push({ t: "num", v: Number.parseFloat(num) })
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let id = ""
      while (i < src.length && /[a-zA-Z_0-9]/.test(src[i])) id += src[i++]
      toks.push({ t: "id", v: id })
      continue
    }
    i++
  }
  return toks
}

// ---------- Recovery (incomplete -> holes) ----------
function recover(src: string): { src: string; recovered: boolean } {
  let s = src.trim()
  let recovered = false
  if (s === "") return { src: "[]", recovered: true }

  if (/[+\-*/,([]\s*$/.test(s)) {
    s = s + " []"
    recovered = true
  }
  const opens = (s.match(/\(/g) || []).length
  const closes = (s.match(/\)/g) || []).length
  if (opens > closes) {
    s = s + ")".repeat(opens - closes)
    recovered = true
  }
  const bopens = (s.match(/\[/g) || []).length
  const bcloses = (s.match(/\]/g) || []).length
  if (bopens > bcloses) {
    s = s + "]".repeat(bopens - bcloses)
    recovered = true
  }
  return { src: s, recovered }
}

// ---------- Parser (recursive descent) ----------
type Node =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "hole" }
  | { k: "probe"; id: number; a: Node | null }
  | { k: "unary"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; name: string; args: Node[] }

class Parser {
  toks: Tok[]
  pos = 0
  holes = 0
  probeSeq = 0
  constructor(toks: Tok[]) {
    this.toks = toks
  }
  peek() {
    return this.toks[this.pos]
  }
  next() {
    return this.toks[this.pos++]
  }
  parse(): Node {
    return this.expr()
  }
  expr(): Node {
    let left = this.term()
    while (this.peek() && this.peek().t === "op" && "+-".includes((this.peek() as any).v)) {
      const op = (this.next() as any).v
      const right = this.term()
      left = { k: "bin", op, a: left, b: right }
    }
    return left
  }
  term(): Node {
    let left = this.unary()
    while (this.peek() && this.peek().t === "op" && "*/".includes((this.peek() as any).v)) {
      const op = (this.next() as any).v
      const right = this.unary()
      left = { k: "bin", op, a: left, b: right }
    }
    return left
  }
  unary(): Node {
    const p = this.peek()
    if (p && p.t === "op" && (p.v === "-" || p.v === "+")) {
      const op = (this.next() as any).v
      return { k: "unary", op, a: this.unary() }
    }
    return this.atom()
  }
  atom(): Node {
    const p = this.peek()
    if (!p) {
      this.holes++
      return { k: "hole" }
    }
    if (p.t === "hole") {
      this.next()
      this.holes++
      return { k: "hole" }
    }
    if (p.t === "lb") {
      this.next()
      const id = this.probeSeq++
      if (this.peek() && this.peek().t === "rb") {
        this.next()
        this.holes++
        return { k: "probe", id, a: null }
      }
      const inner = this.expr()
      if (this.peek() && this.peek().t === "rb") this.next()
      return { k: "probe", id, a: inner }
    }
    if (p.t === "num") {
      this.next()
      return { k: "num", v: (p as any).v }
    }
    if (p.t === "lp") {
      this.next()
      const e = this.expr()
      if (this.peek() && this.peek().t === "rp") this.next()
      return e
    }
    if (p.t === "id") {
      this.next()
      const name = (p as any).v
      if (this.peek() && this.peek().t === "lp") {
        this.next()
        const args: Node[] = []
        if (!(this.peek() && this.peek().t === "rp")) {
          args.push(this.expr())
          while (this.peek() && this.peek().t === "comma") {
            this.next()
            args.push(this.expr())
          }
        }
        if (this.peek() && this.peek().t === "rp") this.next()
        return { k: "call", name, args }
      }
      return { k: "var", v: name }
    }
    this.next()
    this.holes++
    return { k: "hole" }
  }
}

// ---------- Evaluation ----------
const HOLE_NEUTRAL = 1

// Override map keyed by probe id — used to substitute a probed sub-expression
// with a swept series during sensitivity analysis.
let activeOverride: Map<number, Series> | null = null

function rollingApply(x: Series, n: number, fn: (win: number[]) => number): Series {
  const nn = Math.max(1, Math.round(n))
  return x.map((_, i) => {
    const start = Math.max(0, i - nn + 1)
    return fn(x.slice(start, i + 1))
  })
}

function evalNode(node: Node, md: MarketData): Series {
  const L = md.close.length
  const constSeries = (v: number) => new Array(L).fill(v)
  switch (node.k) {
    case "num":
      return constSeries(node.v)
    case "hole":
      return constSeries(HOLE_NEUTRAL)
    case "probe": {
      if (activeOverride && activeOverride.has(node.id)) return activeOverride.get(node.id)!.slice()
      if (node.a == null) return constSeries(HOLE_NEUTRAL)
      return evalNode(node.a, md)
    }
    case "var": {
      const v = (md as any)[node.v] as number[] | undefined
      if (!v) return constSeries(HOLE_NEUTRAL)
      return v.slice()
    }
    case "unary": {
      const a = evalNode(node.a, md)
      return a.map((x) => (node.op === "-" ? -x : x))
    }
    case "bin": {
      const a = evalNode(node.a, md)
      const b = evalNode(node.b, md)
      return a.map((x, i) => {
        const y = b[i]
        switch (node.op) {
          case "+":
            return x + y
          case "-":
            return x - y
          case "*":
            return x * y
          case "/":
            return Math.abs(y) < 1e-9 ? 0 : x / y
        }
        return 0
      })
    }
    case "call": {
      const args = node.args.map((a) => evalNode(a, md))
      const arg0 = args[0] ?? constSeries(HOLE_NEUTRAL)
      const nOf = (idx: number, dflt: number) => {
        const s = args[idx]
        return s ? s[s.length - 1] || dflt : dflt
      }
      switch (node.name) {
        case "ma":
          return rollingApply(arg0, nOf(1, 5), (w) => w.reduce((p, c) => p + c, 0) / w.length)
        case "sum":
          return rollingApply(arg0, nOf(1, 5), (w) => w.reduce((p, c) => p + c, 0))
        case "std":
          return rollingApply(arg0, nOf(1, 20), (w) => {
            const m = w.reduce((p, c) => p + c, 0) / w.length
            return Math.sqrt(w.reduce((p, c) => p + (c - m) ** 2, 0) / w.length)
          })
        case "delay": {
          const n = Math.round(nOf(1, 1))
          return arg0.map((_, i) => (i - n >= 0 ? arg0[i - n] : arg0[0]))
        }
        case "delta": {
          const n = Math.round(nOf(1, 1))
          return arg0.map((v, i) => (i - n >= 0 ? v - arg0[i - n] : 0))
        }
        case "corr": {
          const y = args[1] ?? constSeries(HOLE_NEUTRAL)
          const n = Math.round(nOf(2, 20))
          return arg0.map((_, i) => {
            const s = Math.max(0, i - n + 1)
            const xw = arg0.slice(s, i + 1)
            const yw = y.slice(s, i + 1)
            const mx = xw.reduce((p, c) => p + c, 0) / xw.length
            const my = yw.reduce((p, c) => p + c, 0) / yw.length
            let cov = 0
            let vx = 0
            let vy = 0
            for (let k = 0; k < xw.length; k++) {
              cov += (xw[k] - mx) * (yw[k] - my)
              vx += (xw[k] - mx) ** 2
              vy += (yw[k] - my) ** 2
            }
            const d = Math.sqrt(vx * vy)
            return d < 1e-9 ? 0 : cov / d
          })
        }
        case "rank":
          return rollingApply(arg0, 60, (w) => {
            const last = w[w.length - 1]
            const below = w.filter((v) => v <= last).length
            return below / w.length - 0.5
          })
        case "abs":
          return arg0.map((v) => Math.abs(v))
        case "log":
          return arg0.map((v) => (v > 0 ? Math.log(v) : 0))
        case "sign":
          return arg0.map((v) => Math.sign(v))
        case "sqrt":
          return arg0.map((v) => (v >= 0 ? Math.sqrt(v) : 0))
        default:
          return constSeries(HOLE_NEUTRAL)
      }
    }
  }
}

function collectProbes(n: Node, acc: { id: number; a: Node | null }[]) {
  switch (n.k) {
    case "probe":
      acc.push({ id: n.id, a: n.a })
      if (n.a) collectProbes(n.a, acc)
      break
    case "unary":
      collectProbes(n.a, acc)
      break
    case "bin":
      collectProbes(n.a, acc)
      collectProbes(n.b, acc)
      break
    case "call":
      n.args.forEach((a) => collectProbes(a, acc))
      break
  }
}

function nodeToStr(n: Node): string {
  switch (n.k) {
    case "num":
      return String(n.v)
    case "var":
      return n.v
    case "hole":
      return "□"
    case "probe":
      return n.a ? nodeToStr(n.a) : "□"
    case "unary":
      return n.op + nodeToStr(n.a)
    case "bin":
      return `${nodeToStr(n.a)} ${n.op} ${nodeToStr(n.b)}`
    case "call":
      return `${n.name}(${n.args.map(nodeToStr).join(", ")})`
  }
}

// ---------- Backtest ----------
export type Metrics = {
  sharpe: number
  annReturn: number
  annVol: number
  maxDrawdown: number
  turnover: number
  hitRate: number
}

function zscore(x: number[]): number[] {
  const valid = x.filter((v) => Number.isFinite(v))
  const m = valid.reduce((a, b) => a + b, 0) / (valid.length || 1)
  const sd = Math.sqrt(valid.reduce((a, b) => a + (b - m) ** 2, 0) / (valid.length || 1)) || 1
  return x.map((v) => (Number.isFinite(v) ? (v - m) / sd : 0))
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function corrOf(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  const ma = a.reduce((p, c) => p + c, 0) / n
  const mb = b.reduce((p, c) => p + c, 0) / n
  let cov = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb)
    va += (a[i] - ma) ** 2
    vb += (b[i] - mb) ** 2
  }
  const d = Math.sqrt(va * vb)
  return d < 1e-9 ? 0 : cov / d
}

type BT = { position: number[]; equity: number[]; benchEquity: number[]; metrics: Metrics }

function backtest(signal: number[], md: MarketData): BT {
  const z = zscore(signal)
  const position = z.map((v) => clamp(v, -2.5, 2.5))

  const stratRet = md.returns.map((r, i) => (i === 0 ? 0 : position[i - 1] * r))
  const equity: number[] = []
  let eq = 1
  for (let i = 0; i < stratRet.length; i++) {
    eq *= 1 + stratRet[i]
    equity.push(eq)
  }
  const benchEquity: number[] = []
  let beq = 1
  for (let i = 0; i < md.returns.length; i++) {
    beq *= 1 + md.returns[i]
    benchEquity.push(beq)
  }

  const meanR = stratRet.reduce((a, b) => a + b, 0) / stratRet.length
  const sdR = Math.sqrt(stratRet.reduce((a, b) => a + (b - meanR) ** 2, 0) / stratRet.length) || 1e-9
  const sharpe = (meanR / sdR) * Math.sqrt(252)
  const annReturn = Math.pow(equity[equity.length - 1] || 1, 252 / equity.length) - 1
  const annVol = sdR * Math.sqrt(252)
  let peak = -Infinity
  let maxDD = 0
  for (const e of equity) {
    peak = Math.max(peak, e)
    maxDD = Math.min(maxDD, e / peak - 1)
  }
  let turn = 0
  for (let i = 1; i < position.length; i++) turn += Math.abs(position[i] - position[i - 1])
  const turnover = turn / position.length
  const wins = stratRet.filter((r) => r > 0).length
  const denom = stratRet.filter((r) => r !== 0).length
  const hitRate = denom ? wins / denom : 0

  return {
    position,
    equity,
    benchEquity,
    metrics: {
      sharpe,
      annReturn,
      annVol,
      maxDrawdown: maxDD,
      turnover,
      hitRate: Number.isFinite(hitRate) ? hitRate : 0,
    },
  }
}

// ---------- Sensitivity (the "incomplete result" payoff) ----------
export type Sensitivity = {
  present: boolean
  kind: "scale" | "value" | null
  label: string
  xs: number[]
  sharpes: number[]
  curves: number[][]
  baseIndex: number
}

const EMPTY_SENS: Sensitivity = {
  present: false,
  kind: null,
  label: "",
  xs: [],
  sharpes: [],
  curves: [],
  baseIndex: 0,
}

function computeSensitivity(ast: Node, md: MarketData, target: { id: number; a: Node | null } | null): Sensitivity {
  if (!target) return EMPTY_SENS

  let xs: number[]
  let baseIndex: number
  let kind: "scale" | "value"
  let makeSeries: (x: number) => Series

  if (target.a != null) {
    activeOverride = null
    const base = evalNode(target.a, md)
    xs = [0.5, 0.75, 1, 1.25, 1.5]
    baseIndex = 2
    kind = "scale"
    makeSeries = (s) => base.map((v) => v * s)
  } else {
    xs = [0.25, 0.5, 1, 2, 4]
    baseIndex = 2
    kind = "value"
    makeSeries = (v) => new Array(md.close.length).fill(v)
  }

  const curves: number[][] = []
  const sharpes: number[] = []
  for (const x of xs) {
    activeOverride = new Map([[target.id, makeSeries(x)]])
    const sig = evalNode(ast, md)
    const bt = backtest(sig, md)
    curves.push(bt.equity)
    sharpes.push(bt.metrics.sharpe)
  }
  activeOverride = null

  return {
    present: true,
    kind,
    label: target.a ? nodeToStr(target.a) : "□",
    xs,
    sharpes,
    curves,
    baseIndex,
  }
}

export type FactorResult = {
  ok: boolean
  incomplete: boolean
  holeCount: number
  probeCount: number
  recovered: boolean
  message: string
  signal: number[]
  position: number[]
  equity: number[]
  benchEquity: number[]
  metrics: Metrics
  correlations: { name: string; value: number }[]
  sensitivity: Sensitivity
}

export function evaluateFactor(expr: string, md: MarketData): FactorResult {
  const { src, recovered } = recover(expr)
  const toks = tokenize(src)
  const parser = new Parser(toks)

  let ast: Node
  let signal: number[]
  let holeCount = 0
  const probes: { id: number; a: Node | null }[] = []
  try {
    ast = parser.parse()
    holeCount = parser.holes
    collectProbes(ast, probes)
    activeOverride = null
    signal = evalNode(ast, md)
  } catch {
    ast = { k: "hole" }
    signal = new Array(md.close.length).fill(0)
    holeCount = 1
  }

  const incomplete = holeCount > 0 || recovered || expr.trim() === ""
  const bt = backtest(signal, md)

  // Style-factor correlations.
  const momentum = md.close.map((_, i) => (i >= 20 ? md.close[i] / md.close[i - 20] - 1 : 0))
  const reversal = md.returns.map((r) => -r)
  const volatility = md.vol.slice()
  const liquidity = md.volume.map((v) => Math.log(v))
  const correlations = [
    { name: "动量 MOM", value: corrOf(signal, momentum) },
    { name: "反转 REV", value: corrOf(signal, reversal) },
    { name: "波动 VOL", value: corrOf(signal, volatility) },
    { name: "流动性 LIQ", value: corrOf(signal, liquidity) },
    { name: "基准 MKT", value: corrOf(bt.position, md.returns) },
  ].map((c) => ({ ...c, value: Number.isFinite(c.value) ? c.value : 0 }))

  // Probe / hole to examine: prefer a filled probe, else an empty hole-probe.
  const target = probes.find((p) => p.a != null) ?? probes[0] ?? null
  const sensitivity = computeSensitivity(ast, md, target)

  const probeCount = probes.filter((p) => p.a != null).length
  const message = incomplete
    ? holeCount > 0
      ? `含 ${holeCount} 个 hole，展示不完整近似结果`
      : "表达式尚未闭合，已自动补全为近似预览"
    : probeCount > 0
      ? `probe 已就位 · 正在考察圈出的表达式`
      : "表达式完整，结果可信"

  return {
    ok: true,
    incomplete,
    holeCount,
    probeCount,
    recovered,
    message,
    signal,
    position: bt.position,
    equity: bt.equity,
    benchEquity: bt.benchEquity,
    metrics: bt.metrics,
    correlations,
    sensitivity,
  }
}

export const EXAMPLE_FACTORS: { label: string; expr: string; note: string }[] = [
  { label: "动量", expr: "close / delay(close, 20) - 1", note: "20 日价格动量" },
  { label: "均值回归", expr: "-(close - ma(close, 10)) / std(close, 10)", note: "偏离均线的反向信号" },
  { label: "含 hole 的雏形", expr: "delta(close, 5) / []", note: "分母待定，感受归一化的作用" },
  { label: "探针 · 考察分母", expr: "close / [ delay(close, 20) ]", note: "圈出分母，扫描它对 Sharpe 的影响" },
  { label: "波动调整动量", expr: "rank(close / delay(close, 20) - 1) / vol", note: "用波动率缩放动量" },
]
