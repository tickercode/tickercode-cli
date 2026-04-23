import { defineCommand } from "citty"
import pc from "picocolors"
import { ensureMiniLoaded } from "../memory/mini"
import {
  buildNumericConditions,
  screen,
  type ExactCondition,
  type SortSpec,
} from "../lib/screen"
import { formatOutput, type Format } from "../lib/format"

const DEFAULT_COLUMNS = [
  "display_code",
  "company_name",
  "sector33_code",
  "market_capitalization",
  "i_forward_per",
  "i_pbr",
  "i_forward_roe",
  "yoy3y_sales",
]

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : undefined
}

export const screenCommand = defineCommand({
  meta: {
    name: "screen",
    description:
      "Filter the full stock universe (mini.json) by multiple criteria. All flags are AND-combined.",
  },
  args: {
    sector: { type: "string", description: "sector33_code (e.g. 5250)" },
    "market-code": { type: "string", description: "market_code (e.g. 0111 Prime)" },
    "per-lt": { type: "string", description: "forward PER <" },
    "per-gt": { type: "string", description: "forward PER >" },
    "trailing-per-lt": { type: "string", description: "trailing PER <" },
    "trailing-per-gt": { type: "string", description: "trailing PER >" },
    "pbr-lt": { type: "string", description: "PBR <" },
    "pbr-gt": { type: "string", description: "PBR >" },
    "psr-lt": { type: "string", description: "forward PSR <" },
    "psr-gt": { type: "string", description: "forward PSR >" },
    "roe-gt": { type: "string", description: "forward ROE % >" },
    "roe-lt": { type: "string", description: "forward ROE % <" },
    "roa-gt": { type: "string", description: "forward ROA % >" },
    "roic-gt": { type: "string", description: "ROIC % >" },
    "growth3y-gt": { type: "string", description: "3y sales CAGR % >" },
    "op-growth3y-gt": {
      type: "string",
      description: "3y operating profit CAGR % >",
    },
    "mcap-gt": { type: "string", description: "market cap (yen) >" },
    "mcap-lt": { type: "string", description: "market cap (yen) <" },
    "dy-gt": { type: "string", description: "forward dividend yield % >" },
    "dy-lt": { type: "string", description: "forward dividend yield % <" },
    metric: {
      type: "string",
      description: "Custom field name for --gt / --lt",
    },
    gt: { type: "string", description: "Used with --metric: field > value" },
    lt: { type: "string", description: "Used with --metric: field < value" },
    "include-null": {
      type: "boolean",
      description: "Include rows where numeric field is null (default: exclude)",
    },
    sort: { type: "string", description: "Sort by field name" },
    asc: { type: "boolean", description: "Sort ascending (default: desc)" },
    limit: {
      type: "string",
      description: "Max rows to output (default: no limit)",
    },
    offset: { type: "string", description: "Skip first N rows" },
    columns: {
      type: "string",
      description: "Comma-separated column names (pretty / md only)",
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f",
    },
  },
  async run({ args }) {
    const mini = await ensureMiniLoaded()

    const numericFlags: Record<string, number | undefined> = {
      "per-lt": parseNum(args["per-lt"]),
      "per-gt": parseNum(args["per-gt"]),
      "trailing-per-lt": parseNum(args["trailing-per-lt"]),
      "trailing-per-gt": parseNum(args["trailing-per-gt"]),
      "pbr-lt": parseNum(args["pbr-lt"]),
      "pbr-gt": parseNum(args["pbr-gt"]),
      "psr-lt": parseNum(args["psr-lt"]),
      "psr-gt": parseNum(args["psr-gt"]),
      "roe-gt": parseNum(args["roe-gt"]),
      "roe-lt": parseNum(args["roe-lt"]),
      "roa-gt": parseNum(args["roa-gt"]),
      "roic-gt": parseNum(args["roic-gt"]),
      "growth3y-gt": parseNum(args["growth3y-gt"]),
      "op-growth3y-gt": parseNum(args["op-growth3y-gt"]),
      "mcap-gt": parseNum(args["mcap-gt"]),
      "mcap-lt": parseNum(args["mcap-lt"]),
      "dy-gt": parseNum(args["dy-gt"]),
      "dy-lt": parseNum(args["dy-lt"]),
    }

    const customMetric = args.metric
      ? {
          field: String(args.metric),
          gt: parseNum(args.gt),
          lt: parseNum(args.lt),
        }
      : undefined

    const exact: ExactCondition[] = []
    if (args.sector) {
      exact.push({ field: "sector33_code", value: String(args.sector) })
    }
    if (args["market-code"]) {
      exact.push({ field: "market_code", value: String(args["market-code"]) })
    }

    const numeric = buildNumericConditions(numericFlags, customMetric)

    const sort: SortSpec | undefined = args.sort
      ? { field: String(args.sort), order: args.asc ? "asc" : "desc" }
      : undefined

    const result = screen(mini.items as Record<string, unknown>[], {
      exact,
      numeric,
      sort,
      limit: parseNum(args.limit),
      offset: parseNum(args.offset),
      includeNull: Boolean(args["include-null"]),
    })

    const format = String(args.format) as Format
    const columns = args.columns
      ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean)
      : defaultColumns(sort)

    if (result.length === 0 && format === "pretty") {
      process.stdout.write(pc.yellow("No matches.\n"))
      return
    }

    formatOutput(result, {
      kind: "stock-list",
      format,
      columns,
      title: "tc screen",
    })
  },
})

function defaultColumns(sort?: SortSpec): string[] {
  if (sort && !DEFAULT_COLUMNS.includes(sort.field)) {
    return [...DEFAULT_COLUMNS, sort.field]
  }
  return DEFAULT_COLUMNS
}
