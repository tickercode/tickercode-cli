import { z } from "zod"
import { projectPL } from "../../analysis/project"

export const projectPLTool = {
  name: "project_pl",
  config: {
    title: "Project P&L Forward",
    description:
      "Project sales / operating profit / net income / EPS / theoretical stock price for N future years based on historical growth. Pattern selects the growth source: 3y-cagr (default), 5y-cagr, forecast-yoy (use management forecast implied growth), or custom. Returns per-year projection + sensitivity table (growth ±5%). PER default is FORWARD PER (i_forward_per), falling back to trailing (i_trailing_per) when forecast is unavailable — this matches forward-looking EPS projection. assumptions.per_kind shows which was applied; both values are also returned. Auto-fetches financial data + mini.json if missing.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
      years: z.number().int().min(1).max(20).optional().describe("Projection horizon (default 5)"),
      pattern: z
        .enum(["3y-cagr", "5y-cagr", "forecast-yoy", "custom"])
        .optional()
        .describe("Growth source (default '3y-cagr')"),
      custom_growth: z
        .number()
        .optional()
        .describe("Custom growth rate in % (only when pattern='custom')"),
      op_margin_override: z.number().optional(),
      net_margin_override: z.number().optional(),
      per_override: z.number().optional(),
    },
  },
  async handler({
    code,
    years,
    pattern,
    custom_growth,
    op_margin_override,
    net_margin_override,
    per_override,
  }: {
    code: string
    years?: number
    pattern?: "3y-cagr" | "5y-cagr" | "forecast-yoy" | "custom"
    custom_growth?: number
    op_margin_override?: number
    net_margin_override?: number
    per_override?: number
  }) {
    const result = await projectPL(code, {
      years,
      pattern,
      customGrowth: custom_growth,
      opMarginOverride: op_margin_override,
      netMarginOverride: net_margin_override,
      perOverride: per_override,
    })
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result, null, 2) },
      ],
    }
  },
} as const
