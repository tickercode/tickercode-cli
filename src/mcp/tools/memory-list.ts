import { listCodes, showMeta } from "../../memory/query"

export const memoryListTool = {
  name: "memory_list",
  config: {
    title: "List Cached Stocks in Memory",
    description:
      "Return an array of ticker codes currently cached in ~/.tickercode/memory/, with their company name and available endpoints.",
    inputSchema: {},
  },
  async handler() {
    const codes = listCodes()
    const items = codes.map((code) => {
      const meta = showMeta(code)
      return {
        code,
        name: meta?.name ?? null,
        endpoints: Object.keys(meta?.endpoints ?? {}),
        updated_at: meta?.updated_at ?? null,
      }
    })
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: items.length, items }, null, 2),
        },
      ],
    }
  },
} as const
