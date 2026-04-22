import { z } from "zod"
import { normalizeCode, displayCode } from "../../lib/code"

export const normalizeCodeTool = {
  name: "normalize_code",
  config: {
    title: "Normalize Ticker Code",
    description:
      "Convert a 4-digit Japanese ticker code (display form) to a 5-digit internal code (API form) and vice versa. 4-digit codes get '0' appended; 5-digit codes ending in '0' get the trailing '0' stripped for display.",
    inputSchema: {
      code: z.string().describe("4-digit or 5-digit ticker code"),
    },
  },
  async handler({ code }: { code: string }) {
    const code5 = normalizeCode(code)
    const code4 = displayCode(code5)
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ input: code, code5, code4 }, null, 2),
        },
      ],
    }
  },
} as const
