import { z } from "zod"
import { findPeers } from "../../analysis/peers"

export const findPeersTool = {
  name: "find_peers",
  config: {
    title: "Find Peer Stocks",
    description:
      "Find peer companies similar to a given ticker by sector + market cap band (default ±50%). Returns the target stock + peers (default 5) + sector median benchmarks (PER / ROE / margin / growth). Requires mini.json cache; auto-syncs if missing.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
      limit: z.number().int().min(1).max(30).optional().describe("Number of peers (default 5)"),
      by: z
        .enum(["sector", "mcap", "both", "growth"])
        .optional()
        .describe("Match criteria (default 'both')"),
      mcap_band: z
        .number()
        .min(0.1)
        .max(10)
        .optional()
        .describe("Market cap band ratio (e.g. 0.5 = ±50%). Default 0.5"),
    },
  },
  async handler({
    code,
    limit,
    by,
    mcap_band,
  }: {
    code: string
    limit?: number
    by?: "sector" | "mcap" | "both" | "growth"
    mcap_band?: number
  }) {
    const result = await findPeers(code, { limit, by, mcapBand: mcap_band })
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result, null, 2) },
      ],
    }
  },
} as const
