import { z } from "zod"
import { normalizeCode, displayCode } from "../../lib/code"
import { fetchStock } from "../../memory/fetch"
import { financialTrend } from "../../memory/summary"
import { endpointIsFresh } from "../../memory/meta"

export const getFinancialTrendTool = {
  name: "get_financial_trend",
  config: {
    title: "Financial Trend (Time Series of a Metric)",
    description:
      "Return a time series of a single financial metric (e.g. 'pl_net_sales', 'pl_operating_profit_loss') across recent periods, with YoY % and CAGR. Very compact (~500B). Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
      metric: z
        .string()
        .describe(
          "Field name from financial.json, e.g. 'pl_net_sales', 'pl_operating_profit_loss', 'pl_net_income_loss'",
        ),
      periods: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Number of recent periods (default 5)"),
      period_type: z
        .enum(["FY", "1Q", "2Q", "3Q", "4Q"])
        .optional()
        .describe(
          "Filter by period type (FY=annual, 1Q/2Q/3Q/4Q=quarterly). Default: all types mixed.",
        ),
    },
  },
  async handler({
    code,
    metric,
    periods = 5,
    period_type,
  }: {
    code: string
    metric: string
    periods?: number
    period_type?: string
  }) {
    const code5 = normalizeCode(code)
    const display = displayCode(code5)

    if (!endpointIsFresh(display, "financial")) {
      await fetchStock(code5, { endpoints: ["financial"] })
    }

    const trend = financialTrend(display, metric, periods, period_type)
    if (!trend) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: `No financial data available for ${display}` }),
          },
        ],
        isError: true,
      }
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(trend, null, 2) },
      ],
    }
  },
} as const
