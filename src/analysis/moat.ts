import { fetchStock } from "../memory/fetch"
import { readFinancial } from "../memory/summary"
import { normalizeCode, displayCode } from "../lib/code"
import { findByCode, ensureMiniLoaded } from "../memory/mini"
import { endpointIsFresh } from "../memory/meta"

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

const round = (n: number, d = 2): number => +n.toFixed(d)

function stats(nums: number[]): { mean: number; stdev: number; median: number } {
  if (nums.length === 0) return { mean: 0, stdev: 0, median: 0 }
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  return { mean, stdev: Math.sqrt(variance), median }
}

function rateStability(stdev: number, thresholds: [number, number, number, number]): number {
  if (stdev <= thresholds[0]) return 5
  if (stdev <= thresholds[1]) return 4
  if (stdev <= thresholds[2]) return 3
  if (stdev <= thresholds[3]) return 2
  return 1
}

export type MoatResult = {
  code: string
  display_code: string
  years_analyzed: number
  moat_score: number
  components: {
    op_margin_stability: { values: number[]; mean: number; stdev: number; rating: number }
    gross_margin_stability: { values: number[]; mean: number; stdev: number; rating: number }
    capital_efficient_growth: { roe: number | null; sales_cagr: number; rating: number }
    roe_stability: { values: number[]; mean: number; stdev: number; rating: number }
  }
  interpretation: string
}

function cagr(series: number[]): number {
  if (series.length < 2) return 0
  const first = series[series.length - 1]
  const last = series[0]
  if (first <= 0 || last <= 0) return 0
  return (Math.pow(last / first, 1 / (series.length - 1)) - 1) * 100
}

export async function calculateMoat(codeInput: string): Promise<MoatResult> {
  const code5 = normalizeCode(codeInput)
  const display = displayCode(code5)

  if (!endpointIsFresh(display, "financial")) {
    await fetchStock(code5, { endpoints: ["financial"] })
  }

  const rows = readFinancial(display)
  if (!rows || rows.length === 0) {
    throw new Error(`No financial data for ${display}`)
  }

  const fyRows = rows.filter((r) => r.g_type_of_current_period === "FY").slice(0, 10)

  const opMargins = fyRows
    .map((r) => {
      const pre = toNum(r.pl_i_operating_margin)
      if (pre !== null) return pre
      const sales = toNum(r.pl_net_sales)
      const op = toNum(r.pl_operating_profit_loss)
      return sales && op !== null ? (op / sales) * 100 : null
    })
    .filter((x): x is number => x !== null)

  const grossMargins = fyRows
    .map((r) => toNum(r.pl_i_gross_margin))
    .filter((x): x is number => x !== null)

  const roes = fyRows
    .map((r) => {
      const net = toNum(r.pl_net_profit)
      const equity = toNum(r.bs_shareholders_equity) ?? toNum(r.bs_equity)
      return net !== null && equity && equity > 0 ? (net / equity) * 100 : null
    })
    .filter((x): x is number => x !== null)

  const opStats = stats(opMargins)
  const gmStats = stats(grossMargins)
  const roeStats = stats(roes)

  const salesSeries = fyRows
    .map((r) => toNum(r.pl_net_sales))
    .filter((x): x is number => x !== null)
  const salesCagr = cagr(salesSeries)

  await ensureMiniLoaded()
  const miniItem = findByCode(display) ?? findByCode(code5)
  const miniRoe = toNum(miniItem?.i_roe)

  const opRating = rateStability(opStats.stdev, [1, 3, 6, 12])
  const gmRating = rateStability(gmStats.stdev, [1.5, 3, 6, 12])
  const roeRating = rateStability(roeStats.stdev, [2, 5, 10, 20])

  const capitalEfficientGrowth = (miniRoe ?? roeStats.mean ?? 0) * (salesCagr / 100)
  let capitalRating = 1
  if (capitalEfficientGrowth >= 4) capitalRating = 5
  else if (capitalEfficientGrowth >= 2) capitalRating = 4
  else if (capitalEfficientGrowth >= 1) capitalRating = 3
  else if (capitalEfficientGrowth >= 0.3) capitalRating = 2

  const moatScore = round(
    (opRating + gmRating + roeRating + capitalRating) / 4,
    1,
  )

  let interpretation = ""
  if (moatScore >= 4) interpretation = "強い堀の兆候あり — 利益率が長期にわたり安定し、成長も資本効率的"
  else if (moatScore >= 3) interpretation = "一定の堀あり — 業界平均を上回る収益性だが、脅威には要注意"
  else if (moatScore >= 2) interpretation = "限定的な堀 — 利益率ブレ or 成長が資本効率を伴わない"
  else interpretation = "堀の痕跡は希薄 — 競争激化で収益性が不安定"

  return {
    code: code5,
    display_code: display,
    years_analyzed: fyRows.length,
    moat_score: moatScore,
    components: {
      op_margin_stability: {
        values: opMargins.map((v) => round(v, 2)),
        mean: round(opStats.mean, 2),
        stdev: round(opStats.stdev, 2),
        rating: opRating,
      },
      gross_margin_stability: {
        values: grossMargins.map((v) => round(v, 2)),
        mean: round(gmStats.mean, 2),
        stdev: round(gmStats.stdev, 2),
        rating: gmRating,
      },
      capital_efficient_growth: {
        roe: miniRoe ?? (roeStats.mean ? round(roeStats.mean, 2) : null),
        sales_cagr: round(salesCagr, 2),
        rating: capitalRating,
      },
      roe_stability: {
        values: roes.map((v) => round(v, 2)),
        mean: round(roeStats.mean, 2),
        stdev: round(roeStats.stdev, 2),
        rating: roeRating,
      },
    },
    interpretation,
  }
}
