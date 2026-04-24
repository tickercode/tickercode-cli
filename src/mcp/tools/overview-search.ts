import { z } from "zod"
import { ensureOverviewLoaded } from "../../memory/overview"
import { searchOverview } from "../../lib/overview-search"
import type {
  FiscalYearStatus,
  SegmentDataStatus,
} from "../../memory/overview"

export const overviewSearchTool = {
  name: "overview_search",
  config: {
    title: "Search Overview (theme keyword search)",
    description:
      "Keyword search across all 3,753 Japanese listed companies' narrative fields (company summary / industry analysis / strengths / weaknesses) and segment names. Backbone of the `tc research-idea` theme-discovery workflow (Step 2). Returns hits with matched_keywords + matched_fields. Auto-fetches overview.json if stale.",
    inputSchema: {
      keywords: z
        .array(z.string())
        .min(1)
        .describe(
          "Keywords to search for. Example: ['AI', '機械学習', 'LLM']. Each keyword is matched case-insensitively via substring.",
        ),
      matchMode: z
        .enum(["any", "all"])
        .optional()
        .describe(
          "'any' = OR (default, at least one keyword matches). 'all' = AND (every keyword must match somewhere).",
        ),
      includeIndustry: z
        .boolean()
        .optional()
        .describe("Search the industry narrative field too (default true)"),
      includeSegmentNames: z
        .boolean()
        .optional()
        .describe("Search segment names too (default true)"),
      fiscalStatusAllow: z
        .array(z.enum(["current", "stale_2y+", "missing"]))
        .optional()
        .describe(
          "Allowed fiscal_year_status values. Default: ['current'] (exclude stale_2y+ and missing). Pass the full list to include all.",
        ),
      segmentStatusAllow: z
        .array(z.enum(["complete", "partial", "unavailable"]))
        .optional()
        .describe(
          "Allowed segment_data_status values. Default: undefined = all. Restrict to 'complete' if you need segment numeric data downstream.",
        ),
      sectorCodes: z
        .array(z.string())
        .optional()
        .describe("sector33_code list to restrict to (e.g. ['5250', '3650'])"),
      requireAiAnalysis: z
        .boolean()
        .optional()
        .describe(
          "If true, only include stocks with AI-generated segment analysis/insights (non-null insights or at least one segment.analysis). Useful to bias toward richer context.",
        ),
      minRevenueYoy: z
        .number()
        .optional()
        .describe(
          "Filter by dominant segment revenue YoY growth rate (0-1 scale, 0.1 = 10% growth). Null or below threshold are excluded.",
        ),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max hits to return"),
    },
  },
  async handler(input: {
    keywords: string[]
    matchMode?: "any" | "all"
    includeIndustry?: boolean
    includeSegmentNames?: boolean
    fiscalStatusAllow?: FiscalYearStatus[]
    segmentStatusAllow?: SegmentDataStatus[]
    sectorCodes?: string[]
    requireAiAnalysis?: boolean
    minRevenueYoy?: number
    limit?: number
  }) {
    const overview = await ensureOverviewLoaded()
    const hits = searchOverview(overview.items, {
      keywords: input.keywords,
      matchMode: input.matchMode,
      includeIndustry: input.includeIndustry,
      includeSegmentNames: input.includeSegmentNames,
      fiscalStatusAllow: input.fiscalStatusAllow ?? ["current"],
      segmentStatusAllow: input.segmentStatusAllow,
      sectorCodes: input.sectorCodes,
      requireAiAnalysis: input.requireAiAnalysis,
      minRevenueYoy: input.minRevenueYoy,
      limit: input.limit,
    })

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              keywords: input.keywords,
              matchMode: input.matchMode ?? "any",
              count: hits.length,
              items: hits,
            },
            null,
            2,
          ),
        },
      ],
    }
  },
} as const
