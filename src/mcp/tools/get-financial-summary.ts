import { z } from "zod"
import { normalizeCode, displayCode } from "../../lib/code"
import { fetchStock } from "../../memory/fetch"
import { financialSummary } from "../../memory/summary"
import { endpointIsFresh } from "../../memory/meta"

export const getFinancialSummaryTool = {
  name: "get_financial_summary",
  config: {
    title: "Financial Summary (Latest + Prev Year + Forecast)",
    description:
      "Return a compact financial summary (~1KB) for a ticker: latest period PL figures (sales, operating profit, net income), YoY % change vs the same period last year, and the latest forecast. Much smaller than raw financial data. Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
    },
  },
  async handler({ code }: { code: string }) {
    const code5 = normalizeCode(code)
    const display = displayCode(code5)

    if (!endpointIsFresh(display, "financial")) {
      await fetchStock(code5, { endpoints: ["financial"] })
    }

    const summary = financialSummary(display)
    if (!summary) {
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
        { type: "text" as const, text: JSON.stringify(summary, null, 2) },
      ],
    }
  },
} as const
