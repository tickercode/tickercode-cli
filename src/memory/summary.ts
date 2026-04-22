import { readFileSync, existsSync } from "node:fs"
import { endpointPath } from "./paths"

type NumLike = number | string | null | undefined
const n = (v: NumLike): number | null => {
  if (v === null || v === undefined) return null
  const parsed = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(parsed) ? parsed : null
}

const pct = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b !== 0 ? +(((a - b) / b) * 100).toFixed(2) : null

function readJson<T = unknown>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T
  } catch {
    return null
  }
}

export type StockOverview = Record<string, unknown>
export type FinancialPeriod = Record<string, unknown>

export function readOverview(displayCode: string): StockOverview | null {
  return readJson<StockOverview>(endpointPath(displayCode, "overview"))
}

export function readFinancial(displayCode: string): FinancialPeriod[] | null {
  const data = readJson(endpointPath(displayCode, "financial"))
  return Array.isArray(data) ? (data as FinancialPeriod[]) : null
}

const SUMMARY_OVERVIEW_KEYS = [
  "code",
  "company_name",
  "sector17_name",
  "sector33_name",
  "market_name",
  "stock_price",
  "stock_price_date",
  "day_change_percent_stock_price",
  "market_capitalization",
  "i_per",
  "i_forecast_per",
  "i_pbr",
  "i_roe",
  "i_roa",
  "i_dividend_yield",
  "i_forecast_dividend_yield",
  "yoy_forecast_sales",
  "yoy2y_sales",
  "yoy5y_cagr_sales",
] as const

export function stockSummary(displayCode: string): Record<string, unknown> | null {
  const o = readOverview(displayCode)
  if (!o) return null
  const out: Record<string, unknown> = {}
  for (const k of SUMMARY_OVERVIEW_KEYS) {
    out[k] = o[k] ?? null
  }
  return out
}

export function financialSummary(displayCode: string): Record<string, unknown> | null {
  const rows = readFinancial(displayCode)
  if (!rows || rows.length === 0) return null

  const extract = (r: FinancialPeriod) => {
    const sales = n(r.pl_net_sales as NumLike)
    const op = n(r.pl_operating_profit_loss as NumLike)
    const ordinary = n(r.pl_ordinary_profit_loss as NumLike)
    const net = n(r.pl_net_profit as NumLike)
    return {
      period: r.g_current_period_end_date ?? null,
      period_type: r.g_type_of_current_period ?? null,
      doc_type: r.g_type_of_document ?? null,
      net_sales: sales,
      operating_profit: op,
      ordinary_profit: ordinary,
      net_income: net,
      operating_margin_pct:
        sales && op !== null ? +((op / sales) * 100).toFixed(2) : null,
      net_margin_pct:
        sales && net !== null ? +((net / sales) * 100).toFixed(2) : null,
    }
  }

  const latest = extract(rows[0])
  const prevYear = rows.find(
    (r, i) =>
      i > 0 &&
      r.g_type_of_current_period === rows[0].g_type_of_current_period,
  )

  const yoy = prevYear
    ? {
        sales_pct: pct(
          extract(rows[0]).net_sales,
          extract(prevYear).net_sales,
        ),
        operating_profit_pct: pct(
          extract(rows[0]).operating_profit,
          extract(prevYear).operating_profit,
        ),
        net_income_pct: pct(
          extract(rows[0]).net_income,
          extract(prevYear).net_income,
        ),
      }
    : null

  const forecast = (() => {
    const r = rows[0]
    const sales = n(r.pl_forcast_net_sales as NumLike)
    const op = n(r.pl_forcast_operating_profit_loss as NumLike)
    if (sales === null && op === null) return null
    return {
      net_sales: sales,
      operating_profit: op,
      operating_margin_pct:
        sales && op !== null ? +((op / sales) * 100).toFixed(2) : null,
    }
  })()

  return {
    code: rows[0].code ?? null,
    period_count: rows.length,
    latest,
    prev_year: prevYear ? extract(prevYear) : null,
    yoy,
    forecast,
  }
}

export function financialTrend(
  displayCode: string,
  metric: string,
  periods: number,
  periodType?: string,
): Record<string, unknown> | null {
  const rows = readFinancial(displayCode)
  if (!rows || rows.length === 0) return null

  const filtered = periodType
    ? rows.filter((r) => r.g_type_of_current_period === periodType)
    : rows

  const slice = filtered.slice(0, periods)

  const series = slice.map((r) => ({
    period: r.g_current_period_end_date ?? null,
    period_type: r.g_type_of_current_period ?? null,
    value: n(r[metric] as NumLike),
  }))

  const yoy_pct: (number | null)[] = series.map((s, i) => {
    if (i >= series.length - 1) return null
    return pct(s.value, series[i + 1]?.value ?? null)
  })

  const firstValid = series.findLast?.((s) => s.value !== null) ?? null
  const lastValid = series.find((s) => s.value !== null) ?? null
  const n_periods = series.length
  const cagr_pct =
    firstValid && lastValid && firstValid.value && lastValid.value && n_periods > 1
      ? +(
          (Math.pow(lastValid.value / firstValid.value, 1 / (n_periods - 1)) -
            1) *
          100
        ).toFixed(2)
      : null

  return {
    code: rows[0].code ?? null,
    metric,
    period_type: periodType ?? "mixed",
    series,
    yoy_pct,
    cagr_pct,
  }
}
