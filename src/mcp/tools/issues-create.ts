import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"
import { formatTcId } from "../../lib/issues-client"

const description =
  "新しいイシューを作成する。title は必須。source / body / priority / labels / actor_id はオプション。作成後 TC-N 形式の ID を返す。"
const inputSchema = {
  type: "object",
  required: ["title"],
  properties: {
    title: {
      type: "string",
      description: "イシューのタイトル（必須）",
    },
    body: {
      type: "string",
      description: "イシューの本文",
    },
    source: {
      type: "string",
      description: "ソース識別子 (例: agent_cli)",
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "優先度",
    },
    labels: {
      type: "array",
      items: { type: "string" },
      description: "ラベルのリスト",
    },
    actor_id: {
      type: "string",
      description: "作成者の Actor ID",
    },
  },
  additionalProperties: false,
}

export const issuesCreateTool = {
  name: "tc_issues_create",
  description,
  inputSchema,
  config: {
    title: "Create TickerCode Issue",
    description,
    inputSchema: {
      title: z.string().describe("イシューのタイトル（必須）"),
      body: z.string().optional().describe("イシューの本文"),
      source: z.string().optional().describe("ソース識別子 (例: agent_cli)"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("優先度"),
      labels: z.array(z.string()).optional().describe("ラベルのリスト"),
      actor_id: z.string().optional().describe("作成者の Actor ID"),
    },
  },
  async handler(input: {
    title: string
    body?: string
    source?: string
    priority?: string
    labels?: string[]
    actor_id?: string
  }) {
    const payload: Record<string, unknown> = { title: input.title }
    if (input.body !== undefined) payload.body = input.body
    if (input.source !== undefined) payload.source = input.source
    if (input.priority !== undefined) payload.priority = input.priority
    if (input.labels !== undefined) payload.labels = input.labels
    if (input.actor_id !== undefined) payload.actor_id = input.actor_id

    const url = `${getApiBase()}/issues/create`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; data: { id: number } }
      const tcId = formatTcId(json.data.id)
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id: tcId }, null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
        isError: true,
      }
    }
  },
} as const
