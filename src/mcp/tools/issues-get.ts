import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const description =
  "TC-N 形式の ID でイシューの詳細とメッセージスレッドを取得する。"
const inputSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "イシューの数値 ID（TC-N の N 部分）",
    },
  },
  additionalProperties: false,
}

export const issuesGetTool = {
  name: "tc_issues_get",
  description,
  inputSchema,
  config: {
    title: "Get TickerCode Issue",
    description,
    inputSchema: {
      id: z.number().describe("イシューの数値 ID（TC-N の N 部分）"),
    },
  },
  async handler(input: { id: number }) {
    const url = `${getApiBase()}/issues/get`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: input.id }),
      })
      const json = (await res.json()) as { success: boolean; data: unknown }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
        isError: true,
      }
    }
  },
} as const
