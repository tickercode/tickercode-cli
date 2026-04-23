import { z } from "zod"
import { syncOverview, readOverviewMeta } from "../../memory/overview"

export const overviewSyncTool = {
  name: "overview_sync",
  config: {
    title: "Sync Overview Bulk Dump",
    description:
      "Download overview.json (3,753 Japanese listed stocks with narrative + segments) from R2 CDN and cache locally. Call this before keyword search if local cache is missing or stale (>24h). Returns cache metadata.",
    inputSchema: {
      force: z
        .boolean()
        .optional()
        .describe("Ignore 24h TTL and force re-fetch"),
    },
  },
  async handler({ force }: { force?: boolean }) {
    const meta = await syncOverview(Boolean(force))
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(meta, null, 2),
        },
      ],
    }
  },
} as const

export const overviewStatusTool = {
  name: "overview_status",
  config: {
    title: "Overview Cache Status",
    description:
      "Return metadata about the cached overview.json (last fetch time, item count, generated_at). Null if not cached yet.",
    inputSchema: {},
  },
  async handler() {
    const meta = readOverviewMeta()
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(meta, null, 2),
        },
      ],
    }
  },
} as const
