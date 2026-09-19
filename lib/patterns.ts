import { mulberry32, makeGaussian, hashString } from "./rng"

export type PatternKind = "v-rebound" | "breakout" | "top-reversal" | "uptrend" | "choppy"

type Archetype = {
  kind: PatternKind
  label: string
  keywords: string[]
  annotation: string
}

const ARCHETYPES: Archetype[] = [
  {
    kind: "v-rebound",
    label: "暴跌后反弹",
    keywords: ["暴跌", "反弹", "崩", "急跌", "探底", "回升", "v", "crash", "rebound", "dip"],
    annotation: "急速下挫后在低位企稳，随后走出 V 型修复。",
  },
  {
    kind: "breakout",
    label: "横盘突破",
    keywords: ["横盘", "突破", "盘整", "整理", "放量", "breakout", "consolidat", "range"],
    annotation: "长时间窄幅盘整后放量向上突破前高。",
  },
  {
    kind: "top-reversal",
    label: "见顶回落",
    keywords: ["见顶", "回落", "顶部", "反转", "下跌", "top", "reversal", "peak", "double"],
    annotation: "冲高后动能衰竭，形成顶部并转入下行。",
  },
  {
    kind: "uptrend",
    label: "稳步上行",
    keywords: ["上涨", "上行", "牛", "趋势", "爬升", "uptrend", "bull", "steady", "grind"],
    annotation: "低波动的持续上行趋势，回撤浅、斜率稳定。",
  },
  {
    kind: "choppy",
    label: "高位震荡",
    keywords: ["震荡", "宽幅", "反复", "choppy", "sideways", "volatile"],
    annotation: "高位大幅来回震荡，方向不明、波动放大。",
  },
]

const INSTRUMENTS = [
  { symbol: "NVDA", name: "NVIDIA", market: "NASDAQ" },
  { symbol: "AAPL", name: "Apple", market: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla", market: "NASDAQ" },
  { symbol: "600519", name: "贵州茅台", market: "SSE" },
  { symbol: "300750", name: "宁德时代", market: "SZSE" },
  { symbol: "0700.HK", name: "腾讯控股", market: "HKEX" },
  { symbol: "BTC", name: "Bitcoin", market: "CRYPTO" },
  { symbol: "META", name: "Meta", market: "NASDAQ" },
  { symbol: "9988.HK", name: "阿里巴巴", market: "HKEX" },
  { symbol: "AMD", name: "AMD", market: "NASDAQ" },
]

export type PatternMatch = {
  id: string
  symbol: string
  name: string
  market: string
  period: string
  similarity: number
  series: number[]
  matchStart: number
  matchEnd: number
  annotation: string
  kindLabel: string
}

export function detectArchetype(query: string): Archetype {
  const q = query.toLowerCase()
  let best = ARCHETYPES[0]
  let bestScore = -1
  for (const a of ARCHETYPES) {
    let score = 0
    for (const k of a.keywords) if (q.includes(k)) score++
    if (score > bestScore) {
      bestScore = score
      best = a
    }
  }
  if (bestScore <= 0) return ARCHETYPES[Math.abs(hashString(query)) % ARCHETYPES.length]
  return best
}

function shapeValue(kind: PatternKind, t: number): number {
  // t in [0,1]; returns a base price level around 100.
  switch (kind) {
    case "v-rebound": {
      // Fall to a trough near t=0.45 then recover.
      const trough = 0.45
      const depth = 32
      const d = Math.abs(t - trough)
      return 100 - depth * (1 - d / Math.max(trough, 1 - trough)) * (t < 0.9 ? 1 : 0.6)
    }
    case "breakout":
      return t < 0.6 ? 100 + Math.sin(t * 30) * 1.5 : 100 + (t - 0.6) * 90
    case "top-reversal":
      return t < 0.5 ? 100 + t * 60 : 130 - (t - 0.5) * 80
    case "uptrend":
      return 100 + t * 55
    case "choppy":
      return 118 + Math.sin(t * 26) * 10 + Math.sin(t * 9) * 6
  }
}

function generateSeries(kind: PatternKind, seed: number): { series: number[]; start: number; end: number } {
  const rand = mulberry32(seed)
  const gauss = makeGaussian(rand)
  const N = 90
  // The matched pattern lives in the middle; pad with contextual noise.
  const padStart = 12 + Math.floor(rand() * 8)
  const padEnd = 10 + Math.floor(rand() * 8)
  const core = N - padStart - padEnd
  const series: number[] = []
  let level = 100 + (rand() - 0.5) * 20
  for (let i = 0; i < padStart; i++) {
    level *= 1 + 0.004 * gauss()
    series.push(level)
  }
  const base = series[series.length - 1] || 100
  for (let i = 0; i < core; i++) {
    const t = i / (core - 1)
    const shaped = shapeValue(kind, t)
    const noisy = (shaped / 100) * base * (1 + 0.012 * gauss())
    series.push(noisy)
  }
  let tail = series[series.length - 1]
  for (let i = 0; i < padEnd; i++) {
    tail *= 1 + 0.005 * gauss()
    series.push(tail)
  }
  return { series, start: padStart, end: padStart + core }
}

function periodLabel(seed: number): string {
  const rand = mulberry32(seed)
  const year = 2016 + Math.floor(rand() * 9)
  const m1 = 1 + Math.floor(rand() * 9)
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
  return `${year}-${months[m1 - 1]} → ${year}-${months[Math.min(11, m1 + 1)]}`
}

export function searchPatterns(query: string): { archetype: Archetype; matches: PatternMatch[] } {
  const archetype = detectArchetype(query)
  const baseSeed = hashString(query + archetype.kind)
  const count = 6
  const matches: PatternMatch[] = []
  const usedInstruments = new Set<number>()
  for (let i = 0; i < count; i++) {
    let idx = (Math.abs(baseSeed) + i * 37) % INSTRUMENTS.length
    while (usedInstruments.has(idx)) idx = (idx + 1) % INSTRUMENTS.length
    usedInstruments.add(idx)
    const inst = INSTRUMENTS[idx]
    const seed = baseSeed + i * 101 + 7
    const { series, start, end } = generateSeries(archetype.kind, seed)
    const similarity = Math.round((94 - i * 4.5 - (seed % 5)) * 10) / 10
    matches.push({
      id: `${archetype.kind}-${i}`,
      symbol: inst.symbol,
      name: inst.name,
      market: inst.market,
      period: periodLabel(seed),
      similarity: Math.max(58, similarity),
      series,
      matchStart: start,
      matchEnd: end,
      annotation: archetype.annotation,
      kindLabel: archetype.label,
    })
  }
  return { archetype, matches }
}

export const PATTERN_SUGGESTIONS = [
  "暴跌后快速反弹",
  "长期横盘后放量突破",
  "冲高见顶随后回落",
  "低波动稳步上行的牛市",
  "高位宽幅震荡",
]
