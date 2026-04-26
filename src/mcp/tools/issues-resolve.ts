import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const description =
  "イシューをクローズ（resolved）にする。id を指定するだけで完了。"
const inputSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "イシューの数値 ID",
    },
  },
  additionalProperties: false,
}

export const issuesResolveTool = {
  name: "tc_issues_resolve",
  description,
  inputSchema,
  config: {
    title: "Resolve TickerCode Issue",
    description,
    inputSchema: {
      id: z.number().describe("イシューの数値 ID"),
    },
  },
  async handler(input: { id: number }) {
    const url = `${getApiBase()}/issues/resolve`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: input.id }),
      })
      const json = (await res.json()) as { success: boolean }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: json.success }, null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
        isError: true,
      }
    }
  },
} as const
