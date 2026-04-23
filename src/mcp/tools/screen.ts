import { z } from "zod"
import { ensureMiniLoaded } from "../../memory/mini"
import {
  screen,
  type ExactCondition,
  type NumericCondition,
  type NumericOp,
  type SortSpec,
} from "../../lib/screen"

const numericOpSchema = z.enum(["gt", "lt", "gte", "lte", "eq"])

const numericConditionSchema = z.object({
  field: z.string(),
  op: numericOpSchema,
  value: z.number(),
})

const exactConditionSchema = z.object({
  field: z.string(),
  value: z.string(),
})

const sortSchema = z.object({
  field: z.string(),
  order: z.enum(["asc", "desc"]),
})

export const screenTool = {
  name: "screen",
  config: {
    title: "Screen Stocks",
    description:
      "Filter the full Japanese stock universe (3,750+ listed companies from mini.json) by multiple criteria (AND). Returns matching stocks with their metrics. Use for theme-based candidate extraction. Numeric fields: i_forward_per / i_pbr / i_forward_roe / yoy3y_sales / market_capitalization etc. Null/NaN values are excluded by default. Auto-fetches mini.json if stale.",
    inputSchema: {
      numeric: z
        .array(numericConditionSchema)
        .optional()
        .describe(
          "Numeric conditions (AND). Example: [{field: 'i_forward_per', op: 'lt', value: 20}]",
        ),
      exact: z
        .array(exactConditionSchema)
        .optional()
        .describe(
          "Exact-match conditions (AND). Example: [{field: 'sector33_code', value: '5250'}]",
        ),
      sort: sortSchema.optional().describe("Sort spec"),
      limit: z.number().int().positive().optional().describe("Max rows"),
      offset: z.number().int().nonnegative().optional().describe("Skip first N rows"),
      includeNull: z
        .boolean()
        .optional()
        .describe("Include rows where numeric field is null (default: false)"),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          "Columns to return per row (default: all fields). Use to keep the payload small.",
        ),
    },
  },
  async handler({
    numeric,
    exact,
    sort,
    limit,
    offset,
    includeNull,
    columns,
  }: {
    numeric?: NumericCondition[]
    exact?: ExactCondition[]
    sort?: SortSpec
    limit?: number
    offset?: number
    includeNull?: boolean
    columns?: string[]
  }) {
    const mini = await ensureMiniLoaded()
    const result = screen(mini.items as Record<string, unknown>[], {
      numeric,
      exact,
      sort,
      limit,
      offset,
      includeNull,
    })

    const payload = columns && columns.length > 0
      ? result.map((item) => {
          const picked: Record<string, unknown> = {}
          for (const c of columns) picked[c] = item[c]
          return picked
        })
      : result

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { count: payload.length, items: payload },
            null,
            2,
          ),
        },
      ],
    }
  },
} as const

// lightweight flag shims to silence "unused" in certain tsconfigs
export type { NumericOp }
