export type NumericOp = "gt" | "lt" | "gte" | "lte" | "eq"

export type NumericCondition = {
  field: string
  op: NumericOp
  value: number
}

export type ExactCondition = {
  field: string
  value: string
}

export type SortSpec = {
  field: string
  order: "asc" | "desc"
}

export type ScreenOptions = {
  numeric?: NumericCondition[]
  exact?: ExactCondition[]
  includeNull?: boolean
  sort?: SortSpec
  limit?: number
  offset?: number
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function compare(op: NumericOp, actual: number, target: number): boolean {
  switch (op) {
    case "gt":
      return actual > target
    case "lt":
      return actual < target
    case "gte":
      return actual >= target
    case "lte":
      return actual <= target
    case "eq":
      return actual === target
  }
}

function passesNumeric(
  item: Record<string, unknown>,
  cond: NumericCondition,
  includeNull: boolean,
): boolean {
  const actual = toNumber(item[cond.field])
  if (actual === null) return includeNull
  return compare(cond.op, actual, cond.value)
}

function passesExact(
  item: Record<string, unknown>,
  cond: ExactCondition,
): boolean {
  const raw = item[cond.field]
  if (raw === null || raw === undefined) return false
  return String(raw) === cond.value
}

export function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  options: ScreenOptions,
): T[] {
  const { numeric = [], exact = [], includeNull = false } = options
  if (numeric.length === 0 && exact.length === 0) return items.slice()
  return items.filter((item) => {
    for (const c of exact) {
      if (!passesExact(item, c)) return false
    }
    for (const c of numeric) {
      if (!passesNumeric(item, c, includeNull)) return false
    }
    return true
  })
}

export function sortBy<T extends Record<string, unknown>>(
  items: T[],
  spec: SortSpec,
): T[] {
  const sign = spec.order === "asc" ? 1 : -1
  return items.slice().sort((a, b) => {
    const av = toNumber(a[spec.field])
    const bv = toNumber(b[spec.field])
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    if (av === bv) return 0
    return av < bv ? -1 * sign : 1 * sign
  })
}

export function screen<T extends Record<string, unknown>>(
  items: T[],
  options: ScreenOptions,
): T[] {
  let out = applyFilters(items, options)
  if (options.sort) out = sortBy(out, options.sort)
  if (options.offset) out = out.slice(options.offset)
  if (options.limit && options.limit > 0) out = out.slice(0, options.limit)
  return out
}

const NUMERIC_FLAG_MAP: Record<string, { field: string; op: NumericOp }> = {
  "per-lt": { field: "i_forward_per", op: "lt" },
  "per-gt": { field: "i_forward_per", op: "gt" },
  "trailing-per-lt": { field: "i_trailing_per", op: "lt" },
  "trailing-per-gt": { field: "i_trailing_per", op: "gt" },
  "pbr-lt": { field: "i_pbr", op: "lt" },
  "pbr-gt": { field: "i_pbr", op: "gt" },
  "psr-lt": { field: "i_forward_psr", op: "lt" },
  "psr-gt": { field: "i_forward_psr", op: "gt" },
  "roe-gt": { field: "i_forward_roe", op: "gt" },
  "roe-lt": { field: "i_forward_roe", op: "lt" },
  "roa-gt": { field: "i_forward_roa", op: "gt" },
  "roic-gt": { field: "i_roic", op: "gt" },
  "growth3y-gt": { field: "yoy3y_sales", op: "gt" },
  "op-growth3y-gt": { field: "yoy3y_op_profit", op: "gt" },
  "mcap-gt": { field: "market_capitalization", op: "gt" },
  "mcap-lt": { field: "market_capitalization", op: "lt" },
  "dy-gt": { field: "i_forward_dividend_yield", op: "gt" },
  "dy-lt": { field: "i_forward_dividend_yield", op: "lt" },
}

export function buildNumericConditions(
  flags: Record<string, number | undefined>,
  customMetric?: { field: string; gt?: number; lt?: number },
): NumericCondition[] {
  const out: NumericCondition[] = []
  for (const [flagName, cfg] of Object.entries(NUMERIC_FLAG_MAP)) {
    const v = flags[flagName]
    if (v !== undefined && Number.isFinite(v)) {
      out.push({ field: cfg.field, op: cfg.op, value: v })
    }
  }
  if (customMetric?.field) {
    if (customMetric.gt !== undefined && Number.isFinite(customMetric.gt)) {
      out.push({ field: customMetric.field, op: "gt", value: customMetric.gt })
    }
    if (customMetric.lt !== undefined && Number.isFinite(customMetric.lt)) {
      out.push({ field: customMetric.field, op: "lt", value: customMetric.lt })
    }
  }
  return out
}

export const NUMERIC_FLAG_NAMES = Object.keys(NUMERIC_FLAG_MAP)
