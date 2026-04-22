import { z } from "zod"
import { calculateMoat } from "../../analysis/moat"

export const calculateMoatTool = {
  name: "calculate_moat",
  config: {
    title: "Calculate Economic Moat Score",
    description:
      "Quantify economic moat on a 1-5 scale. Components: operating margin stability, gross margin stability, ROE stability (pricing power proxies), and capital-efficient growth (ROE × sales CAGR). Higher score = longer, more durable competitive advantage. Auto-fetches financial data if missing.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
    },
  },
  async handler({ code }: { code: string }) {
    const result = await calculateMoat(code)
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result, null, 2) },
      ],
    }
  },
} as const
