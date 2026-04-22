import { z } from "zod"
import { normalizeCode, displayCode } from "../../lib/code"
import { fetchStock } from "../../memory/fetch"
import { stockSummary, readOverview } from "../../memory/summary"
import { endpointIsFresh } from "../../memory/meta"

export const getStockTool = {
  name: "get_stock",
  config: {
    title: "Get Stock Overview",
    description:
      "Fetch overview of a Japanese listed stock by 4-digit or 5-digit ticker code (e.g. '7203' = Toyota). Returns price, PER, PBR, dividend yield, market cap, sector. By default returns a compact summary (~1KB). Pass full=true to return the entire overview. Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: z
        .string()
        .describe("4-digit or 5-digit ticker code (e.g. '7203' or '72030')"),
      full: z
        .boolean()
        .optional()
        .describe("Return full overview.json instead of compact summary"),
    },
  },
  async handler({ code, full }: { code: string; full?: boolean }) {
    const code5 = normalizeCode(code)
    const display = displayCode(code5)

    if (!endpointIsFresh(display, "overview")) {
      await fetchStock(code5, { endpoints: ["overview"] })
    }

    const data = full ? readOverview(display) : stockSummary(display)
    if (!data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: `No overview data for ${display}` }),
          },
        ],
        isError: true,
      }
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    }
  },
} as const
