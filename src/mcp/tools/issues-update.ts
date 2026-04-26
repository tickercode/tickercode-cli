import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const description =
  "イシューのフィールドを更新する。id は必須。title / status / priority / labels をパッチで変更できる。"
const inputSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "イシューの数値 ID",
    },
    title: {
      type: "string",
      description: "新しいタイトル",
    },
    status: {
      type: "string",
      enum: ["open", "closed"],
      description: "新しいステータス",
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "新しい優先度",
    },
    labels: {
      type: "array",
      items: { type: "string" },
      description: "新しいラベルリスト（上書き）",
    },
  },
  additionalProperties: false,
}

export const issuesUpdateTool = {
  name: "tc_issues_update",
  description,
  inputSchema,
  config: {
    title: "Update TickerCode Issue",
    description,
    inputSchema: {
      id: z.number().describe("イシューの数値 ID"),
      title: z.string().optional().describe("新しいタイトル"),
      status: z.enum(["open", "closed"]).optional().describe("新しいステータス"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("新しい優先度"),
      labels: z.array(z.string()).optional().describe("新しいラベルリスト（上書き）"),
    },
  },
  async handler(input: {
    id: number
    title?: string
    status?: string
    priority?: string
    labels?: string[]
  }) {
    const { id, ...patch } = input
    const url = `${getApiBase()}/issues/update`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id, ...patch }),
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
