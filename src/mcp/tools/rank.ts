import { z } from "zod"
import { ensureMiniLoaded } from "../../memory/mini"
import { screen, type ExactCondition } from "../../lib/screen"

export const rankTool = {
  name: "rank",
  config: {
    title: "Rank Stocks (top-N)",
    description:
      "Return top-N stocks ranked by a metric. Specialized form of `screen` with sort + limit. Defaults to descending order. Useful for finding 'largest by market cap in sector X' or 'cheapest forward PER in sector Y'.",
    inputSchema: {
      by: z
        .string()
        .describe(
          "Metric field to rank by (e.g. 'i_forward_per', 'yoy3y_sales', 'market_capitalization')",
        ),
      exact: z
        .array(
          z.object({
            field: z.string(),
            value: z.string(),
          }),
        )
        .optional()
        .describe(
          "Exact-match filters. Example: [{field: 'sector33_code', value: '5250'}]",
        ),
      limit: z.number().int().positive().optional().describe("Top N (default 10)"),
      order: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort order (default desc)"),
      includeNull: z.boolean().optional().describe("Include null values (default false)"),
      columns: z
        .array(z.string())
        .optional()
        .describe("Columns to return (default keeps all)"),
    },
  },
  async handler({
    by,
    exact,
    limit,
    order,
    includeNull,
    columns,
  }: {
    by: string
    exact?: ExactCondition[]
    limit?: number
    order?: "asc" | "desc"
    includeNull?: boolean
    columns?: string[]
  }) {
    const mini = await ensureMiniLoaded()
    const result = screen(mini.items as Record<string, unknown>[], {
      exact,
      sort: { field: by, order: order ?? "desc" },
      limit: limit ?? 10,
      includeNull,
    })

    const payload = columns && columns.length > 0
      ? result.map((item) => {
          const picked: Record<string, unknown> = {}
          for (const c of columns) picked[c] = item[c]
          return picked
        })
      : result.map((item) => ({
          display_code: item.display_code,
          company_name: item.company_name,
          sector33_code: item.sector33_code,
          [by]: item[by],
          market_capitalization: item.market_capitalization,
        }))

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { by, order: order ?? "desc", count: payload.length, items: payload },
            null,
            2,
          ),
        },
      ],
    }
  },
} as const
