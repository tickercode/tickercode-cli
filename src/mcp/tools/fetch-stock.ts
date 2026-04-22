import { z } from "zod"
import { fetchStock } from "../../memory/fetch"
import { endpointPath, ENDPOINTS, type EndpointName } from "../../memory/paths"

const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointName[]

export const fetchStockTool = {
  name: "fetch_stock",
  config: {
    title: "Fetch Stock Data into Memory",
    description:
      "Download multiple endpoints for a ticker into ~/.tickercode/memory/code/<code>/. Returns a compact summary with file paths instead of raw data, so context is preserved. Use this first, then read specific files via memory_path or get_*_summary tools.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
      endpoints: z
        .array(z.enum(["overview", "financial", "edinet", "disclosure", "news"]))
        .optional()
        .describe("Subset of endpoints to fetch (default: all)"),
      force: z
        .boolean()
        .optional()
        .describe("Ignore TTL and re-fetch"),
    },
  },
  async handler({
    code,
    endpoints,
    force,
  }: {
    code: string
    endpoints?: EndpointName[]
    force?: boolean
  }) {
    const result = await fetchStock(code, { endpoints, force })
    const files: Record<string, string> = {}
    const allEps = (endpoints ?? ENDPOINT_KEYS) as EndpointName[]
    for (const ep of allEps) {
      files[ep] = endpointPath(result.display_code, ep)
    }
    const payload = {
      code: result.code,
      display_code: result.display_code,
      dir: result.dir,
      fetched: result.fetched,
      skipped: result.skipped,
      failed: result.failed,
      files,
    }
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(payload, null, 2) },
      ],
    }
  },
} as const
