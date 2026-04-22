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

export type ProjectPattern = "3y-cagr" | "5y-cagr" | "forecast-yoy" | "custom"

export type ProjectOptions = {
  years?: number
  pattern?: ProjectPattern
  customGrowth?: number
  opMarginOverride?: number
  netMarginOverride?: number
  perOverride?: number
}

export type ProjectionYear = {
  year: number
  sales: number
  op_profit: number
  net_income: number
  eps: number
  theoretical_price: number
}

export type ProjectionResult = {
  code: string
  display_code: string
  base_period: string | null
  latest_sales: number | null
  assumptions: {
    growth_pct: number
    op_margin_pct: number
    net_margin_pct: number
    per: number
    per_kind: string
    trailing_per: number | null
    forward_per: number | null
    shares_outstanding: number | null
    pattern: ProjectPattern
  }
  projection: ProjectionYear[]
  sensitivity: Array<{ growth_delta_pct: number; final_price: number }>
  current: {
    stock_price: number | null
    market_cap: number | null
  }
}

function cagr(first: number, last: number, years: number): number {
  if (first <= 0 || last <= 0 || years <= 0) return 0
  return (Math.pow(last / first, 1 / years) - 1) * 100
}

function pickFYSeries(rows: Record<string, unknown>[], field: string, count: number) {
  const fy = rows.filter((r) => r.g_type_of_current_period === "FY")
  return fy.slice(0, count).map((r) => toNum(r[field]))
}

export async function projectPL(
  codeInput: string,
  opts: ProjectOptions = {},
): Promise<ProjectionResult> {
  const code5 = normalizeCode(codeInput)
  const display = displayCode(code5)

  if (!endpointIsFresh(display, "financial")) {
    await fetchStock(code5, { endpoints: ["financial"] })
  }

  const rows = readFinancial(display)
  if (!rows || rows.length === 0) {
    throw new Error(`No financial data for ${display}`)
  }

  const fyRows = rows.filter((r) => r.g_type_of_current_period === "FY")
  if (fyRows.length === 0) {
    throw new Error(`No annual (FY) data for ${display}`)
  }
  const latest = fyRows[0]
  const latestSales = toNum(latest.pl_net_sales)
  const latestOp = toNum(latest.pl_operating_profit_loss)
  const latestNet = toNum(latest.pl_net_profit)

  await ensureMiniLoaded()
  const miniItem = findByCode(display) ?? findByCode(code5)
  const trailingPer = toNum(miniItem?.i_trailing_per)
  const forwardPer = toNum(miniItem?.i_forward_per)
  const currentPer =
    opts.perOverride ??
    forwardPer ??
    trailingPer ??
    15
  const currentPrice = toNum(miniItem?.stock_price)
  const mcap = miniItem?.market_capitalization ?? null
  const sharesOutstanding =
    currentPrice && mcap ? Math.round(mcap / currentPrice) : null

  const opMargin =
    opts.opMarginOverride ??
    (latestOp && latestSales ? (latestOp / latestSales) * 100 : 10)
  const netMargin =
    opts.netMarginOverride ??
    (latestNet && latestSales ? (latestNet / latestSales) * 100 : 7)

  const pattern: ProjectPattern = opts.pattern ?? "3y-cagr"
  let growth = 0
  if (pattern === "custom") {
    growth = opts.customGrowth ?? 0
  } else if (pattern === "forecast-yoy") {
    const forecastSales = toNum(latest.pl_forcast_net_sales)
    if (latestSales && forecastSales) {
      growth = ((forecastSales / latestSales) - 1) * 100
    } else {
      growth = toNum(miniItem?.yoy3y_sales) ?? 0
    }
  } else {
    const spanYears = pattern === "5y-cagr" ? 5 : 3
    const series = pickFYSeries(rows, "pl_net_sales", spanYears + 1)
    const validFirst = series.findLast?.((x) => x !== null) ?? null
    const validLast = series.find((x) => x !== null) ?? null
    if (validFirst && validLast && validFirst > 0) {
      const n = series.length - 1
      growth = cagr(validFirst, validLast, n)
    } else {
      growth = toNum(miniItem?.yoy3y_sales) ?? 0
    }
  }

  const years = opts.years ?? 5
  const projection: ProjectionYear[] = []
  let runningSales = latestSales ?? 0

  for (let i = 1; i <= years; i++) {
    runningSales = runningSales * (1 + growth / 100)
    const op = runningSales * (opMargin / 100)
    const net = runningSales * (netMargin / 100)
    const eps = sharesOutstanding ? net / sharesOutstanding : 0
    const price = eps * currentPer
    projection.push({
      year: i,
      sales: Math.round(runningSales),
      op_profit: Math.round(op),
      net_income: Math.round(net),
      eps: round(eps),
      theoretical_price: round(price, 0),
    })
  }

  const sensitivity = [-5, -2, 0, 2, 5].map((delta) => {
    const adjustedGrowth = growth + delta
    let s = latestSales ?? 0
    for (let i = 0; i < years; i++) {
      s = s * (1 + adjustedGrowth / 100)
    }
    const n = s * (netMargin / 100)
    const eps = sharesOutstanding ? n / sharesOutstanding : 0
    return {
      growth_delta_pct: delta,
      final_price: round(eps * currentPer, 0),
    }
  })

  return {
    code: code5,
    display_code: display,
    base_period: String(latest.g_current_period_end_date ?? ""),
    latest_sales: latestSales,
    assumptions: {
      growth_pct: round(growth, 2),
      op_margin_pct: round(opMargin, 2),
      net_margin_pct: round(netMargin, 2),
      per: round(currentPer, 2),
      per_kind:
        opts.perOverride !== undefined
          ? "override"
          : forwardPer !== null && currentPer === forwardPer
          ? "forward (i_forward_per)"
          : trailingPer !== null && currentPer === trailingPer
          ? "trailing (i_trailing_per)"
          : "fallback (15)",
      trailing_per: trailingPer,
      forward_per: forwardPer,
      shares_outstanding: sharesOutstanding,
      pattern,
    },
    projection,
    sensitivity,
    current: {
      stock_price: currentPrice,
      market_cap: mcap,
    },
  }
}
