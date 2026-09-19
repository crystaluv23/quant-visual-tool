import { mulberry32, makeGaussian } from "./rng"

export const TRADING_DAYS = 252

export type MarketData = {
  dates: string[]
  close: number[]
  open: number[]
  high: number[]
  low: number[]
  volume: number[]
  returns: number[]
  vol: number[] // rolling 20d realized volatility (annualized-ish)
}

function rollingStd(x: number[], n: number): number[] {
  const out = new Array(x.length).fill(0)
  for (let i = 0; i < x.length; i++) {
    const start = Math.max(0, i - n + 1)
    const win = x.slice(start, i + 1)
    const mean = win.reduce((a, b) => a + b, 0) / win.length
    const variance = win.reduce((a, b) => a + (b - mean) ** 2, 0) / win.length
    out[i] = Math.sqrt(variance)
  }
  return out
}

// Generates one synthetic instrument with regime shifts so factors feel alive.
export function generateMarketData(seed = 42): MarketData {
  const rand = mulberry32(seed)
  const gauss = makeGaussian(rand)

  const close: number[] = []
  const open: number[] = []
  const high: number[] = []
  const low: number[] = []
  const volume: number[] = []
  const returns: number[] = []

  let price = 100
  let drift = 0.0004
  const dates: string[] = []
  const start = new Date(2023, 0, 2)

  for (let i = 0; i < TRADING_DAYS; i++) {
    // Regime shifts every ~40 days.
    if (i % 41 === 0) drift = (rand() - 0.45) * 0.0016
    const sigma = 0.008 + 0.006 * Math.abs(Math.sin(i / 30))
    const r = drift + sigma * gauss()
    const prevClose = price
    price = Math.max(2, price * (1 + r))

    const o = prevClose * (1 + sigma * 0.3 * gauss())
    const hi = Math.max(o, price) * (1 + Math.abs(sigma * 0.6 * gauss()))
    const lo = Math.min(o, price) * (1 - Math.abs(sigma * 0.6 * gauss()))
    const vBase = 1_000_000 * (1 + 0.6 * Math.abs(gauss()) + 3 * Math.abs(r) * 20)

    close.push(price)
    open.push(o)
    high.push(hi)
    low.push(lo)
    volume.push(Math.round(vBase))
    returns.push(i === 0 ? 0 : (price - prevClose) / prevClose)

    const d = new Date(start)
    d.setDate(d.getDate() + Math.floor(i * 1.4))
    dates.push(d.toISOString().slice(0, 10))
  }

  const vol = rollingStd(returns, 20).map((v) => v * Math.sqrt(252))

  return { dates, close, open, high, low, volume, returns, vol }
}
