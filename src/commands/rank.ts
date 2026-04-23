import { defineCommand } from "citty"
import pc from "picocolors"
import { ensureMiniLoaded } from "../memory/mini"
import { screen, type ExactCondition } from "../lib/screen"
import { formatOutput, type Format } from "../lib/format"

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : undefined
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr))
}

export const rankCommand = defineCommand({
  meta: {
    name: "rank",
    description:
      "Rank stocks by a metric (top-N). Uses mini.json. By default descending; use --asc for ascending.",
  },
  args: {
    by: {
      type: "string",
      description: "Metric field to rank by (e.g. i_forward_per, yoy3y_sales)",
      required: true,
    },
    sector: { type: "string", description: "sector33_code filter" },
    "market-code": { type: "string", description: "market_code filter" },
    limit: {
      type: "string",
      description: "Top N rows (default: 10)",
      default: "10",
    },
    asc: {
      type: "boolean",
      description: "Ascending order (default: descending)",
    },
    "include-null": {
      type: "boolean",
      description: "Include null values (default: exclude)",
    },
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
    const field = String(args.by)

    const exact: ExactCondition[] = []
    if (args.sector) {
      exact.push({ field: "sector33_code", value: String(args.sector) })
    }
    if (args["market-code"]) {
      exact.push({ field: "market_code", value: String(args["market-code"]) })
    }

    const limit = parseNum(args.limit) ?? 10

    const result = screen(mini.items as Record<string, unknown>[], {
      exact,
      sort: { field, order: args.asc ? "asc" : "desc" },
      limit,
      includeNull: Boolean(args["include-null"]),
    })

    const format = String(args.format) as Format
    const columns = args.columns
      ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean)
      : dedupe([
          "display_code",
          "company_name",
          "sector33_code",
          field,
          "market_capitalization",
        ])

    if (result.length === 0 && format === "pretty") {
      process.stdout.write(pc.yellow("No matches.\n"))
      return
    }

    formatOutput(result, {
      kind: "stock-list",
      format,
      columns,
      title: `tc rank --by ${field}${args.asc ? " (asc)" : ""}`,
    })
  },
})
