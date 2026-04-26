import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const description =
  "イシュー一覧を取得する。mine=true で自分のイシューのみ。status で open/closed 絞り込み可。"
const inputSchema = {
  type: "object",
  properties: {
    mine: {
      type: "boolean",
      description: "true の時、自分のイシューのみ返す",
    },
    status: {
      type: "string",
      enum: ["open", "closed"],
      description: "ステータスで絞り込み",
    },
    source: {
      type: "string",
      description: "ソース識別子で絞り込み",
    },
    updated_since: {
      type: "number",
      description: "Unix seconds 以降に更新されたイシューのみ返す",
    },
  },
  additionalProperties: false,
}

export const issuesListTool = {
  name: "tc_issues_list",
  description,
  inputSchema,
  config: {
    title: "List TickerCode Issues",
    description,
    inputSchema: {
      mine: z.boolean().optional().describe("true の時、自分のイシューのみ返す"),
      status: z.enum(["open", "closed"]).optional().describe("ステータスで絞り込み"),
      source: z.string().optional().describe("ソース識別子で絞り込み"),
      updated_since: z.number().optional().describe("Unix seconds 以降に更新されたイシューのみ返す"),
    },
  },
  async handler(input: {
    mine?: boolean
    status?: string
    source?: string
    updated_since?: number
  }) {
    const body: Record<string, unknown> = {}
    if (input.mine !== undefined) body.mine = input.mine
    if (input.status !== undefined) body.status = input.status
    if (input.source !== undefined) body.source = input.source
    if (input.updated_since !== undefined) body.updated_since = input.updated_since

    const url = `${getApiBase()}/issues/list`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { success: boolean; data: { items: unknown[] } }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(json.data?.items ?? [], null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
        isError: true,
      }
    }
  },
} as const
